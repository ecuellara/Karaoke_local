<!DOCTYPE html>
<html>
<head>
</head>
<body>
<h1>Karaoke Local App</h1>

<p><img src="/static/media/Karaoke_app.png" alt="Karaoke App Screenshot"></p>

<p>Una aplicación de karaoke local para fiestas y reuniones, con gestión de turnos y visualización de letras.</p>

<h2>Características</h2>

<ul>
<li>🎤 Sistema de turnos para múltiples participantes</li>
<li>🔍 Búsqueda de canciones por nombre, artista, álbum o género</li>
<li>📜 Visualización de letras sincronizadas</li>
<li>⬆️ Subida de nuevas canciones</li>
<li>🌐 Funciona en red local (un host y múltiples clientes)</li>
</ul>

<h2>Requisitos</h2>

<ul>
<li>Python 3.6+</li>
<li>Flask</li>
<li>Mutagen (para manejo de metadatos)</li>
<li>Requests (para API de letras)</li>
</ul>

<h2>Instalación</h2>

<ol>
<li><p>Clonar el repositorio:</p>

<pre><code>git clone https://github.com/tu-usuario/karaoke-local.git
cd karaoke-local
</code></pre></li>
<li><p>Instalar dependencias:</p>

<pre><code>pip install -r requirements.txt
</code></pre></li>
<li><p>Crear carpeta para canciones:</p>

<pre><code>mkdir -p static/songs
</code></pre></li>
<li><p>Colocar canciones en formato MP3 o FLAC en <code>static/songs/</code></p></li>
<li><p>Ejecutar la aplicación:</p>

<pre><code>python app.py
</code></pre></li>
<li><p>Abrir en el navegador: <code>http://localhost:5000</code></p></li>
</ol>

<h2>Uso</h2>

<ol>
<li>El primer dispositivo que acceda será el "host" (controlador)</li>
<li>Otros dispositivos en la misma red se conectarán como clientes</li>
<li>Los clientes pueden:
<ul>
<li>Buscar canciones</li>
<li>Ver la letra actual</li>
<li>Añadirse a la cola de turnos</li>
</ul></li>
<li>Solo el host puede:
<ul>
<li>Controlar la reproducción</li>
<li>Pasar al siguiente turno</li>
<li>Subir nuevas canciones</li>
</ul></li>
</ol>

<h2>API Endpoints</h2>

<ul>
<li><code>GET /search?q=query</code> - Buscar canciones</li>
<li><code>GET /play/filename</code> - Reproducir canción</li>
<li><code>GET /lyrics?artist=X&amp;title=Y</code> - Obtener letra</li>
<li><code>POST /turno</code> - Añadir turno</li>
<li><code>POST /turno/siguiente</code> - Pasar al siguiente turno</li>
<li><code>POST /upload</code> - Subir nueva canción</li>
</ul>

<h2>Estructura del Proyecto</h2>

<pre><code>karaoke-app/
├── app.py                # Servidor principal
├── metadata_manager.py   # Gestión de metadatos
├── turno_manager.py      # Gestión de turnos
├── static/songs/         # Canciones almacenadas
└── templates/index.html  # Interfaz de usuario
</code></pre>

<h2>Contribución</h2>

<p>Las contribuciones son bienvenidas. Por favor, abre un issue o pull request para sugerencias o mejoras.</p>

<h2>Licencia</h2>

<p>MIT</p>
</body>
</html>
