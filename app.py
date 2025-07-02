from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from utils.metadata_manager import extract_metadata, load_metadata, save_metadata, start_background_updater
from utils.turno_manager import agregar_turno, siguiente_turno, turno_actual, load_turnos, save_turnos
from bs4 import BeautifulSoup
import os
import json
import shutil
import requests
import socket
import lyricsgenius

app = Flask(__name__)  # Debe ir antes de app.config
host_ip = None

# 📁 Configuración de rutas
SONGS_DIR = "static/songs"
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {'.mp3', '.flac'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# 🌐 Obtener IP local automáticamente para identificar al host
def obtener_ip_local():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip_local = s.getsockname()[0]
    except Exception:
        ip_local = "127.0.0.1"
    finally:
        s.close()
    return ip_local

HOST_IP = obtener_ip_local()

# 🔁 Limpiar datos al iniciar
def limpiar_datos():
    print("[INFO] Limpiando metadata y turnos...")
    save_metadata([])
    save_turnos([])
    if os.path.exists(UPLOAD_FOLDER):
        shutil.rmtree(UPLOAD_FOLDER)
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

limpiar_datos()

# 📥 Cargar canciones desde la carpeta predefinida
def cargar_canciones_iniciales():
    print("[INFO] Cargando canciones disponibles...")
    metadata = []
    for filename in os.listdir(SONGS_DIR):
        if filename.endswith(".mp3") or filename.endswith(".flac"):
            full_path = os.path.join(SONGS_DIR, filename)
            info = extract_metadata(full_path)
            if info:
                metadata.append(info)
    save_metadata(metadata)
    print(f"[INFO] Se cargaron {len(metadata)} canciones.")

cargar_canciones_iniciales()

# ⏳ Inicia escaneo automático de nuevas canciones cada 5 minutos
start_background_updater()

# ✔️ Validar si es un archivo permitido
def allowed_file(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

# 📄 Página principal
@app.route('/')
def index():
    return render_template("index.html")

# ▶️ Reproducir canción
@app.route('/play/<filename>')
def play(filename):
    return send_from_directory("static/songs", filename)

# 🔍 Búsqueda por nombre, artista, álbum o género
@app.route("/search")
def search():
    query = request.args.get("q", "").lower()
    metadata = load_metadata()
    results = [
        song for song in metadata
        if query in song["nombre"].lower()
        or query in song["artista"].lower()
        or query in song["genero"].lower()
        or query in song["album"].lower()
    ]
    return jsonify(results)

# 🔄 Obtener si este cliente es el host
@app.route("/is_host")
def check_host():
    global host_ip
    client_ip = request.remote_addr
    
    # Si no hay host definido, este cliente se convierte en host
    if host_ip is None:
        host_ip = client_ip
        return jsonify({"is_host": True})
    
    # Comprueba si este cliente es el host
    return jsonify({"is_host": client_ip == host_ip})

# 📋 Obtener la lista completa de turnos
@app.route("/turnos", methods=["GET"])
def ver_turnos():
    return jsonify(load_turnos())

# ➕ Agregar una canción a la cola de turnos
@app.route("/turno", methods=["POST"])
def agregar_a_turno():
    data = request.get_json()
    usuario = data.get("usuario")
    cancion = data.get("cancion")

    archivo_mp3 = f"{cancion}.mp3"
    archivo_flac = f"{cancion}.flac"

    # Buscar archivo disponible
    archivo = archivo_mp3 if os.path.exists(os.path.join(SONGS_DIR, archivo_mp3)) else (
              archivo_flac if os.path.exists(os.path.join(SONGS_DIR, archivo_flac)) else None)

    if not usuario or not cancion or not archivo:
        return jsonify({"error": "Faltan datos o la canción no existe"}), 400

    agregar_turno(usuario, cancion, archivo)
    return jsonify({"mensaje": "Turno agregado correctamente."})

# ⏭️ Avanzar al siguiente turno
@app.route("/turno/siguiente", methods=["POST"])
def pasar_turno():
    siguiente_turno()
    return jsonify({"mensaje": "Se avanzó al siguiente turno."})

# 👤 Obtener la canción en reproducción
@app.route("/turno/actual", methods=["GET"])
def mostrar_turno_actual():
    actual = turno_actual()
    if not actual:
        return jsonify({"mensaje": "No se encontró canción en turno."})

    metadata = load_metadata()
    artista = next((s["artista"] for s in metadata if s["nombre"] == actual["cancion"]), "Desconocido")
    actual["artista"] = artista
    return jsonify(actual)

# 📜 Obtener la cola completa de reproducción
@app.route("/turno/cola")
def ver_cola():
    return jsonify(load_turnos())

# 📖 Obtener la letra de una canción
GENIUS_TOKEN = "ingresa-tu-token-aqui"
genius = lyricsgenius.Genius(GENIUS_TOKEN)

@app.route("/lyrics")
def lyrics():
    artista = request.args.get("artist", "")
    cancion = request.args.get("title", "")
    if not artista or not cancion:
        return jsonify({"error": "Faltan parámetros"}), 400

    try:
        song = genius.search_song(title=cancion, artist=artista)
        if song and song.lyrics:
            # Filtra el contenido antes de enviarlo
            letras_limpias = filtrar_intro(song.lyrics)
            return jsonify({"lyrics": letras_limpias})
        else:
            return jsonify({"lyrics": "Letra no disponible (Genius API)"}), 404
    except Exception as e:
        return jsonify({"lyrics": f"Error al obtener letra: {str(e)}"}), 500


# 🎯 Función para eliminar todo antes del primer verso
def filtrar_intro(letra):
    lineas = letra.strip().split("\n")
    # Quita cualquier línea vacía o que no comience con [Verso], [Estribillo], etc.
    comienzo = next((i for i, l in enumerate(lineas) if "[" in l and "]" in l), 0)
    return "\n".join(lineas[comienzo:])

# ⬆️ Subir nueva canción al servidor
@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return "No se envió archivo.", 400

    file = request.files['file']
    if file.filename == '':
        return "Nombre de archivo vacío.", 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        final_path = os.path.join(SONGS_DIR, filename)

        # ⚠️ Verificar si ya existe la canción
        if os.path.exists(final_path):
            return "La canción ya existe.", 200

        # Guardar temporal y mover a carpeta final
        file.save(filepath)
        os.rename(filepath, final_path)

        # Extraer metadata y guardar
        data = extract_metadata(final_path)
        if data:
            metadata = load_metadata()
            if data["nombre"] not in [s["nombre"] for s in metadata]:
                metadata.append(data)
                save_metadata(metadata)

        return "Canción subida correctamente.", 200

    return "Formato no permitido.", 400

@app.route("/reset_host")
def reset_host():
    global host_ip
    host_ip = None
    return jsonify({"status": "Host reset successful"})

# 🚀 Ejecutar servidor localmente en red
if __name__ == '__main__':
    print(f"[SERVIDOR] Ejecutando en IP: {HOST_IP}:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
