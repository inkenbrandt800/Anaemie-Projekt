let BACKEND_URL = ""
fetch('./config.json')
    .then(res => res.json())
    .then(config => {
        BACKEND_URL = config.BACKEND_URL
    });

// Array mit Anämie-relevanten Erkrankungen
const anemiaRelatedDiseases = [
    "systemischer lupus erythematodes",
    "rheumatoide arthritis",
    "rheuma",
    "autoimmunhämolytische anämie",
    "leukämie",
    "lymphome",
    "aplastische anämie",
    "myelodysplastisches syndrom",
    "sichelzellanämie",
    "thalassämie",
    "sphärozytose",
    "niereninsuffizienz",
    "lebererkrankungen",
    "chronische entzündungen",
    "hiv",
    "aids",
    "vitamin b12-mangel",
    "perniziöse anämie",
    "folsäuremangel",
    "zöliakie",
    "morbus crohn",
    "colitis ulcerosa",
    "magengeschwüre"
];

// Array mit Anämie-relevanten Medikamenten
const anemiaRelatedMedications = [
    "ibuprofen",
    "diclofenac",
    "aspirin",
    "penicillin",
    "cephalosporin",
    "sulfonamid",
    "platinverbindung",
    "methotrexat",
    "cyclophosphamid",
    "azathioprin",
    "mycophenolat",
    "phenytoin",
    "carbamazepin",
    "protonenpumpenhemmer",
    "ace-hemmer",
    "thiazid",
    "colchicin",
    "methyldopa"
];

export function prefillData(){
    if(sessionStorage.getItem("picture") !== null){
        if(sessionStorage.getItem("hb") !== null){
            let canvas = document.getElementById("canvas")
            let ctx = canvas.getContext("2d");
            let img = new Image()
            img.onload = function () {
                canvas.width = img.width
                canvas.height = img.height
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = sessionStorage.getItem("picture")
            canvas.style.display = "block"
            document.getElementById("takePhoto").style.display = "none"
            document.getElementById("takePhotoAgain").style.display = "block"
            document.getElementById("video").style.display = "none"
            document.getElementById("confirmBoxes").style.display = "none"
            document.getElementById("selectBoxes").style.display = "none"
            document.getElementById("openCam").style.display = "none"
            document.getElementById("results").style.display = "block"
            updateHbValue()
        } else {
            document.getElementById("canvas").style.display = "block"
            document.getElementById("video").style.display = "none"
            document.getElementById("takePhoto").style.display = "none"
            document.getElementById("takePhotoAgain").style.display = "block"
            document.getElementById("analyze").style.display = "block"
        }
    }
}

// Funktion zum Laden der gespeicherten Daten
export function loadProfilData() {
    const nameElement = document.getElementById('name');
    if (nameElement && sessionStorage.getItem("name") !== "undefined"){
        nameElement.value = sessionStorage.getItem("name");
    } else {
        nameElement.value = ''
    }

    const geburtsdatumElement = document.getElementById('geburtsdatum');
    if (geburtsdatumElement && sessionStorage.getItem("birthday") !== "undefined"){
        geburtsdatumElement.value = sessionStorage.getItem("birthday");
    } else {
        geburtsdatumElement.value = ''
    }

    const geschlechtElement = document.getElementById('geschlecht');
    if (geschlechtElement && sessionStorage.getItem("gender") !== "undefined"){
        geschlechtElement.value = sessionStorage.getItem("gender");
    } else {
        geschlechtElement.value = ''
    }

    if (sessionStorage.getItem("vorerkrankung")) {
        document.getElementById("vorerkrankungenListe").innerHTML = ''
        const vorerkrankungen = JSON.parse(sessionStorage.getItem("vorerkrankung"))
        vorerkrankungen.forEach(item => {
            addItemToList('vorerkrankungenListe', item);
        });
    }

    if (sessionStorage.getItem("medikamente")) {
        document.getElementById("medikamenteListe").innerHTML = ''
        const medikamente = JSON.parse(sessionStorage.getItem("medikamente"))
        medikamente.forEach(item => {
            addItemToList('medikamenteListe', item);
        });
    }
}

// Einheitliche Funktion zum Hinzufügen von Items zu einer Liste
export function addItemToList(listId, text) {
    const list = document.getElementById(listId);
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'list-tag';
    div.id = encodeURIComponent(text)
    div.innerHTML = `
        <span class="tag-text">${text}</span>
        <button type="button" class="delete-btn" onclick="deleteItemFromList('${listId}', '${text}')">×</button>
    `;
    list.appendChild(div);

    if(listId === "vorerkrankungenListe"){
        if(sessionStorage.getItem("vorerkrankung") !== "undefined"){
            let vorerkrankungen = JSON.parse(sessionStorage.getItem("vorerkrankung"))
            vorerkrankungen.push(text)
            sessionStorage.setItem("vorerkrankung", JSON.stringify(vorerkrankungen))
        } else {
            sessionStorage.setItem("vorerkrankung", "[]")
        }
    } else if(listId === "medikamenteListe"){
        if(sessionStorage.getItem("medikamente") !== "undefined") {
            let meds = JSON.parse(sessionStorage.getItem("medikamente"))
            meds.push(text)
            sessionStorage.setItem("medikamente", JSON.stringify(meds))
        } else {
            sessionStorage.setItem("medikamente", "[]")
        }
    }
}

export function deleteItemFromList(listId, text){
    document.getElementById(encodeURIComponent(text)).remove()
    if(listId === "vorerkrankungenListe"){
        let krankliste = JSON.parse(sessionStorage.getItem("vorerkrankung"))
        let neueListe = krankliste.filter(item => item !== text)
        sessionStorage.setItem("vorerkrankung", JSON.stringify(neueListe))
    } else if(listId === "medikamenteListe"){
        let medListe = JSON.parse(sessionStorage.getItem("medikamente"))
        let neueListe = medListe.filter(item => item !== text)
        sessionStorage.setItem("medikamente", JSON.stringify(neueListe))
    }
}

// Generische Funktion zum Anzeigen von Modals
export function showWarningModal(type) {
    const modalId = `${type}WarningModal`;
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';

        const content = type === 'anemia' ?
            `<div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>⚠️ Wichtiger Hinweis zur Anämie</h2>
                <p>Die von Ihnen eingetragene Erkrankung steht in direktem Zusammenhang mit Anämie (Blutarmut) und kann:</p>
                <ul>
                    <li>eine bestehende Anämie verstärken.</li>
                    <li>eine Anämie auslösen.</li>
                    <li>die Behandlung einer Anämie erschweren.</li>
                </ul>
                <p>Bitte besprechen Sie dies mit Ihrem behandelnden Arzt und lassen Sie Ihre Blutwerte regelmäßig kontrollieren.</p>
            </div>` :
            `<div class="modal-content">
                <span class="close-button">&times;</span>
                <h2>⚠️ Wichtiger Hinweis zu Ihrem Medikament</h2>
                <div class="warning-content">
                    <p>Das von Ihnen eingetragene Medikament kann Auswirkungen auf Ihre Blutwerte haben:</p>
                    <ul>
                        <li>Es kann eine bestehende Anämie verstärken</li>
                        <li>Es kann die Bildung roter Blutkörperchen beeinträchtigen</li>
                        <li>Es kann die Eisenaufnahme oder -verwertung stören</li>
                        <li>Es kann die Behandlung einer Anämie erschweren</li>
                    </ul>
                    <div class="important-notice">
                        <p><strong>Wichtige Hinweise:</strong></p>
                        <ul>
                            <li>Setzen Sie das Medikament NICHT eigenständig ab</li>
                            <li>Besprechen Sie mögliche Wechselwirkungen mit Ihrem Arzt</li>
                            <li>Lassen Sie Ihre Blutwerte regelmäßig kontrollieren</li>
                            <li>Achten Sie auf Symptome wie verstärkte Müdigkeit oder Schwäche</li>
                        </ul>
                    </div>
                </div>
            </div>`;

        modal.innerHTML = content;
        document.body.appendChild(modal);

        // Event-Listener für das Schließen
        const closeButton = modal.querySelector('.close-button');
        closeButton.onclick = () => modal.style.display = 'none';
    }

    modal.style.display = 'block';
}

// Funktion zum Hinzufügen von Vorerkrankungen
export function addVorerkrankung() {
    const input = document.getElementById('neueVorerkrankung');
    if (!input) return;

    const krankheit = input.value

    if (krankheit) {
        addItemToList('vorerkrankungenListe', input.value);
        if (anemiaRelatedDiseases.some(disease => krankheit.includes(disease))) {
            showWarningModal('anemia');
        }
        input.value = '';
    }
}

// Funktion zum Hinzufügen von Medikamenten
export function addMedikament() {
    const input = document.getElementById('neuesMedikament');
    if (!input) return;

    const medikament = input.value.trim().toLowerCase();

    if (medikament) {
        addItemToList('medikamenteListe', input.value.trim());
        if (anemiaRelatedMedications.some(med => medikament.includes(med))) {
            showWarningModal('medication');
        }
        input.value = '';
    }
}

// Hilfsfunktionen
export function collectSymptoms() {
    return {
        fatigue: document.getElementById('fatigue')?.checked || false,
        dizziness: document.getElementById('dizziness')?.checked || false,
        shortness_of_breath: document.getElementById('shortness_of_breath')?.checked || false,
        headache: document.getElementById('headache')?.checked || false,
        pale_skin: document.getElementById('pale_skin')?.checked || false,
        weakness: document.getElementById('weakness')?.checked || false,
        cold_hands: document.getElementById('cold_hands')?.checked || false,
        concentration: document.getElementById('concentration')?.checked || false
    };
}

export function resetForm() {
    document.querySelectorAll('.mood-option, .menstruation-card').forEach(option => {
        option.classList.remove('selected');
    });

    document.querySelectorAll('.symptom-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });

    document.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    const activitiesField = document.getElementById('activities');
    if (activitiesField) activitiesField.value = '';

    ['symptomWarning', 'sportWarning', 'menstruationWarning', 'moodResponse'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
}

window.prefillData = prefillData;
window.loadProfilData = loadProfilData;
window.addItemToList = addItemToList;
window.deleteItemFromList = deleteItemFromList;
window.showWarningModal = showWarningModal;
window.addVorerkrankung = addVorerkrankung;
window.addMedikament = addMedikament;
window.collectSymptoms = collectSymptoms;
window.resetForm = resetForm;