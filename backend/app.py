import base64, certifi, json
import datetime

import bcrypt
import jwt
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import gridfs

from detect_nails import detect_and_annotate
from predict_hb import predict_hb

from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer
from thefuzz import process

import torch
torch.backends.mps.is_available()

app = Flask(__name__)
CORS(app, origins=["http://localhost:8080"])

uri = 'mongodb+srv://inkenmbrandt:iebzOoBZToz6gUa0@cluster0.6qqpb8u.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
client = MongoClient(uri, tlsCAFile=certifi.where())
db = client["onlynails"]
fs = gridfs.GridFS(db, collection="pictures")

# Key zur Generierung vom Login-Token -- nicht ändern!
SECRET_KEY = "iulhsidf798sfd**1823912enkasdasiudhfaoisdfjasd"

APP_KNOWLEDGE_BASE = {
    # --- Bedienung der Analyse ---
    "Wie starte ich eine Analyse?":
        "Um eine Analyse zu starten, gehen Sie zur 'Analyse'-Seite. Klicken Sie auf 'Kamera öffnen', machen Sie ein scharfes, gut beleuchtetes Foto von Ihrem Fingernagel und klicken Sie anschließend auf 'Analysieren'.",
    "Wie funktioniert die Erkennung der Fingernägel?":
        "Die App nutzt ein YOLOv8-Modell, das darauf trainiert wurde, Fingernägel in einem Bild zu erkennen und deren Position mit Boxen zu markieren.",
    "Wie wird der Hämoglobinwert geschätzt?":
        "Nachdem die Fingernägel erkannt wurden, analysiert ein weiteres KI-Modell (ein Random-Forest-Regressor) die durchschnittliche Farbe (RGB-Werte) innerhalb der erkannten Boxen, um daraus den Hämoglobinwert zu schätzen.",
    "Wo sehe ich meine früheren Ergebnisse?":
        "Ihre vergangenen Hämoglobinwerte werden in einem Verlaufsdiagramm auf der 'Analyse'-Seite unterhalb der aktuellen Ergebnisse angezeigt.",

    # --- Bedienung der anderen App-Bereiche ---
    "Wofür ist die 'Daily Stuff' Seite?":
        "Auf der 'Daily Stuff'-Seite können Sie täglich Ihre Stimmung, Symptome (wie Müdigkeit), Menstruationsstärke und sportliche Aktivitäten eintragen. Dies hilft Ihnen und potenziell Ihrem Arzt, Zusammenhänge mit Ihren Blutwerten zu erkennen.",
    "Wo kann ich meine persönlichen Daten wie Name oder Geburtstag ändern?":
        "Ihre persönlichen Daten können Sie auf der 'Profil'-Seite verwalten und speichern.",

    # --- Fragen zu Daten und Sicherheit ---
    "Sind meine Daten sicher?":
        "Ja, Ihre Daten sind sicher. Die Verbindung zu unserer Datenbank ist verschlüsselt. Ihr Passwort wird mit dem sicheren bcrypt-Algorithmus gehasht, sodass wir es selbst nicht einsehen können. Die Kommunikation mit der App wird durch Login-Tokens (JWT) geschützt.",
    "Wozu brauche ich einen Account?":
        "Ein Account ist notwendig, um Ihre Ergebnisse und täglichen Einträge sicher zu speichern und Ihnen persönlich zuzuordnen. So können Sie Ihren Verlauf über die Zeit verfolgen.",

    # --- Allgemeine Fragen zur App ---
    "Was ist der Zweck dieser App?":
        "Diese App dient der einfachen und schnellen Früherkennung von Anämie durch die Analyse der Farbe Ihrer Fingernägel. Sie ist kein Ersatz für eine ärztliche Diagnose, kann aber einen wichtigen ersten Hinweis geben.",
    "Ist das Ergebnis der App eine medizinische Diagnose?":
        "Nein, auf keinen Fall! Das Ergebnis ist eine Schätzung und dient nur als erster Anhaltspunkt. Eine verlässliche Diagnose kann nur ein Arzt nach einer Blutanalyse stellen. Bitte suchen Sie bei gesundheitlichen Bedenken immer einen Arzt auf."
}

print("Lade Chatbot-Modell (microsoft/Phi-3-mini-4k-instruct)...")
try:
    '''chatbot_pipeline = pipeline(
        "text-generation",
        model="microsoft/Phi-3-mini-4k-instruct",
        model_kwargs={"torch_dtype": "auto"},
        device="cpu",
        trust_remote_code=True
    )'''
    ## --- device_map "mps" für Apple Silicion Chips, "cpu" für Berechnung über die CPU allg. ---
    model = AutoModelForCausalLM.from_pretrained("microsoft/Phi-3-mini-4k-instruct", device_map="mps")
    tokenizer = AutoTokenizer.from_pretrained("microsoft/Phi-3-mini-4k-instruct")
    chatbot_pipeline = pipeline(
        "text-generation",
        model=model,
        tokenizer=tokenizer
    )
    print("✅ Chatbot-Modell erfolgreich geladen.")
except Exception as e:
    print(f"Fehler beim Laden des Chatbot-Modells: {e}")
    chatbot_pipeline = None

@app.route('/chatbot', methods=['POST'])
def get_chatbot_answer():
    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":
        data = request.get_json()
        question = data.get('question')

        best_match, score = process.extractOne(question, APP_KNOWLEDGE_BASE.keys())

        if score > 90:
            print(f"Antworte aus APP_KNOWLEDGE_BASE (Frage: '{question}', Match: '{best_match}', Score: {score})")
            return APP_KNOWLEDGE_BASE[best_match]

        elif chatbot_pipeline:
            print(f"Frage '{question}' wird an das KI-Modell (Phi-3) weitergeleitet.")
            prompt = (
                    "Du bist ein hilfreicher medizinischer Assistent. "
                    "Antworte kurz und präzise auf Deutsch.\n"
                    "User: " + question
            )
            response = chatbot_pipeline(prompt, max_new_tokens=250, do_sample=True, temperature=0.7)
            answer = response
            answer = response[0]["generated_text"][-1]['content']
            return answer
        else:
            return "Der KI-Assistent ist zurzeit nicht verfügbar. Bitte versuchen Sie es später erneut."
    else:
        return jsonify({"error": token_response}), 401

def check_token(auth_header):
    try:
        token = auth_header.split(" ")[1]
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return "success"
    except jwt.ExpiredSignatureError:
        return "Token abgelaufen"
    except jwt.InvalidTokenError:
        return "Token ungültig"

@app.route('/userdata', methods=['GET'])
def get_userdata():
    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":
        collection = db["userdata"]
        user_id = request.args.get("uid")
        user_dok = collection.find_one({"uid": user_id})
        if user_dok:
            user_dok["_id"] = str(user_dok["_id"])
            return jsonify(user_dok), 200
        else:
            collection.insert_one({"uid": user_id})
            return jsonify({"uid": user_id}), 201
    else:
        return jsonify({"error": token_response}), 401

@app.route('/userdata', methods=['POST'])
def update_userdata():
    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":
        collection = db["userdata"]
        if not request.is_json:
            return jsonify({"error": "Missing JSON body"}), 400
        data = request.get_json()
        user_id = data.get("uid")
        try:
            collection.update_one(
                {"uid": user_id},
                {"$set": {
                    "name": data.get("name"),
                    "birthday": data.get("birthday"),
                    "gender": data.get("gender"),
                    "vorerkrankung": data.get("vorerkrankung"),
                    "medikamente": data.get("medikamente")
                }}
            )
            return jsonify({"success": True}), 200
        except Exception as e:
            return jsonify({'success': False, 'error': e}), 401
    else:
        return jsonify({"error": token_response}), 401

@app.route('/login', methods=['POST'])
def login():
    collection = db["onlynails"]
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 415

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    try:
        user_dok = collection.find_one({"username": username})
        if user_dok and bcrypt.checkpw(password.encode(), user_dok["password"].encode('utf-8')):
            payload = {
                'username': username,
                'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            }
            token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
            user_id = str(user_dok['_id'])
            return jsonify({'success': True, 'id': user_id, 'token': token}), 200
        else:
            return jsonify({'success': False}), 401
    except Exception as e:
        return jsonify({'success': False, 'error': e}), 401

@app.route('/register', methods=['POST'])
def register():
    collection = db["onlynails"]
    if not request.is_json:
        return jsonify({"error": "Missing JSON in request"}), 415

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    existing_user = collection.find_one({"username": username})
    if not existing_user:
        try:
            hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            user_dok = {
                "username": username,
                "password": hashed_pw
            }
            new_user = collection.insert_one(user_dok)
            return jsonify({'success': True, 'id': str(new_user.inserted_id)}), 200
        except Exception as e:
            return jsonify({'success': False, 'error': e}), 401
    else:
        return jsonify({'success': False}), 401

@app.route("/nails/detect", methods=["POST"])
def route_detect_nails():
    """
    Multipart POST (image)
    → YOLO erkennt Fingernägel, gibt Box-Koordinaten & Preview zurück.
    """
    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":
        if "file" not in request.files:
            return jsonify({"error": 'Field "file" missing'}), 400

        img_bytes = request.files["file"].read()

        # Upload des Bildes in DB für Training
        fs.put(img_bytes)

        boxes, jpg_bytes, _ = detect_and_annotate(img_bytes)
        b64 = base64.b64encode(jpg_bytes).decode("ascii")

        return jsonify({
            "bboxes": boxes,                                    # [{id,x1,y1,x2,y2,score}, …]
            "annotated": f"data:image/jpeg;base64,{b64}"
        }), 200
    else:
        print("Token Validieurng fehlgeschlagen")
        return jsonify({"error": token_response}), 401

@app.route("/hb/predict", methods=["POST"])
def route_predict_hb():
    """
    Multipart POST (image)
    → Hb-Schätzung unter Einbeziehung *aller* erkannten Boxen.
    """
    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":

        if "file" not in request.files:
            return jsonify({"error": 'Field "file" missing'}), 400
        elif "uid" not in request.form:
            return jsonify({"error": 'Field "uid" missing'}), 400
        elif "date" not in request.form:
            return jsonify({"error": 'Field "date" missing'}), 400

        try:
            hb_val = predict_hb(request.files["file"].read())
            hb = round(hb_val, 1)

            safe_hb_in_db(hb, request.form.get("uid"), request.form.get("date"))
            return jsonify({"hb": hb}), 200

        except Exception as e:
            return jsonify({"error": str(e)}), 500

    else:
        return jsonify({"error": token_response}), 401

def safe_hb_in_db(hb, uid, date):
    db["hb_values"].insert_one({
        "uid": uid,
        "date": date,
        "hb": hb,
    })

@app.route("/hb/predict-custom", methods=["POST"])
def predict_hb_custom():
    """
    Multipart POST
      image      : JPEG
      keep_ids   : JSON-Liste (optional) → nur diese Box-IDs verwenden
    """
    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":

        if "file" not in request.files:
            return jsonify({"error": 'Field "file" missing'}), 400
        elif "uid" not in request.form:
            return jsonify({"error": 'Field "uid" missing'}), 400
        elif "date" not in request.form:
            return jsonify({"error": 'Field "date" missing'}), 400

        if "keep_ids" in request.form:
            keep_ids = json.loads(request.form["keep_ids"])
            keep_ids = [int(x) for x in keep_ids]
            try:
                hb_val = predict_hb(request.files["file"].read(), keep_ids=keep_ids)
                hb = round(hb_val, 1)
                safe_hb_in_db(hb, request.form.get("uid"), request.form.get("date"))
                return jsonify({"hb": hb}), 200

            except Exception as e:
                return jsonify({"error": str(e)}), 500
        else:
            return jsonify({"error": 'Field "keep_ids" missing'}), 400

    else:
        return jsonify({"error": token_response}), 401

@app.route("/daily", methods=["POST"])
def post_daily():
    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":

        if not request.is_json:
            return jsonify({"error": "Missing JSON body"}), 400

        data = request.get_json()
        db["daily"].insert_one({
            "uid": data.get("uid"),
            "mood": data.get("mood"),
            "symptoms": data.get("symptoms"),
            "period": data.get("period"),
            "sport": {
                "type": data.get("sport").get("type"),
                "intensity": data.get("sport").get("intensity"),
                "duration": data.get("sport").get("duration"),
                "comment": data.get("sport").get("comment"),
            },
            "date": data.get("date"),
        })
        return jsonify({"success": True}), 200
    else:
        return jsonify({"error": token_response}), 401

@app.route("/hb", methods=["GET"])
def get_hb():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({"error": "Parameter 'uid' fehlt"}), 400

    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":

        cursor = db["hb_values"].find({"uid": uid})
        matching_values = list(cursor)

        if not matching_values:
            return jsonify({"error": "No values found"}), 404

        data = [{"date": doc["date"], "value": doc["hb"]} for doc in matching_values]
        print(f"Return data {data}")

        return jsonify(data), 200
    else:
        return jsonify({"error": token_response}), 401

@app.route("/last-hb", methods=["GET"])
def get_last_hb():
    uid = request.args.get('uid')
    if not uid:
        return jsonify({"error": "Parameter 'uid' fehlt"}), 400

    token_response = check_token(request.headers.get('Authorization'))
    if token_response == "success":
        cursor = db["hb_values"].find({"uid": uid})
        matching_values = list(cursor)

        for doc in matching_values:
            doc["parsed_date"] = datetime.datetime.strptime(doc["date"], "%d.%m.%Y")

        max_date = max(doc["parsed_date"] for doc in matching_values)

        latest_docs = [doc for doc in matching_values if doc["parsed_date"] == max_date]
        latest_doc = latest_docs[0]
        data = {"date": latest_doc["date"], "value": latest_doc["hb"]}

        return jsonify(data), 200
    else:
        return jsonify({"error": token_response}), 401

if __name__ == '__main__':
    app.run(debug=True)