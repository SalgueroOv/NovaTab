// Atajos de teclado: Alt+1…Alt+9 para los primeros enlaces locales y la paleta de comandos (Ctrl+K).
import { $, avisar, crear, enCampoDeTexto } from './util.js';
import { enlacesDeAtajo, ir } from './atajos.js';
import { arrastre, editando, nuevoEnlace, nuevoGrupo, ponerEdicion } from './edicion.js';
import { datos } from './datos.js';
import { visible } from './rejilla.js';
import { CLAVE_OPCIONES, TEMAS, muestras, opciones } from './apariencia.js';
import { alCambiar } from './almacen.js';
import { sinTildes } from './iconos.js';
import { nuevoWidget } from './widgets.js';
import { perfilActivo, perfilesDeLaLista } from './perfiles.js';
import { cambiarPerfil } from './perfiles-ops.js';

document.addEventListener('keydown', ev => {
  if (!ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  const m = /^Digit([1-9])$/.exec(ev.code);
  if (!m || $('dialog[open]') || arrastre || enCampoDeTexto(ev.target)) return;
  const destino = enlacesDeAtajo()[Number(m[1]) - 1];
  if (!destino) return;
  ev.preventDefault();
  ir(destino.enlace.url);
});

// ---------- Paleta de comandos (Ctrl+K) ----------

// Los comandos de ahora mismo. Con «siguiente», al ejecutarlo la paleta pide un segundo paso.
export function comandos() {
  const enlaces = datos.grupos.filter(visible).flatMap(g => g.enlaces.map(e => ({
    id: `abrir:${e.id}`,
    titulo: `Abrir: ${e.nombre}`,
    detalle: g.nombre,
    url: e.url,
    ejecutar: () => ir(e.url),
  })));
  const lista = [
    ...enlaces,
    { id: 'reunion', titulo: `Modo reunión: ${opciones.reunion ? 'desactivar' : 'activar'}`, ejecutar: () => $('#btn-reunion').click() },
    ...TEMAS.map(t => ({ id: `tema:${t.id}`, titulo: `Tema: ${t.nombre}`, ejecutar: () => muestras.find(m => m.dataset.tema === t.id).click() })),
    ...perfilesDeLaLista().map(p => ({
      id: `perfil:${p.id}`,
      titulo: `Perfil: ${p.nombre}${p.id === perfilActivo() ? ' (actual)' : ''}`,
      ejecutar: () => { if (p.id !== perfilActivo()) cambiarPerfil(p.id).catch(err => avisar(err.message)); },
    })),
    { id: 'grupo', titulo: 'Nuevo grupo', ejecutar: () => { ponerEdicion(true); nuevoGrupo('local'); } },
    {
      id: 'enlace',
      titulo: 'Nuevo enlace…',
      siguiente: () => datos.grupos.filter(visible).map(g => ({ id: `en:${g.id}`, titulo: `Grupo: ${g.nombre}`, ejecutar: () => { ponerEdicion(true); nuevoEnlace(g.id); } })),
    },
    { id: 'widget', titulo: 'Nuevo widget', ejecutar: () => { ponerEdicion(true); nuevoWidget(); } },
    ...[['izq', 'izquierdo'], ['der', 'derecho']].map(([panel, nombre]) => ({
      id: `panel:${panel}`,
      titulo: `${opciones.ocultos[panel] ? 'Mostrar' : 'Ocultar'} panel ${nombre}`,
      ejecutar: () => $(`#btn-panel-${panel}`).click(),
    })),
    { id: 'editar', titulo: `Editar: ${editando ? 'desactivar' : 'activar'}`, ejecutar: () => ponerEdicion(!editando) },
  ];
  return lista;
}

const paleta = $('#paleta');
const entrada = $('#paleta-texto');
const listaPaleta = $('#paleta-lista');
let disponibles = []; // los comandos del paso actual
let visibles = []; // los que pasan el filtro
let marcado = 0;
let focoAnterior = null;

function pintarPaleta() {
  const palabras = sinTildes(entrada.value.toLowerCase()).split(/\s+/).filter(Boolean);
  visibles = disponibles.filter(c => {
    const texto = sinTildes(`${c.titulo} ${c.detalle || ''}`.toLowerCase());
    return palabras.every(p => texto.includes(p));
  });
  marcado = Math.min(marcado, Math.max(0, visibles.length - 1));
  if (!visibles.length) {
    listaPaleta.replaceChildren(crear('li', 'p-vacio', 'Sin resultados'));
    return;
  }
  listaPaleta.replaceChildren(...visibles.map((c, i) => {
    const li = crear('li');
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === marcado));
    li.append(crear('span', 'p-titulo', c.titulo));
    if (c.detalle) li.append(crear('span', 'p-detalle', c.detalle));
    li.addEventListener('click', ev => ejecutarComando(c, ev.ctrlKey || ev.metaKey));
    return li;
  }));
  listaPaleta.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

function abrirPaleta() {
  focoAnterior = document.activeElement;
  disponibles = comandos();
  entrada.value = '';
  marcado = 0;
  pintarPaleta();
  paleta.showModal();
  entrada.focus();
}

// Cierra y devuelve el foco; después, si hace falta, el comando abre su propio diálogo.
function cerrarPaleta() {
  if (paleta.open) paleta.close();
  if (focoAnterior?.isConnected) focoAnterior.focus();
}

function ejecutarComando(c, nueva = false) {
  if (c.siguiente) {
    const siguientes = c.siguiente();
    if (!siguientes.length) {
      cerrarPaleta();
      avisar('No hay grupos todavía: crea uno primero');
      return;
    }
    disponibles = siguientes;
    entrada.value = '';
    marcado = 0;
    pintarPaleta();
    entrada.focus();
    return;
  }
  cerrarPaleta();
  if (nueva && c.url) window.open(c.url, '_blank');
  else c.ejecutar();
}

entrada.addEventListener('input', () => {
  marcado = 0;
  pintarPaleta();
});
entrada.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    if (!visibles.length) return;
    marcado = (marcado + (ev.key === 'ArrowDown' ? 1 : -1) + visibles.length) % visibles.length;
    pintarPaleta();
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    if (visibles[marcado]) ejecutarComando(visibles[marcado], ev.ctrlKey || ev.metaKey);
  }
});
// Si las opciones cambian desde otra pestaña (por ejemplo el modo reunión), la lista ya no vale: se cierra.
alCambiar(cambios => { if (paleta.open && Object.keys(cambios).some(k => k === CLAVE_OPCIONES || k.endsWith(':aspecto'))) cerrarPaleta(); });
// Clic fuera de la paleta (en el fondo oscuro): cierra.
paleta.addEventListener('click', ev => { if (ev.target === paleta) cerrarPaleta(); });
paleta.addEventListener('cancel', () => { if (focoAnterior?.isConnected) setTimeout(() => focoAnterior.focus()); });

document.addEventListener('keydown', ev => {
  if (!(ev.ctrlKey || ev.metaKey) || ev.altKey || ev.shiftKey || ev.key.toLowerCase() !== 'k') return;
  if (paleta.open) {
    ev.preventDefault();
    cerrarPaleta();
  } else if (!$('dialog[open]')) {
    ev.preventDefault();
    abrirPaleta();
  }
});
