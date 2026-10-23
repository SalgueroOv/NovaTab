// El buscador: tus enlaces primero y Google después.
import { $, crear, direccion, dominio, svg } from './util.js';
import { datos } from './datos.js';
import { visible } from './rejilla.js';
import { icono } from './pintado.js';
import { opciones } from './apariencia.js';
import { ORIGEN_SUGERENCIAS, URL_SUGERENCIAS, resolverConsulta } from './motores.js';

// Búsqueda en Google. udm=50 es el modo IA, udm=2 imágenes y udm=7 vídeos.
export const GOOGLE = [
  { icono: 'buscar', titulo: q => `Buscar «${q}» en Google`, url: q => `https://www.google.com/search?q=${q}` },
  { icono: 'ia', titulo: () => 'Preguntar al Modo IA', url: q => `https://www.google.com/search?udm=50&q=${q}` },
  { icono: 'imagen', titulo: () => 'Imágenes', url: q => `https://www.google.com/search?udm=2&q=${q}` },
  { icono: 'video', titulo: () => 'Vídeos', url: q => `https://www.google.com/search?udm=7&q=${q}` },
  { icono: 'noticias', titulo: () => 'Noticias', url: q => `https://www.google.com/search?tbm=nws&q=${q}` },
  { icono: 'mapa', titulo: () => 'Maps', url: q => `https://www.google.com/maps/search/${q}` },
];

export const buscar = $('#buscar');

export const sugerencias = $('#sugerencias');
export const caja = $('#buscador');
export let items = [];
export let sel = 0;
export let primeraGoogle = 0;

export function fila(url, iconoNodo, titulo, sub, etiqueta) {
  const a = crear('a', 'sugerencia');
  a.href = url;
  if (typeof iconoNodo === 'string') a.insertAdjacentHTML('beforeend', iconoNodo);
  else a.append(iconoNodo);
  a.append(crear('span', 's-titulo', titulo), crear('span', 's-sub mono', sub), crear('span', 's-etiqueta', etiqueta));
  return a;
}

export function marcar() {
  items.forEach((n, i) => n.classList.toggle('sel', i === sel));
}

// Las sugerencias de Google (si están activas y hay permiso): hasta cinco textos, o nada si algo falla.
export async function pedirSugerencias(q) {
  try {
    const r = await fetch(URL_SUGERENCIAS + encodeURIComponent(q));
    const d = await r.json();
    return Array.isArray(d?.[1]) ? d[1].filter(s => typeof s === 'string' && s).slice(0, 5) : [];
  } catch {
    return [];
  }
}

const tienePermiso = () => new Promise(resolver => {
  if (typeof chrome === 'undefined' || !chrome.permissions) resolver(false);
  else chrome.permissions.contains({ origins: [ORIGEN_SUGERENCIAS] }, ok => resolver(!!ok));
});

let filasPropias = [];
let filasMotor = [];
let peticion = 0; // cada texto nuevo es una petición: las respuestas viejas se descartan
let temporizadorSugerencias;

// Pinta el desplegable: tus enlaces, las sugerencias de Google, la fila de tu motor y el resto de Google.
function dibujar(sugs) {
  const anterior = items[sel];
  const sinAtajos = { ...opciones.buscador, atajos: [] };
  const filasSug = sugs.map(s => fila(resolverConsulta(s, sinAtajos).destino.url, svg('buscar'), s, '', 'Sugerencia'));
  items = [...filasPropias, ...filasSug, ...filasMotor];
  primeraGoogle = filasPropias.length + filasSug.length;
  sugerencias.replaceChildren(...(filasPropias.length ? [...filasPropias, crear('div', 'separador')] : []), ...filasSug, ...filasMotor);
  sel = Math.max(0, items.indexOf(anterior));
  marcar();
  caja.classList.add('abierto');
}

function programarSugerencias(q) {
  clearTimeout(temporizadorSugerencias);
  const mia = ++peticion;
  if (!opciones.buscador.sugerencias || !q) return;
  temporizadorSugerencias = setTimeout(async () => {
    if (mia !== peticion || !(await tienePermiso())) return;
    const sugs = await pedirSugerencias(q);
    if (mia === peticion && caja.classList.contains('abierto')) dibujar(sugs);
  }, 200);
}

export function pintarSugerencias() {
  const q = buscar.value.trim();
  const qq = encodeURIComponent(q);
  $('#modo-ia').href = q ? GOOGLE[1].url(qq) : 'https://www.google.com/search?udm=50';
  if (!q) {
    programarSugerencias('');
    caja.classList.remove('abierto');
    sugerencias.replaceChildren();
    items = [];
    return;
  }
  const palabras = q.toLowerCase().split(/\s+/);
  filasPropias = datos.grupos
    .filter(visible)
    .flatMap(g => g.enlaces.map(e => ({ e, g, texto: `${g.nombre} ${e.nombre} ${e.url}`.toLowerCase() })))
    .filter(t => palabras.every(p => t.texto.includes(p)))
    .slice(0, 6)
    .map(({ e, g }) => fila(e.url, icono(e, g), e.nombre,
      g.zona === 'online' ? dominio(e.url) : direccion(e.url),
      g.zona === 'online' ? 'Internet' : g.nombre));
  // La primera fila busca en tu motor (o en el atajo «!clave»); Modo IA, Imágenes… siguen siendo de Google.
  const { q: consulta, destino } = resolverConsulta(buscar.value, opciones.buscador);
  filasMotor = [
    fila(destino.url, svg('buscar'), `Buscar «${consulta}» en ${destino.etiqueta}`, '', destino.etiqueta),
    ...GOOGLE.slice(1).map(o => fila(o.url(qq), svg(o.icono), o.titulo(q), '', 'Google')),
  ];
  items = [];
  sel = 0;
  dibujar([]);
  programarSugerencias(consulta === q ? q : ''); // un atajo «!clave» no se manda a Google
}

export const abrir = (url, nueva) => (nueva ? window.open(url, '_blank') : (location.href = url));

buscar.addEventListener('input', pintarSugerencias);
buscar.addEventListener('focus', pintarSugerencias);
buscar.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    buscar.value = '';
    pintarSugerencias();
    return;
  }
  if (!items.length) return;
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    marcar();
  } else if (ev.key === 'Enter') {
    // Enter abre lo marcado (tu servicio si coincide); Shift+Enter va siempre a Google.
    const destino = ev.shiftKey ? items[primeraGoogle] : items[sel];
    abrir(destino.href, ev.ctrlKey || ev.metaKey);
  }
});
sugerencias.addEventListener('mousemove', ev => {
  const i = items.indexOf(ev.target.closest('.sugerencia'));
  if (i >= 0 && i !== sel) { sel = i; marcar(); }
});
document.addEventListener('click', ev => {
  if (!caja.contains(ev.target)) caja.classList.remove('abierto');
});
export const escribiendo = el => !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

document.addEventListener('keydown', ev => {
  if (ev.key === '/' && !escribiendo(document.activeElement) && !$('dialog[open]')) {
    ev.preventDefault();
    buscar.focus();
  }
});
