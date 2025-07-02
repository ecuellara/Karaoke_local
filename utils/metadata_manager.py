import os
import json
import time
import threading
from mutagen import File

SONGS_DIR = "static/songs"
METADATA_FILE = "metadata/songs_metadata.json"
SUPPORTED_FORMATS = (".mp3", ".flac")

def extract_metadata(filepath):
    audio = File(filepath, easy=True)
    if not audio:
        return None

    nombre_archivo = os.path.basename(filepath)

    return {
        "nombre": os.path.splitext(nombre_archivo)[0],
        "artista": audio.get("artist", ["Desconocido"])[0],
        "genero": audio.get("genre", ["Desconocido"])[0],
        "album": audio.get("album", ["Desconocido"])[0],
        "archivo": nombre_archivo  # 👈 Esto es lo nuevo
    }

def load_metadata():
    if not os.path.exists(METADATA_FILE):
        return []
    with open(METADATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_metadata(metadata):
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

def update_metadata():
    existing = load_metadata()
    existing_names = {item["nombre"] for item in existing}
    new_entries = []
    
    for filename in os.listdir(SONGS_DIR):
        if filename.endswith(SUPPORTED_FORMATS):
            name = os.path.splitext(filename)[0]
            if name not in existing_names:
                path = os.path.join(SONGS_DIR, filename)
                data = extract_metadata(path)
                if data:
                    new_entries.append(data)

    if new_entries:
        print(f"[INFO] Se encontraron {len(new_entries)} canciones nuevas.")
        existing.extend(new_entries)
        save_metadata(existing)
    else:
        print("[INFO] No hay nuevas canciones.")

def start_background_updater():
    def updater():
        while True:
            update_metadata()
            time.sleep(300)  # 5 minutos
    thread = threading.Thread(target=updater, daemon=True)
    thread.start()
