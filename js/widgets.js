// Widgets de la rejilla: tiempo (Open-Meteo), notas, Google Calendar y Spotify.
import { $, crear, dominio, nuevoId, partes, svg } from './util.js';
import { alCambiar, borrar, escribir, escribirLocal, leer, leerLocal } from './almacen.js';
import { datos } from './datos.js';
import { alto, bloque, colocarSinPosicion } from './rejilla.js';
import { botonPlegar, icono } from './pintado.js';
import { guardarYPintar } from './edicion.js';

// Se carga antes que app.js y usa sus funciones (crear, svg, datos, guardarYPintar…) solo al llamarse.

export const WIDGETS = {
  tiempo: { nombre: 'Tiempo', descripcion: 'Temperatura y previsión de cinco días', w: 4, h: 6, configurable: true },
  notas: { nombre: 'Notas', descripcion: 'Apuntes rápidos que se sincronizan', w: 4, h: 6, configurable: false },
  calendario: { nombre: 'Google Calendar', descripcion: 'Tu agenda de Google Calendar', w: 6, h: 10, configurable: true },
  spotify: { nombre: 'Spotify', descripcion: 'Una playlist, un álbum o un podcast', w: 6, h: 9, configurable: true },
  masUsadas: {
    nombre: 'Más usadas',
    descripcion: 'Las webs que más visitas y aún no tienes guardadas',
    w: 6,
    h: 6,
    configurable: true,
    alto: c => 1 + (c.cantidad || 5),
  },
};

export const widget = id => datos.widgets.find(w => w.id === id);

// ---------- Pintado ----------

export function pintarWidget(w) {
  const src = srcDe(w);
  // Un reproductor o calendario ya cargado, o una nota, se conservan al repintar: rehacerlos cortaría
  // la música o quitaría el foco a quien está escribiendo.
  const conservar = src || (w.tipo === 'notas' ? claveNota(w.id) : null);
  const previo = document.querySelector(`.rejilla .widget[data-id="${w.id}"]`);
  const sec = conservar && previo?.dataset.conservar === conservar ? previo : crear('section', `bloque widget widget-${w.tipo}`);
  sec.style.gridColumn = `${w.pos.x} / span ${w.pos.w}`;
  sec.style.gridRow = `${w.pos.y} / span ${alto(w)}`;
  sec.style.transform = '';
  sec.classList.remove('moviendo');
  sec.classList.toggle('plegado', !!w.plegado);
  if (sec === previo) {
    previo.querySelector('[data-plegar]').replaceWith(botonPlegar(w.plegado));
    return sec;
  }

  sec.dataset.id = w.id;
  if (conservar) sec.dataset.conservar = conservar;
  if (src) sec.classList.add('widget-iframe');
  const cab = crear('div', 'widget-cab');
  cab.append(crear('h3', null, tituloWidget(w)));
  if (WIDGETS[w.tipo].configurable) cab.append(botonWidget('configurar', 'lapiz', 'Configurar widget'));
  cab.append(botonWidget('borrar', 'papelera', 'Borrar widget'), botonPlegar(w.plegado));

  const cuerpo = crear('div', 'widget-cuerpo');
  PINTORES[w.tipo](w, cuerpo);

  const asa = crear('div', 'asa-esquina solo-edicion');
  asa.title = 'Cambiar el tamaño';
  sec.append(cab, cuerpo, asa);
  return sec;
}

export function tituloWidget(w) {
  return w.tipo === 'tiempo' && w.config.nombre ? w.config.nombre : WIDGETS[w.tipo].nombre;
}

export function botonWidget(accion, ico, titulo) {
  const b = crear('button', 'mini solo-edicion');
  b.type = 'button';
  b.dataset.accionWidget = accion;
  b.title = titulo;
  b.setAttribute('aria-label', titulo);
  b.innerHTML = svg(ico);
  return b;
}

export function vacioWidget(cuerpo, texto) {
  const div = crear('div', 'widget-vacio');
  const b = crear('button', 'boton-texto', 'Configurar');
  b.type = 'button';
  b.dataset.accionWidget = 'configurar';
  div.append(crear('p', null, texto), b);
  cuerpo.append(div);
}

export function marco(src, titulo) {
  const f = crear('iframe');
  f.src = src;
  f.title = titulo;
  f.loading = 'lazy';
  f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
  return f;
}

export const srcDe = w =>
  w.tipo === 'spotify' ? urlSpotify(w.config.url) :
  w.tipo === 'calendario' && w.config.src ? urlCalendario(w.config) : null;

// ---------- Tiempo (Open-Meteo, sin clave) ----------

export const CACHE_TIEMPO_MS = 30 * 60 * 1000;
export const pendientesTiempo = new Map();

// Códigos meteorológicos de la OMM → descripción e icono.
export function wmo(c) {
  if (c === 0) return ['Despejado', 'sol'];
  if (c <= 2) return ['Poco nuboso', 'solnube'];
  if (c === 3) return ['Nublado', 'nube'];
  if (c <= 48) return ['Niebla', 'niebla'];
  if (c <= 57) return ['Llovizna', 'lluvia'];
  if (c <= 67) return ['Lluvia', 'lluvia'];
  if (c <= 77) return ['Nieve', 'nieve'];
  if (c <= 82) return ['Chubascos', 'lluvia'];
  if (c <= 86) return ['Chubascos de nieve', 'nieve'];
  return ['Tormenta', 'tormenta'];
}

export const NUBE_ALTA = '<path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 6.5 4.25 4.25 0 0 0 7 15z"/>';
export const ICONOS_TIEMPO = {
  sol: '<g class="amarillo"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></g>',
  solnube: '<g class="amarillo"><circle cx="8" cy="8" r="3"/><path d="M8 2.5v1M2.5 8h1M4.1 4.1l.7.7M11.9 4.1l-.7.7"/></g><path d="M9 20h8.5a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8.4 12.2 3.9 3.9 0 0 0 9 20z"/>',
  nube: '<path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.1 9.5 4.25 4.25 0 0 0 7 18z"/>',
  niebla: '<path d="M4 9h16M6 13h12M4 17h16"/>',
  lluvia: `${NUBE_ALTA}<path class="azul" d="M8 18l-1 3M12 18l-1 3M16 18l-1 3"/>`,
  nieve: `${NUBE_ALTA}<path class="azul" d="M8 19h.01M12 19h.01M16 19h.01M10 22h.01M14 22h.01"/>`,
  tormenta: `${NUBE_ALTA}<path class="amarillo" d="M13 15l-3 4h4l-3 4"/>`,
};
export const iconoTiempo = nombre => `<svg class="ico-tiempo" viewBox="0 0 24 24" aria-hidden="true">${ICONOS_TIEMPO[nombre]}</svg>`;


export function datosTiempo(lat, lon) {
  const clave = `tiempo:${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
  if (!pendientesTiempo.has(clave)) {
    pendientesTiempo.set(clave, (async () => {
      const guardado = await leerLocal(clave);
      if (guardado && Date.now() - guardado.t < CACHE_TIEMPO_MS) return guardado.d;
      const p = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'auto',
        forecast_days: '5',
      });
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`);
      if (!r.ok) throw new Error(`Open-Meteo respondió ${r.status}`);
      const d = await r.json();
      escribirLocal(clave, { t: Date.now(), d }).catch(() => { /* la caché es opcional */ });
      return d;
    })().finally(() => setTimeout(() => pendientesTiempo.delete(clave), CACHE_TIEMPO_MS)));
  }
  return pendientesTiempo.get(clave);
}

export function pintarTiempo(w, cuerpo) {
  const c = w.config;
  if (c.lat == null) return vacioWidget(cuerpo, 'Elige una ciudad para ver el tiempo.');
  cuerpo.append(crear('p', 'widget-nota', 'Cargando…'));
  datosTiempo(c.lat, c.lon)
    .then(d => cuerpo.replaceChildren(vistaTiempo(d)))
    .catch(() => {
      pendientesTiempo.clear();
      cuerpo.replaceChildren(crear('p', 'widget-nota', 'No se pudo cargar el tiempo. Se reintentará al abrir otra pestaña.'));
    });
}

export function vistaTiempo(d) {
  const t = crear('div', 'tiempo');
  const ahora = crear('div', 'tiempo-ahora');
  const [desc, ico] = wmo(d.current.weather_code);
  ahora.insertAdjacentHTML('beforeend', iconoTiempo(ico));
  const texto = crear('div');
  texto.append(
    crear('div', 'tiempo-temp', `${Math.round(d.current.temperature_2m)}°`),
    crear('div', 'tiempo-desc', desc),
    crear('div', 'tiempo-meta', `Sensación ${Math.round(d.current.apparent_temperature)}° · Viento ${Math.round(d.current.wind_speed_10m)} km/h`),
  );
  ahora.append(texto);

  const dias = crear('div', 'tiempo-dias');
  d.daily.time.forEach((fecha, i) => {
    const dia = crear('div', 'dia');
    const nombre = i === 0 ? 'Hoy' : new Date(`${fecha}T12:00`).toLocaleDateString('es-ES', { weekday: 'short' });
    dia.append(crear('span', 'dia-nombre', nombre));
    dia.insertAdjacentHTML('beforeend', iconoTiempo(wmo(d.daily.weather_code[i])[1]));
    dia.append(
      crear('span', 'max', `${Math.round(d.daily.temperature_2m_max[i])}°`),
      crear('span', 'min', `${Math.round(d.daily.temperature_2m_min[i])}°`),
    );
    const lluvia = d.daily.precipitation_probability_max?.[i];
    if (lluvia >= 30) dia.append(crear('span', 'lluvia', `${lluvia}%`));
    dia.title = wmo(d.daily.weather_code[i])[0];
    dias.append(dia);
  });
  t.append(ahora, dias);
  return t;
}

// ---------- Notas ----------
// Cada nota va en su propia clave de storage.sync (8 KB por clave) para no llenar la de los enlaces.

export const memoriaNotas = new Map();
export const notasGuardadas = new Map();
export const claveNota = id => `nota:${id}`;
// Notas con texto aún sin guardar: id → la función que la guarda.
const notasSinGuardar = new Map();

export function pintarNotas(w, cuerpo) {
  const ta = crear('textarea', 'notas-texto');
  ta.placeholder = 'Escribe aquí…';
  ta.maxLength = 3500;
  ta.dataset.nota = w.id;
  if (memoriaNotas.has(w.id)) {
    ta.value = memoriaNotas.get(w.id);
  } else {
    leer(claveNota(w.id)).then(v => {
      const texto = typeof v === 'string' ? v : '';
      memoriaNotas.set(w.id, texto);
      notasGuardadas.set(w.id, texto);
      if (document.activeElement !== ta) ta.value = texto;
    });
  }
  let espera;
  const guardarNota = () => {
    clearTimeout(espera);
    notasSinGuardar.delete(w.id);
    if (notasGuardadas.get(w.id) === ta.value) return;
    notasGuardadas.set(w.id, ta.value);
    escribir(claveNota(w.id), ta.value);
  };
  ta.addEventListener('input', () => {
    memoriaNotas.set(w.id, ta.value);
    notasSinGuardar.set(w.id, guardarNota);
    clearTimeout(espera);
    // Se guarda al dejar de escribir 2 s: cada guardado gasta una de las 120 escrituras por minuto de sync.
    espera = setTimeout(guardarNota, 2000);
  });
  ta.addEventListener('blur', guardarNota);
  cuerpo.append(ta);
}

export async function leerNotas() {
  const notas = {};
  for (const w of datos.widgets.filter(x => x.tipo === 'notas')) {
    const v = memoriaNotas.get(w.id) ?? await leer(claveNota(w.id));
    if (typeof v === 'string' && v) notas[w.id] = v;
  }
  return notas;
}

export async function escribirNotas(notas) {
  if (!notas || typeof notas !== 'object') return;
  for (const [id, valor] of Object.entries(notas)) {
    const texto = String(valor);
    memoriaNotas.set(id, texto);
    notasGuardadas.set(id, texto);
    await escribir(claveNota(id), texto);
    // La nota en pantalla se conserva al repintar: hay que darle el texto nuevo.
    const ta = document.querySelector(`textarea[data-nota="${CSS.escape(id)}"]`);
    if (ta) ta.value = texto;
  }
}

export function borrarNota(id) {
  memoriaNotas.delete(id);
  notasGuardadas.delete(id);
  borrar([claveNota(id)]).catch(() => { /* la nota huérfana se limpiará al restablecer */ });
}

// Al salir de la pestaña (cambiar a otra, cerrarla, minimizar) no se esperan los 2 s.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') [...notasSinGuardar.values()].forEach(guardarNota => guardarNota());
});

// Una nota editada en otra pestaña u otro equipo se actualiza aquí si no la estás escribiendo.
alCambiar(cambios => {
  for (const [clave, { newValue }] of Object.entries(cambios)) {
    if (!clave.startsWith('nota:') || typeof newValue !== 'string') continue;
    const id = clave.slice(5);
    memoriaNotas.set(id, newValue);
    notasGuardadas.set(id, newValue); // ya está guardado: entrar y salir de la nota no lo reescribe
    const ta = document.querySelector(`textarea[data-nota="${CSS.escape(id)}"]`);
    if (ta && document.activeElement !== ta) ta.value = newValue;
  }
});

// ---------- Google Calendar ----------

export function urlCalendario(c) {
  if (/^https:\/\/calendar\.google\.com\/calendar\/(u\/\d+\/)?embed\?/.test(c.src)) return c.src;
  const p = new URLSearchParams({
    src: c.src,
    ctz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    mode: c.vista || 'AGENDA',
    hl: 'es',
    wkst: '2',
    showTitle: '0',
    showPrint: '0',
    showTabs: '0',
    showCalendars: '0',
    showTz: '0',
  });
  return `https://calendar.google.com/calendar/embed?${p}`;
}

export function pintarCalendario(w, cuerpo) {
  if (!w.config.src) return vacioWidget(cuerpo, 'Indica qué calendario mostrar.');
  cuerpo.append(marco(urlCalendario(w.config), 'Google Calendar'));
}

// ---------- Spotify ----------

export function urlSpotify(texto) {
  const m = String(texto || '').trim().match(
    /^(?:https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?|spotify:)(track|album|playlist|artist|episode|show)[/:]([A-Za-z0-9]{10,})/i);
  return m ? `https://open.spotify.com/embed/${m[1].toLowerCase()}/${m[2]}?utm_source=generator` : null;
}

export function pintarSpotify(w, cuerpo) {
  const src = urlSpotify(w.config.url);
  if (!src) return vacioWidget(cuerpo, 'Pega el enlace de una playlist, álbum o podcast.');
  cuerpo.append(marco(src, 'Spotify'));
}

// ---------- Más usadas ----------
// Las webs más visitadas según Chrome (las de los accesos directos de su pestaña nueva), sin las que
// ya están en algún grupo. Se comparan por dominio y puerto: youtube.com/watch… cuenta como youtube.com.

export function claveSitio(url) {
  const p = partes(url);
  return p.host ? `${p.host.replace(/^www\./, '')}:${p.puerto}` : null;
}

export function pintarMasUsadas(w, cuerpo) {
  if (typeof chrome === 'undefined' || !chrome.topSites) {
    cuerpo.append(crear('p', 'widget-nota', 'Disponible al usarlo como extensión de Chrome.'));
    return;
  }
  chrome.topSites.get(sitios => {
    const guardados = new Set(datos.grupos.flatMap(g => g.enlaces.map(e => claveSitio(e.url))));
    const vistos = new Set();
    const lista = sitios
      .filter(s => /^https?:/.test(s.url))
      .filter(s => {
        const k = claveSitio(s.url);
        if (!k || guardados.has(k) || vistos.has(k)) return false;
        vistos.add(k);
        return true;
      })
      .slice(0, w.config.cantidad || 5);
    if (!lista.length) {
      cuerpo.replaceChildren(crear('p', 'widget-nota', 'Nada nuevo: tus webs más visitadas ya están en tus grupos.'));
      return;
    }
    const div = crear('div', 'mas-usadas');
    for (const s of lista) {
      const a = crear('a', 'fila');
      a.href = s.url;
      a.title = s.url;
      const nombre = s.title || dominio(s.url);
      a.append(icono({ url: s.url, nombre }, { zona: 'online', color: '#8a8c92' }), crear('span', 'nombre', nombre), crear('span', 'dir', dominio(s.url)));
      div.append(a);
    }
    cuerpo.replaceChildren(div);
  });
}

export const PINTORES = { tiempo: pintarTiempo, notas: pintarNotas, calendario: pintarCalendario, spotify: pintarSpotify, masUsadas: pintarMasUsadas };

// ---------- Añadir, configurar y borrar ----------

// Diálogo genérico: construir() rellena el cuerpo y devuelve la función que lee el resultado.
export function dialogoWidget(titulo, construir, { conGuardar = true } = {}) {
  const dlg = $('#dlg-widget');
  const form = dlg.querySelector('form');
  const cuerpo = dlg.querySelector('.dlg-cuerpo');
  dlg.querySelector('h2').textContent = titulo;
  dlg.querySelector('button[value="ok"]').hidden = !conGuardar;
  cuerpo.replaceChildren();
  let resultado = null;
  const ctx = {
    validar: null,
    cerrar: valor => { resultado = valor; dlg.close('ok'); },
  };
  const leerValor = construir(cuerpo, ctx);
  const alEnviar = ev => {
    if (ev.submitter?.value === 'ok' && ctx.validar && !ctx.validar()) ev.preventDefault();
  };
  form.addEventListener('submit', alEnviar);
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise(resolve => {
    dlg.addEventListener('close', () => {
      form.removeEventListener('submit', alEnviar);
      resolve(dlg.returnValue === 'ok' ? (resultado ?? leerValor?.() ?? null) : null);
    }, { once: true });
  });
}

export function campo(etiqueta, attrs = {}) {
  const label = crear('label', null, etiqueta);
  const input = crear(attrs.tag || 'input');
  for (const [k, v] of Object.entries(attrs)) if (k !== 'tag') input[k] = v;
  label.append(input);
  return [label, input];
}

export function elegirTipo() {
  return dialogoWidget('Añadir widget', (cuerpo, ctx) => {
    const [labelPanel, panel] = campo('Colocar en', { tag: 'select' });
    panel.append(new Option('Panel izquierdo', 'izq'), new Option('Panel derecho (red local)', 'der'));
    const tipos = crear('div', 'tipos');
    for (const [id, t] of Object.entries(WIDGETS)) {
      const b = crear('button', 'tipo-widget');
      b.type = 'button';
      b.append(crear('b', null, t.nombre), crear('span', null, t.descripcion));
      b.addEventListener('click', () => ctx.cerrar({ tipo: id, panel: panel.value }));
      tipos.append(b);
    }
    cuerpo.append(labelPanel, tipos);
  }, { conGuardar: false });
}

export const CONFIGURADORES = {
  tiempo: (actual) => (cuerpo, ctx) => {
    let elegido = actual.lat != null ? { ...actual } : null;
    const fila = crear('div', 'fila-busqueda');
    const [label, input] = campo('Ciudad', { type: 'search', placeholder: 'Madrid', autocomplete: 'off' });
    const buscarBtn = crear('button', 'boton-texto', 'Buscar');
    buscarBtn.type = 'button';
    fila.append(label, buscarBtn);
    const lista = crear('ul', 'resultados');
    const ubicacion = crear('button', 'boton-texto', 'Usar mi ubicación');
    ubicacion.type = 'button';
    const estado = crear('p', 'dlg-estado', elegido ? `Elegido: ${elegido.nombre}` : 'Busca una ciudad o usa tu ubicación.');

    const elegir = (lugar, boton) => {
      elegido = lugar;
      estado.textContent = `Elegido: ${lugar.nombre}${lugar.region ? `, ${lugar.region}` : ''}`;
      lista.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === boton)));
    };

    const buscarCiudad = async () => {
      const q = input.value.trim();
      if (!q) return;
      estado.textContent = 'Buscando…';
      try {
        const p = new URLSearchParams({ name: q, count: '6', language: 'es', format: 'json' });
        const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${p}`);
        const res = (await r.json()).results || [];
        lista.replaceChildren(...res.map(x => {
          const li = crear('li');
          const b = crear('button');
          b.type = 'button';
          const region = [x.admin1, x.country].filter(Boolean).join(', ');
          b.append(crear('span', null, x.name), crear('small', null, ` ${region}`));
          b.addEventListener('click', () => elegir({ nombre: x.name, region, lat: x.latitude, lon: x.longitude }, b));
          li.append(b);
          return li;
        }));
        estado.textContent = res.length ? 'Elige una de la lista.' : 'No se encontró esa ciudad.';
      } catch {
        estado.textContent = 'No se pudo buscar. ¿Hay conexión?';
      }
    };

    buscarBtn.addEventListener('click', buscarCiudad);
    input.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); buscarCiudad(); }
    });
    ubicacion.addEventListener('click', () => {
      if (!navigator.geolocation) { estado.textContent = 'Este navegador no da la ubicación.'; return; }
      estado.textContent = 'Obteniendo tu ubicación…';
      navigator.geolocation.getCurrentPosition(
        p => elegir({ nombre: 'Mi ubicación', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }),
        e => { estado.textContent = `No se pudo obtener la ubicación (${e.message}).`; },
        { timeout: 10000, maximumAge: 3600000 });
    });
    ctx.validar = () => {
      if (elegido) return true;
      estado.textContent = 'Elige una ciudad de la lista o usa tu ubicación.';
      return false;
    };
    cuerpo.append(fila, lista, ubicacion, estado);
    setTimeout(() => input.focus());
    return () => elegido;
  },

  calendario: (actual) => (cuerpo) => {
    const [label, input] = campo('Calendario', { required: true, value: actual.src || '', placeholder: 'tu.correo@gmail.com' });
    const ayuda = crear('p', 'dlg-ayuda',
      'Tu dirección de Gmail muestra tu calendario principal. También vale la URL de «Integrar calendario» de la configuración de Google Calendar.');
    const [labelVista, vista] = campo('Vista', { tag: 'select' });
    vista.append(new Option('Agenda', 'AGENDA'), new Option('Semana', 'WEEK'), new Option('Mes', 'MONTH'));
    vista.value = actual.vista || 'AGENDA';
    cuerpo.append(label, ayuda, labelVista);
    return () => ({ src: input.value.trim(), vista: vista.value });
  },

  masUsadas: (actual) => (cuerpo) => {
    const [label, cantidad] = campo('Cuántas mostrar', { tag: 'select' });
    cantidad.append(new Option('5', '5'), new Option('10', '10'));
    cantidad.value = String(actual.cantidad || 5);
    const ayuda = crear('p', 'dlg-ayuda', 'Salen de las webs que más visitas en Chrome. Las que ya tienes en algún grupo no se repiten.');
    cuerpo.append(label, ayuda);
    return () => ({ cantidad: Number(cantidad.value) });
  },

  spotify: (actual) => (cuerpo, ctx) => {
    const [label, input] = campo('Enlace de Spotify', { required: true, value: actual.url || '', placeholder: 'https://open.spotify.com/playlist/…' });
    const ayuda = crear('p', 'dlg-ayuda', 'En Spotify: Compartir → Copiar enlace de la playlist, álbum, artista o podcast.');
    ctx.validar = () => {
      const ok = !!urlSpotify(input.value);
      input.setCustomValidity(ok ? '' : 'Ese enlace no es de una playlist, álbum, artista, canción o podcast de Spotify.');
      input.reportValidity();
      return ok;
    };
    input.addEventListener('input', () => input.setCustomValidity(''));
    cuerpo.append(label, ayuda);
    return () => ({ url: input.value.trim() });
  },
};

export function configurar(tipo, actual = {}) {
  return dialogoWidget(WIDGETS[tipo].nombre, CONFIGURADORES[tipo](actual));
}

export async function nuevoWidget() {
  const elegido = await elegirTipo();
  if (!elegido) return;
  const { tipo, panel } = elegido;
  let config = {};
  if (WIDGETS[tipo].configurable) {
    config = await configurar(tipo);
    if (!config) return;
  }
  const w = { id: nuevoId(), tipo, panel, pos: null, config };
  datos.widgets.push(w);
  colocarSinPosicion(datos);
  if (WIDGETS[tipo].alto) w.pos.h = WIDGETS[tipo].alto(config);
  await guardarYPintar(w);
  document.querySelector(`.rejilla .widget[data-id="${w.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

export async function accionDeWidget(accion, id) {
  const w = widget(id);
  if (!w) return;
  if (accion === 'borrar') {
    if (!confirm(`¿Borrar el widget «${tituloWidget(w)}»?`)) return;
    datos.widgets.splice(datos.widgets.indexOf(w), 1);
    if (w.tipo === 'notas') borrarNota(w.id);
    await guardarYPintar();
  } else if (accion === 'configurar') {
    const config = await configurar(w.tipo, w.config);
    if (!config) return;
    w.config = config;
    if (WIDGETS[w.tipo].alto) w.pos.h = WIDGETS[w.tipo].alto(config);
    await guardarYPintar(w);
  }
}
