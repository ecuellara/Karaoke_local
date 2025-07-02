import json
import os

TURNOS_FILE = "metadata/turnos.json"

def load_turnos():
    if not os.path.exists(TURNOS_FILE):
        return []
    with open(TURNOS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_turnos(turnos):
    with open(TURNOS_FILE, "w", encoding="utf-8") as f:
        json.dump(turnos, f, indent=2, ensure_ascii=False)

def agregar_turno(usuario, cancion, archivo):
    turnos = load_turnos()
    turnos.append({"usuario": usuario, "cancion": cancion, "archivo": archivo})
    save_turnos(turnos)

def siguiente_turno():
    turnos = load_turnos()
    if turnos:
        turnos.pop(0)
    save_turnos(turnos)

def turno_actual():
    turnos = load_turnos()
    return turnos[0] if turnos else None
