// El buscador: tus enlaces primero y Google después.
import { $, crear, direccion, dominio, svg } from './util.js';
import { datos } from './datos.js';
import { visible } from './rejilla.js';
import { icono } from './pintado.js';
import { opciones } from './apariencia.js';
import { resolverConsulta } from './motores.js';

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

export function pintarSugerencias() {
  const q = buscar.value.trim();
  const qq = encodeURIComponent(q);
  $('#modo-ia').href = q ? GOOGLE[1].url(qq) : 'https://www.google.com/search?udm=50';
  if (!q) {
    caja.classList.remove('abierto');
    sugerencias.replaceChildren();
    items = [];
    return;
  }
  const palabras = q.toLowerCase().split(/\s+/);
  const propios = datos.grupos
    .filter(visible)
    .flatMap(g => g.enlaces.map(e => ({ e, g, texto: `${g.nombre} ${e.nombre} ${e.url}`.toLowerCase() })))
    .filter(t => palabras.every(p => t.texto.includes(p)))
    .slice(0, 6)
    .map(({ e, g }) => fila(e.url, icono(e, g), e.nombre,
      g.zona === 'online' ? dominio(e.url) : direccion(e.url),
      g.zona === 'online' ? 'Internet' : g.nombre));
  // La primera fila busca en tu motor (o en el atajo «!clave»); Modo IA, Imágenes… siguen siendo de Google.
  const { q: consulta, destino } = resolverConsulta(buscar.value, opciones.buscador);
  const filaMotor = fila(destino.url, svg('buscar'), `Buscar «${consulta}» en ${destino.etiqueta}`, '', destino.etiqueta);
  const deGoogle = [filaMotor, ...GOOGLE.slice(1).map(o => fila(o.url(qq), svg(o.icono), o.titulo(q), '', 'Google'))];
  items = [...propios, ...deGoogle];
  primeraGoogle = propios.length;
  sugerencias.replaceChildren(...(propios.length ? [...propios, crear('div', 'separador'), ...deGoogle] : deGoogle));
  sel = 0;
  marcar();
  caja.classList.add('abierto');
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
