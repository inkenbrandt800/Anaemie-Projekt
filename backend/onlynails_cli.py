# onlynails_cli.py  –  Python 3.8-kompatibel
# --------------------------------------------------------------
import sys, json, base64, tempfile, webbrowser
from io import BytesIO
from pathlib import Path
from typing import Union, List  # <-- wichtig für 3.8

import requests
from PIL import Image, ImageDraw

# ---------- Konfiguration --------------------------------------
BACKEND = "http://localhost:5000"
ENDPOINT_DETECT = f"{BACKEND}/detect_nails"
ENDPOINT_PRED   = f"{BACKEND}/predict_hb_custom"
# --------------------------------------------------------------


# ---------- kleine Utils --------------------------------------
def open_temp_jpg(pil_im: Union[Image.Image, bytes], prefix: str) -> None:
    """
    Öffnet ein PIL-Bild oder JPEG-Bytes schnell in der Windows-Fotoanzeige.
    """
    if isinstance(pil_im, bytes):
        data = pil_im
    else:                                # PIL-Objekt
        buf = BytesIO()
        pil_im.save(buf, format="JPEG")
        data = buf.getvalue()

    tmp = tempfile.NamedTemporaryFile(delete=False,
                                      suffix=".jpg",
                                      prefix=prefix)
    tmp.write(data)
    tmp.close()
    print("▶ Vorschau geöffnet:", tmp.name)
    webbrowser.open(tmp.name)


def draw_boxes(orig_path: Union[str, Path],
               boxes: List[dict],
               keep_ids: List[int]) -> Image.Image:
    """
    Zeichnet nur die Boxen, deren IDs in keep_ids enthalten sind.
    """
    im   = Image.open(orig_path).convert("RGB")
    draw = ImageDraw.Draw(im)

    for b in boxes:
        bid, x1, y1, x2, y2 = b["id"], b["x1"], b["y1"], b["x2"], b["y2"]
        if bid not in keep_ids:
            continue
        draw.rectangle([x1, y1, x2, y2], outline="lime", width=4)
        draw.text((x1 + 4, y1 + 4), str(bid), fill="lime")
    return im
# --------------------------------------------------------------


def main() -> None:
    if len(sys.argv) != 2:
        print("Aufruf: python onlynails_cli.py <bilddatei.jpg>")
        sys.exit(1)

    img_path = Path(sys.argv[1])
    if not img_path.exists():
        print("❌ Datei nicht gefunden:", img_path)
        sys.exit(1)

    # ---------- 1) /detect_nails --------------------------------
    with open(img_path, "rb") as f:
        resp = requests.post(ENDPOINT_DETECT,
                             files={"image": f})
    if resp.status_code != 200:
        print("Fehler bei /detect_nails:", resp.text)
        sys.exit(1)

    det = resp.json()
    boxes   = det["bboxes"]                         # [{'id':…, 'x1':…}, …]
    jpg_b64 = det["annotated"].split(",", 1)[1]
    open_temp_jpg(base64.b64decode(jpg_b64), "first_")

    # ---------- 2) IDs wählen -----------------------------------
    print("\nGefundene Box-IDs:", [b["id"] for b in boxes])
    ids_str = input("IDs zum IGNORIEREN (Komma getrennt, leer = alle behalten): ").strip()
    if ids_str:
        drop_ids = [int(x) for x in ids_str.split(",")]
        keep_ids = [b["id"] for b in boxes if b["id"] not in drop_ids]
    else:
        keep_ids = [b["id"] for b in boxes]

    # Zweite Vorschau
    im2 = draw_boxes(img_path, boxes, keep_ids)
    open_temp_jpg(im2, "second_")

    # ---------- 3) /predict_hb_custom ---------------------------
    files = {"image": open(img_path, "rb")}
    data  = {"keep_ids": json.dumps(keep_ids)}
    resp2 = requests.post(ENDPOINT_PRED, files=files, data=data)
    if resp2.status_code != 200:
        print("Fehler bei /predict_hb_custom:", resp2.text)
        sys.exit(1)

    hb = resp2.json()["hb"]
    print(f"\n💉 Geschätzter Hb-Wert: {hb:.1f} g/L")


if __name__ == "__main__":
    main()
