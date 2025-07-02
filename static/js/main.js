let esHost = false;
let currentLyrics = {
  artist: '',
  title: '',
  lyrics: ''
};

// 🎧 Verificar si este cliente es el host
function verificarHost() {
  fetch("/is_host")
    .then(res => {
      if (!res.ok) throw new Error("Error en la respuesta");
      return res.json();
    })
    .then(data => {
      esHost = data.is_host;
      if (esHost) {
        console.log("Modo HOST activado");
        // Almacenar en localStorage para reconexiones
        localStorage.setItem('esHost', 'true');
      } else {
        console.log("Modo CLIENTE activado");
        localStorage.removeItem('esHost');
      }
      iniciarApp();
    })
    .catch(err => {
      console.error("Error verificando host:", err);
      
      // Intentar reconectar (útil si el servidor acaba de iniciar)
      if (intentosReconexion < MAX_INTENTOS) {
        intentosReconexion++;
        setTimeout(verificarHost, 2000);
      } else {
        // Modo seguro si no hay conexión
        esHost = localStorage.getItem('esHost') === 'true';
        iniciarApp();
      }
    });
}

// 🎵 Iniciar aplicación
function iniciarApp() {
  // Verificar si los elementos existen antes de manipularlos
  const playerContainer = document.getElementById("playerContainer");
  const player = document.getElementById("player");
  
  if (!esHost) {
    if (player) player.remove();
    if (playerContainer) playerContainer.style.display = "none";
  } else {
    if (playerContainer) playerContainer.style.display = "block";
  }

  cargarSelectorCanciones();
  mostrarColaTurnos();

  if (esHost) {
    cargarTurnoActual();
    // Notificar a los clientes cuando cambia la canción
    document.getElementById('player').addEventListener('ended', manejarFinCancion);
  } else {
    // Sincronizar cada 3 segundos (ajustable)
    setInterval(sincronizarReproduccion, 3000);
  }

  function manejarFinCancion() {
    if (esHost) {
      fetch("/turno/siguiente", { method: "POST" })
        .then(() => {
          cargarTurnoActual();
          mostrarColaTurnos();
        })
        .catch(err => console.error("Error avanzando turno:", err));
    }
  }
  
  // Animación de carga
  document.querySelectorAll('.card').forEach((card, index) => {
    card.style.opacity = '0';
    card.classList.add('fade-in');
    card.style.animationDelay = `${index * 0.1}s`;
  });
}

// 🔄 Mostrar letra y reproducir canción (solo host)
function playSong(song) {
  if (!esHost) return;

  const player = document.getElementById('player');
  player.src = `/play/${song.archivo}`;
  player.play();

  fetch(`/lyrics?artist=${encodeURIComponent(song.artista)}&title=${encodeURIComponent(song.nombre)}`)
    .then(res => res.json())
    .then(data => {
      const rawLyrics = data.lyrics || "Letra no disponible.";
      const cleanText = cleanLyrics(rawLyrics);
      
      // Actualiza las letras actuales
      currentLyrics = {
        artist: song.artista,
        title: song.nombre,
        lyrics: cleanText
      };
      
      document.getElementById('lyrics').textContent = currentLyrics.lyrics;
      updateLyricsButton();
    });
}

// Función para actualizar el botón de letras
function updateLyricsButton() {
  const lyricsContainer = document.getElementById('lyricsContainer');
  let btn = lyricsContainer.querySelector('.open-lyrics-btn');
  
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'open-lyrics-btn';
    btn.innerHTML = '<i class="fas fa-expand"></i> Ver letra completa';
    lyricsContainer.appendChild(btn);
  }
  
  // Actualiza el evento click para usar las letras actuales
  btn.onclick = showLyricsPopup;
}

// 🎶 Sincronizar canción y letra (modo cliente)
function sincronizarReproduccion() {
  fetch("/turno/actual")
    .then(res => res.json())
    .then(data => {
      if (!data || !data.archivo) return;

      const audio = document.getElementById('player');
      if (audio && !audio.src.endsWith(data.archivo)) {
        audio.src = `/play/${data.archivo}`;
        audio.play();
      }

      fetch(`/lyrics?artist=${encodeURIComponent(data.artista)}&title=${encodeURIComponent(data.cancion)}`)
  .then(res => res.json())
  .then(data => {
    currentLyrics = {
      artist: data.artista,
      title: data.cancion,
      lyrics: cleanLyrics(data.lyrics) || "Letra no disponible."
    };
          document.getElementById('lyrics').textContent = currentLyrics.lyrics;
          updateLyricsButton();
        });
    });
}

// 🎤 Mostrar turno actual (solo host)
function cargarTurnoActual() {
  fetch("/turno/actual")
    .then(res => res.json())
    .then(data => {
      const player = document.getElementById('player');
      if (data.archivo && player) {
        player.src = `/play/${data.archivo}`;
        player.play();
      }

      document.getElementById('lyrics').textContent = "Letra no disponible.";
      if (data.artista && data.cancion) {
        fetch(`/lyrics?artist=${encodeURIComponent(data.artista)}&title=${encodeURIComponent(data.cancion)}`)
  .then(res => res.json())
  .then(dataLetra => {
    currentLyrics = {
      artist: data.artista,
      title: data.cancion,
      lyrics: cleanLyrics(dataLetra.lyrics) || "Letra no disponible."
    };
            document.getElementById('lyrics').textContent = currentLyrics.lyrics;
            updateLyricsButton();
          });
      }
    });
}

// ⏭️ Evento cuando termina la canción (solo host)
document.addEventListener("DOMContentLoaded", () => {
  const player = document.getElementById("player");
  if (player) {
    player.addEventListener("ended", () => {
      if (esHost) {
        fetch("/turno/siguiente", { method: "POST" })
          .then(() => {
            cargarTurnoActual();
            mostrarColaTurnos();
          })
          .catch(err => console.error("Error avanzando turno:", err));
      }
    });
  }
});

// 📥 Mostrar lista de canciones
function cargarSelectorCanciones() {
  fetch("/search?q=")
    .then(res => res.json())
    .then(data => {
      const select = document.getElementById("cancionSelect");
      select.innerHTML = '<option value="" disabled selected>Selecciona una canción</option>';
      data.forEach(song => {
        const option = document.createElement("option");
        option.value = song.nombre;
        option.textContent = `${song.nombre} - ${song.artista}`;
        select.appendChild(option);
      });

      const allDiv = document.getElementById("allSongs");
      allDiv.innerHTML = "";
      if (data.length === 0) {
        allDiv.innerHTML = "<div>No hay canciones disponibles</div>";
        return;
      }
      
      data.forEach(song => {
        const div = document.createElement("div");
        div.textContent = `${song.nombre} - ${song.artista}`;
        div.style.cursor = "pointer";
        div.onclick = () => playSong(song);
        allDiv.appendChild(div);
      });
    })
    .catch(err => {
      console.error("Error cargando canciones:", err);
      document.getElementById("allSongs").innerHTML = "<div>Error cargando canciones</div>";
    });
}

// ➕ Agregar canción a la cola
document.getElementById("turnoForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const usuario = document.getElementById("usuarioInput").value.trim();
  const cancion = document.getElementById("cancionSelect").value;
  const status = document.getElementById("turnoStatus");

  if (!usuario || !cancion) {
    status.textContent = "Por favor completa todos los campos";
    status.style.color = "var(--danger)";
    status.style.backgroundColor = "rgba(214, 48, 49, 0.1)";
    return;
  }

  fetch("/turno", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, cancion })
  })
    .then(res => res.json())
    .then(data => {
      if (data.mensaje) {
        status.textContent = data.mensaje;
        status.style.color = "var(--success)";
        status.style.backgroundColor = "rgba(0, 184, 148, 0.1)";
        document.getElementById("usuarioInput").value = "";
      } else if (data.error) {
        status.textContent = data.error;
        status.style.color = "var(--danger)";
        status.style.backgroundColor = "rgba(214, 48, 49, 0.1)";
      }

      mostrarColaTurnos();

      setTimeout(() => {
        status.textContent = "";
        status.style.backgroundColor = "transparent";
      }, 3000);
    })
    .catch(err => {
      console.error("Error agregando turno:", err);
      status.textContent = "Error al agregar turno";
      status.style.color = "var(--danger)";
      status.style.backgroundColor = "rgba(214, 48, 49, 0.1)";
    });
});

// 🔁 Ver cola actual
function mostrarColaTurnos() {
  fetch("/turno/cola")
    .then(res => res.json())
    .then(data => {
      const lista = document.getElementById("colaTurnos");
      lista.innerHTML = "";
      if (data.length === 0) {
        lista.innerHTML = "<li>No hay turnos en espera.</li>";
        return;
      }

      data.forEach((turno, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${i + 1}.</strong> ${turno.usuario} - ${turno.cancion}`;
        lista.appendChild(li);
      });
    })
    .catch(err => {
      console.error("Error cargando cola:", err);
      document.getElementById("colaTurnos").innerHTML = "<li>Error cargando cola de turnos</li>";
    });
}

// 🔎 Buscar canción
document.getElementById("searchInput").addEventListener("input", function () {
  const query = this.value.trim();
  if (query.length < 2) {
    document.getElementById("results").innerHTML = "";
    return;
  }

  fetch(`/search?q=${query}`)
    .then(res => res.json())
    .then(data => {
      const results = document.getElementById("results");
      results.innerHTML = "";
      
      if (data.length === 0) {
        results.innerHTML = "<li>No se encontraron resultados</li>";
        return;
      }
      
      data.forEach(song => {
        const li = document.createElement("li");
        li.textContent = `${song.nombre} - ${song.artista}`;
        li.onclick = () => playSong(song);
        results.appendChild(li);
      });
    })
    .catch(err => {
      console.error("Error buscando:", err);
      document.getElementById("results").innerHTML = "<li>Error en la búsqueda</li>";
    });
});

// Función para mostrar el popup con las letras
function showLyricsPopup() {
  const popup = document.getElementById('lyricsPopup');
  const titleElement = document.getElementById('popupSongTitle');
  const lyricsElement = document.getElementById('popupLyrics');
  
  titleElement.textContent = `${currentLyrics.title} - ${currentLyrics.artist}`;
  lyricsElement.textContent = currentLyrics.lyrics || "Letra no disponible";
  
  popup.classList.add('active');
  document.body.style.overflow = 'hidden';
}

// Función para cerrar el popup
function closeLyricsPopup() {
  const popup = document.getElementById('lyricsPopup');
  popup.classList.remove('active');
  document.body.style.overflow = ''; // Restaurar scroll
}

// Event listeners para el popup
document.addEventListener('DOMContentLoaded', () => {
  // Cerrar popup al hacer clic en el botón
  document.getElementById('closePopup').addEventListener('click', closeLyricsPopup);
  
  // Cerrar popup al hacer clic fuera del contenido
  document.getElementById('lyricsPopup').addEventListener('click', function(e) {
    if (e.target === this) {
      closeLyricsPopup();
    }
  });
  
  // Cerrar con tecla ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && document.getElementById('lyricsPopup').classList.contains('active')) {
      closeLyricsPopup();
    }
  });
});

function cleanLyrics(rawLyrics) {
  if (!rawLyrics) return "Letra no disponible.";
  
  // Patrones comunes a eliminar
  const patternsToRemove = [
    /^.+(?=\[Verse)/i,    // Todo antes de [Verse
    /^.+(?=\(Verse)/i,    // Todo antes de (Verse
    /^.+(?=Verse \d)/i,   // Todo antes de Verse 1
    /^[\s\S]*?(?=\d+ Contributors)/i,  // Elimina sección de contributors
    /^[\s\S]*?(?=Translations)/i,      // Elimina sección de traducciones
    /^[\s\S]*?(?=Read More)/i          // Elimina texto "Read More"
  ];

  let cleaned = rawLyrics;
  patternsToRemove.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Eliminar líneas vacías al inicio
  cleaned = cleaned.replace(/^\s*\n/gm, '');

  return cleaned.trim() || "Letra no disponible.";
}


// ▶️ Iniciar app al cargar
window.onload = verificarHost;