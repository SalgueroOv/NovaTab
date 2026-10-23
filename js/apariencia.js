// Tema, opciones, paneles, fondo y reloj.
import { $, avisar, crear, svg } from './util.js';
import { alCambiar, escribir } from './almacen.js';
import { datos } from './datos.js';
import { pintar, pintarLocal } from './pintado.js';
import { editando } from './edicion.js';
import { FONDOS } from './fondos.js';
import { CLAVE_FONDO_IMAGEN, borrarImagenFondo, guardarImagenFondo, leerImagenFondo, reducirImagen } from './imagen-fondo.js';

export const CLAVE_TEMA = 'tema';
export const CLAVE_OPCIONES = 'opciones';
// Ajustes de aspecto: si falta alguno o es inválido, vale el de aquí (la página queda como en la versión 4.2.0).
export const APARIENCIA = {
  acento: null, fondo: 'curvas', intensidad: 100, intensidadImagen: 40, densidad: 'comoda',
  esquinas: 'medio', hora24: true, segundos: false, fecha: true,
};
export const IDS_FONDO = ['curvas', 'grafo', 'teselas', 'ondas', 'puntos', 'rayas', 'cuadricula', 'hexagonos', 'anillos', 'montanas', 'liso', 'imagen'];

export const OPCIONES = { fondoGrupos: true, sobrio: false, reunion: false, ocultos: { izq: false, der: false }, apariencia: APARIENCIA };

export const TEMAS = [
  { id: 'bosque', nombre: 'Bosque', modo: 'oscuro', muestra: ['#18221d', '#2f4438'] },
  { id: 'noche', nombre: 'Noche', modo: 'oscuro', muestra: ['#111316', '#29303a'] },
  { id: 'papel', nombre: 'Papel', modo: 'claro', muestra: ['#f5f0e6', '#d8c9ab'] },
  { id: 'glaciar', nombre: 'Glaciar', modo: 'claro', muestra: ['#eaf2f6', '#b9d1e1'] },
];

export const muestras = TEMAS.map(t => {
  const b = crear('button', 'muestra');
  b.type = 'button';
  b.dataset.tema = t.id;
  b.style.setProperty('--m1', t.muestra[0]);
  b.style.setProperty('--m2', t.muestra[1]);
  b.append(crear('i'), t.nombre);
  b.addEventListener('click', () => {
    ponerTema(t.id);
    escribir(CLAVE_TEMA, t.id);
  });
  return b;
});
$('#muestras').append(...muestras);

export function ponerTema(id) {
  const t = TEMAS.find(x => x.id === id) || TEMAS[0];
  document.documentElement.dataset.tema = t.id;
  document.documentElement.dataset.modo = t.modo;
  muestras.forEach(m => m.setAttribute('aria-pressed', String(m.dataset.tema === t.id)));
}

export let opciones = { ...OPCIONES };

const entre = (n, min, max, defecto) => Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : defecto;
const uno = (v, validos, defecto) => validos.includes(v) ? v : defecto;
const booleano = (v, defecto) => typeof v === 'boolean' ? v : defecto;

export function normalizarApariencia(a) {
  const x = a && typeof a === 'object' ? a : {};
  return {
    acento: typeof x.acento === 'string' && /^#[0-9a-f]{6}$/i.test(x.acento) ? x.acento.toLowerCase() : APARIENCIA.acento,
    fondo: uno(x.fondo, IDS_FONDO, APARIENCIA.fondo),
    intensidad: entre(x.intensidad, 0, 100, APARIENCIA.intensidad),
    intensidadImagen: entre(x.intensidadImagen, 0, 100, APARIENCIA.intensidadImagen),
    densidad: uno(x.densidad, ['comoda', 'compacta'], APARIENCIA.densidad),
    esquinas: uno(x.esquinas, ['recto', 'medio', 'redondo'], APARIENCIA.esquinas),
    hora24: booleano(x.hora24, APARIENCIA.hora24),
    segundos: booleano(x.segundos, APARIENCIA.segundos),
    fecha: booleano(x.fecha, APARIENCIA.fecha),
  };
}

// Luminosidad relativa de un color #rrggbb (0 negro, 1 blanco).
function luminosidad(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Aplica los ajustes al documento: variables en :root y clases en body.
export let apariencia = { ...APARIENCIA };
export function ponerApariencia(a) {
  apariencia = normalizarApariencia(a);
  const raiz = document.documentElement.style;
  if (apariencia.acento) {
    raiz.setProperty('--acento', apariencia.acento);
    raiz.setProperty('--sobre-acento', luminosidad(apariencia.acento) > 0.5 ? '#1f1f1f' : '#ffffff');
    $('#acento-libre').value = apariencia.acento;
  } else {
    raiz.removeProperty('--acento');
    raiz.removeProperty('--sobre-acento');
  }
  const clases = document.body.classList;
  clases.toggle('compacta', apariencia.densidad === 'compacta');
  for (const e of ['recto', 'medio', 'redondo']) clases.toggle(`esquinas-${e}`, apariencia.esquinas === e);
  for (const d of ['comoda', 'compacta']) $(`#densidad-${d}`).setAttribute('aria-pressed', String(apariencia.densidad === d));
  for (const e of ['recto', 'medio', 'redondo']) $(`#esquinas-${e}`).setAttribute('aria-pressed', String(apariencia.esquinas === e));
  $('#opt-hora24').checked = apariencia.hora24;
  $('#opt-segundos').checked = apariencia.segundos;
  $('#opt-fecha').checked = apariencia.fecha;
  muestrasFondo.forEach(m => m.setAttribute('aria-pressed', String(m.dataset.fondo === apariencia.fondo)));
  $('#intensidad').value = String(apariencia.fondo === 'imagen' ? apariencia.intensidadImagen : apariencia.intensidad);
  pintarFondo();
  reloj();
  programarReloj();
}

export function cambiarApariencia(parcial) {
  ponerOpciones({ ...opciones, apariencia: { ...opciones.apariencia, ...parcial } });
  escribir(CLAVE_OPCIONES, opciones);
}

export function ponerOpciones(o) {
  const nuevas = o && typeof o === 'object' ? o : {};
  opciones = { ...OPCIONES, ...nuevas, ocultos: { ...OPCIONES.ocultos, ...(nuevas.ocultos || {}) }, apariencia: normalizarApariencia(nuevas.apariencia) };
  ponerApariencia(opciones.apariencia);
  document.body.classList.toggle('grupos-con-fondo', !!opciones.fondoGrupos);
  $('#opt-fondo-grupos').checked = !!opciones.fondoGrupos;
  document.body.classList.toggle('sobrio', !!opciones.sobrio);
  $('#opt-sobrio').checked = !!opciones.sobrio;
  const reunion = $('#btn-reunion');
  reunion.setAttribute('aria-pressed', String(!!opciones.reunion));
  reunion.title = opciones.reunion ? 'Modo reunión activo: pulsa para mostrar los grupos privados' : 'Modo reunión: ocultar los grupos privados';
  reunion.innerHTML = svg(opciones.reunion ? 'ojoTachado' : 'ojo');
  if (datos) pintar();
  for (const [panel, nombre] of [['izq', 'el panel izquierdo'], ['der', 'la red local']]) {
    const oculto = !!opciones.ocultos[panel];
    document.body.classList.toggle(`sin-${panel}`, oculto);
    const b = $(`#btn-panel-${panel}`);
    b.setAttribute('aria-pressed', String(!oculto));
    b.title = `${oculto ? 'Mostrar' : 'Ocultar'} ${nombre}`;
  }
}

$('#btn-reunion').addEventListener('click', () => {
  ponerOpciones({ ...opciones, reunion: !opciones.reunion });
  escribir(CLAVE_OPCIONES, opciones);
  if (opciones.reunion && !datos.grupos.some(g => g.privado)) {
    avisar('Ningún grupo es privado todavía: márcalo al editar el grupo con su lápiz.');
  }
});

// Ocultar o mostrar un panel entero. Nunca quedan los dos ocultos.
for (const panel of ['izq', 'der']) {
  $(`#btn-panel-${panel}`).addEventListener('click', () => {
    const ocultos = { ...opciones.ocultos, [panel]: !opciones.ocultos[panel] };
    if (ocultos.izq && ocultos.der) ocultos[panel === 'izq' ? 'der' : 'izq'] = false;
    ponerOpciones({ ...opciones, ocultos });
    escribir(CLAVE_OPCIONES, opciones);
    if (editando) pintarLocal();
  });
}

$('#opt-sobrio').addEventListener('change', ev => {
  ponerOpciones({ ...opciones, sobrio: ev.target.checked });
  escribir(CLAVE_OPCIONES, opciones);
});

$('#opt-fondo-grupos').addEventListener('change', ev => {
  ponerOpciones({ ...opciones, fondoGrupos: ev.target.checked });
  escribir(CLAVE_OPCIONES, opciones);
});

export const panelTema = $('#panel-tema');

// Pestañas Tema, Fondo y Diseño del panel.
for (const pestana of document.querySelectorAll('#panel-tema [role="tab"]')) {
  pestana.addEventListener('click', () => {
    for (const otra of document.querySelectorAll('#panel-tema [role="tab"]')) {
      const activa = otra === pestana;
      otra.setAttribute('aria-selected', String(activa));
      $(`#pestana-${otra.dataset.pestana}`).hidden = !activa;
    }
  });
}

$('#acento-libre').addEventListener('input', ev => cambiarApariencia({ acento: ev.target.value }));
for (const b of document.querySelectorAll('[data-densidad]')) b.addEventListener('click', () => cambiarApariencia({ densidad: b.dataset.densidad }));
for (const b of document.querySelectorAll('[data-esquinas]')) b.addEventListener('click', () => cambiarApariencia({ esquinas: b.dataset.esquinas }));
$('#opt-hora24').addEventListener('change', ev => cambiarApariencia({ hora24: ev.target.checked }));
$('#opt-segundos').addEventListener('change', ev => cambiarApariencia({ segundos: ev.target.checked }));
$('#opt-fecha').addEventListener('change', ev => cambiarApariencia({ fecha: ev.target.checked }));
$('#acento-restaurar').addEventListener('click', () => cambiarApariencia({ acento: null }));
$('#btn-tema').addEventListener('click', () => {
  panelTema.hidden = !panelTema.hidden;
  $('#btn-tema').setAttribute('aria-expanded', String(!panelTema.hidden));
});
document.addEventListener('click', ev => {
  if (!ev.target.closest('.esquina')) panelTema.hidden = true;
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') panelTema.hidden = true;
});

// El dibujo de fondo elegido (o nada, con «liso») a la intensidad elegida.
// Con «imagen» y una imagen guardada en este equipo se pinta la imagen con su velo; sin ella, las curvas
// (el ajuste guardado no cambia: en otro equipo de la misma cuenta puede que la imagen exista).
let imagenFondo = null;
export function pintarFondo() {
  const w = innerWidth, h = innerHeight;
  const fondo = $('#fondo');
  if (apariencia.fondo === 'imagen' && imagenFondo) {
    fondo.style.backgroundImage = `url("${imagenFondo}")`;
    fondo.style.opacity = '1';
    fondo.innerHTML = '<div class="velo"></div>';
    fondo.firstChild.style.opacity = String(1 - apariencia.intensidadImagen / 100);
  } else {
    const dibujo = FONDOS[apariencia.fondo] || (apariencia.fondo === 'imagen' ? FONDOS.curvas : null);
    fondo.style.backgroundImage = '';
    fondo.innerHTML = dibujo ? `<svg viewBox="0 0 ${w} ${h}">${dibujo.dibujar(w, h)}</svg>` : '';
    fondo.style.opacity = String(apariencia.intensidad / 100);
  }
  $('#quitar-imagen').hidden = !imagenFondo;
}

leerImagenFondo().then(url => { imagenFondo = url; pintarFondo(); }).catch(() => {});
// La imagen cambió en esta u otra pestaña.
alCambiar(cambios => {
  if (!(CLAVE_FONDO_IMAGEN in cambios)) return;
  leerImagenFondo().then(url => { imagenFondo = url; pintarFondo(); });
});

// Las muestras de la pestaña Fondo.
const muestrasFondo = Object.entries(FONDOS).concat([['liso', { nombre: 'Liso' }], ['imagen', { nombre: 'Imagen propia' }]]).map(([id, f]) => {
  const b = crear('button', null, f.nombre);
  b.type = 'button';
  b.dataset.fondo = id;
  b.addEventListener('click', () => (id === 'imagen' && !imagenFondo ? $('#archivo-fondo').click() : cambiarApariencia({ fondo: id })));
  return b;
});
$('#muestras-fondo').append(...muestrasFondo);
// El deslizador gobierna la intensidad del dibujo, o la de la imagen cuando el fondo es la imagen.
$('#intensidad').addEventListener('input', ev => {
  const valor = Number(ev.target.value);
  cambiarApariencia(apariencia.fondo === 'imagen' ? { intensidadImagen: valor } : { intensidad: valor });
});

$('#elegir-imagen').addEventListener('click', () => $('#archivo-fondo').click());
$('#archivo-fondo').addEventListener('change', async ev => {
  const archivo = ev.target.files[0];
  ev.target.value = '';
  if (!archivo) return;
  let url;
  try {
    url = await reducirImagen(archivo);
  } catch (err) {
    avisar(err.message);
    return;
  }
  try {
    await guardarImagenFondo(url);
  } catch (err) {
    avisar(`No se pudo guardar la imagen: ${err.message}`);
    return;
  }
  imagenFondo = url;
  cambiarApariencia({ fondo: 'imagen' });
  avisar('Imagen de fondo guardada');
});
$('#quitar-imagen').addEventListener('click', async () => {
  try {
    await borrarImagenFondo();
  } catch (err) {
    avisar(`No se pudo quitar la imagen: ${err.message}`);
    return;
  }
  imagenFondo = null;
  cambiarApariencia({ fondo: 'curvas' });
});

export function reloj() {
  const d = new Date();
  const formato = { hour: '2-digit', minute: '2-digit', hour12: !apariencia.hora24 };
  if (apariencia.segundos) formato.second = '2-digit';
  $('#hora').textContent = d.toLocaleTimeString('es-ES', formato);
  $('#fecha').textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#fecha').hidden = !apariencia.fecha;
}

// Cada segundo solo si se muestran los segundos; si no, cada 10 s.
let temporizadorReloj;
export function programarReloj() {
  clearInterval(temporizadorReloj);
  temporizadorReloj = setInterval(reloj, apariencia.segundos ? 1000 : 10000);
}
