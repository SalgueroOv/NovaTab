// Atajos de teclado: Alt+1…Alt+9 para los primeros enlaces locales y la paleta de comandos (Ctrl+K).
import { $, avisar, crear, enCampoDeTexto } from './util.js';
import { enlacesDeAtajo, ir } from './atajos.js';
import { arrastre, editando, nuevoEnlace, nuevoGrupo, ponerEdicion } from './edicion.js';
import { datos } from './datos.js';
import { visible } from './rejilla.js';
import { CLAVE_OPCIONES, abrirEstudio, cambiarApariencia, guardarOpciones, opciones, ponerTema } from './apariencia.js';
import { todosLosTemas } from './temas.js';
import { alCambiar, cargarDatos } from './almacen.js';
import { sinTildes } from './iconos.js';
import { nuevoWidget } from './widgets.js';
import { esDemo, perfilActivo, perfilesDeLaLista } from './perfiles.js';
import { cambiarPerfil } from './perfiles-ops.js';
import { FONDOS } from './fondos.js';

document.addEventListener('keydown', ev => {
  if (!ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  const m = /^Digit([1-9])$/.exec(ev.code);
  if (!m || $('dialog[open]') || arrastre || enCampoDeTexto(ev.target)) return;
  const destino = enlacesDeAtajo()[Number(m[1]) - 1];
  if (!destino) return;
  ev.preventDefault();
  ir(destino.enlace.url);
});

// Alt+P pasa al perfil siguiente y Alt+Mayús+P al anterior (en círculo).
document.addEventListener('keydown', ev => {
  if (!ev.altKey || ev.ctrlKey || ev.metaKey || ev.key.toLowerCase() !== 'p') return;
  if ($('dialog[open]') || arrastre || enCampoDeTexto(ev.target)) return;
  const lista = perfilesDeLaLista();
  if (lista.length < 2) return;
  ev.preventDefault();
  const i = lista.findIndex(p => p.id === perfilActivo());
  const destino = lista[(i + (ev.shiftKey ? -1 : 1) + lista.length) % lista.length];
  cambiarPerfil(destino.id).catch(err => avisar(err.message));
});

// ---------- Paleta de comandos (Ctrl+K) ----------

// Los grupos, en este orden; el de Perfiles enseña su atajo.
const GRUPOS = ['Perfiles', 'Vista', 'Servicios', 'Internet', 'Aspecto', 'Datos', 'En otros perfiles'];
const ATAJO_GRUPO = { Perfiles: 'Alt P' };
const iniciales = nombre => nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '·';

const deEnlace = (e, g, extra = {}) => ({
  id: `abrir:${e.id}`,
  titulo: `Abrir: ${e.nombre}`,
  detalle: g.nombre,
  grupo: g.zona === 'online' ? 'Internet' : 'Servicios',
  inicial: iniciales(e.nombre),
  url: e.url,
  ejecutar: () => ir(e.url),
  ...extra,
});

// Los comandos de ahora mismo. Con «siguiente», al ejecutarlo la paleta pide un segundo paso.
export function comandos() {
  const conAtajo = new Map(enlacesDeAtajo().map(({ enlace }, i) => [enlace.id, `Alt ${i + 1}`]));
  const enlaces = datos.grupos.filter(visible).flatMap(g => g.enlaces.map(e => deEnlace(e, g, { atajo: conAtajo.get(e.id) })));
  const lista = [
    ...enlaces,
    { id: 'reunion', grupo: 'Vista', titulo: `Modo reunión: ${esDemo() ? 'desactivar' : 'activar'}`, ejecutar: () => $('#btn-reunion').click() },
    ...todosLosTemas().map(t => ({ id: `tema:${t.id}`, grupo: 'Aspecto', muestra: t, titulo: `Tema: ${t.nombre}`, ejecutar: () => { ponerTema(t.id); guardarOpciones(); } })),
    ...perfilesDeLaLista().map(p => ({
      id: `perfil:${p.id}`,
      grupo: 'Perfiles',
      perfil: p.id,
      titulo: `Perfil: ${p.nombre}${p.id === perfilActivo() ? ' (actual)' : ''}`,
      ejecutar: () => { if (p.id !== perfilActivo()) cambiarPerfil(p.id).catch(err => avisar(err.message)); },
    })),
    { id: 'grupo', grupo: 'Servicios', titulo: 'Nuevo grupo', ejecutar: () => { ponerEdicion(true); nuevoGrupo('local'); } },
    {
      id: 'enlace',
      grupo: 'Servicios',
      titulo: 'Nuevo enlace…',
      siguiente: () => datos.grupos.filter(visible).map(g => ({ id: `en:${g.id}`, titulo: `Grupo: ${g.nombre}`, ejecutar: () => { ponerEdicion(true); nuevoEnlace(g.id); } })),
    },
    { id: 'widget', grupo: 'Servicios', titulo: 'Nuevo widget', ejecutar: () => { ponerEdicion(true); nuevoWidget(); } },
    ...[['izq', 'izquierdo'], ['der', 'derecho']].map(([panel, nombre]) => ({
      id: `panel:${panel}`,
      grupo: 'Vista',
      titulo: `${opciones.ocultos[panel] ? 'Mostrar' : 'Ocultar'} panel ${nombre}`,
      ejecutar: () => $(`#btn-panel-${panel}`).click(),
    })),
    { id: 'editar', grupo: 'Vista', titulo: `Editar: ${editando ? 'desactivar' : 'activar'}`, ejecutar: () => ponerEdicion(!editando) },
    { id: 'personalizar', grupo: 'Aspecto', titulo: 'Personalizar', ejecutar: () => abrirEstudio() },
    ...Object.entries(FONDOS).concat([['liso', { nombre: 'Liso' }]]).map(([id, f]) => ({
      id: `fondo:${id}`, grupo: 'Aspecto', titulo: `Fondo: ${f.nombre}`, ejecutar: () => $(`#muestras-fondo [data-fondo="${id}"]`)?.click(),
    })),
    ...[['quieto', 'Quieto'], ['lento', 'Lento'], ['vivo', 'Vivo']].map(([m, nombre]) => ({
      id: `movimiento:${m}`, grupo: 'Aspecto', titulo: `Movimiento del fondo: ${nombre}`, ejecutar: () => cambiarApariencia({ movimiento: m }),
    })),
    { id: 'otro-terreno', grupo: 'Aspecto', titulo: 'Generar otro terreno', ejecutar: () => $('#otro-terreno').click() },
    { id: 'exportar', grupo: 'Datos', titulo: 'Exportar copia', ejecutar: () => $('#btn-exportar').click() },
    { id: 'importar', grupo: 'Datos', titulo: 'Importar copia', ejecutar: () => $('#btn-importar').click() },
    { id: 'importar-marcadores', grupo: 'Datos', titulo: 'Importar marcadores de Chrome', ejecutar: () => $('#btn-importar-marcadores').click() },
  ];
  return lista;
}

// Los enlaces de los demás perfiles (sin los privados mientras se está en Demo). Se leen al abrir la paleta y se
// guardan en memoria hasta que algo cambie en el almacén.
const otros = new Map();
async function enlacesDeOtrosPerfiles() {
  const lista = [];
  for (const p of perfilesDeLaLista().filter(p => p.id !== perfilActivo())) {
    if (!otros.has(p.id)) otros.set(p.id, await cargarDatos(p.id).catch(() => null));
    for (const g of otros.get(p.id)?.grupos ?? []) {
      if (esDemo() && g.privado) continue;
      for (const e of g.enlaces ?? []) {
        lista.push(deEnlace(e, g, {
          id: `otro:${p.id}:${e.id}`, detalle: `${p.nombre} · ${g.nombre}`, grupo: 'En otros perfiles',
          ejecutar: () => cambiarPerfil(p.id).then(() => ir(e.url)).catch(err => avisar(err.message)),
        }));
      }
    }
  }
  return lista;
}
alCambiar(() => otros.clear());
document.addEventListener('novatab:perfil', () => otros.clear()); // lo editado en otro perfil, al volver

const paleta = $('#paleta');
const entrada = $('#paleta-texto');
const listaPaleta = $('#paleta-lista');
let disponibles = []; // los comandos del paso actual
let visibles = []; // los que pasan el filtro, en el orden en que se ven
let marcado = 0;
let focoAnterior = null;
let pasoPrincipal = true;

// Cada palabra tiene que estar en el texto; si no está seguida, vale con sus letras en orden (desde 3 letras y
// cerca unas de otras: como mucho el doble de su largo), pero puntúa peor. Devuelve la puntuación (menos es mejor) y las posiciones encontradas, o null.
function puntuar(texto, palabras) {
  let puntos = 0;
  const marcas = new Set();
  for (const p of palabras) {
    const i = texto.indexOf(p);
    if (i >= 0) {
      puntos += i === 0 || texto[i - 1] === ' ' ? 0 : 1;
      for (let k = 0; k < p.length; k++) marcas.add(i + k);
      continue;
    }
    if (p.length < 3) return null;
    let desde = 0, primera = -1, ultima = -1;
    for (const letra of p) {
      const j = texto.indexOf(letra, desde);
      if (j < 0) return null;
      if (primera < 0) primera = j;
      marcas.add(j);
      ultima = j;
      desde = j + 1;
    }
    if (ultima - primera + 1 > p.length * 2) return null;
    puntos += 5 + (ultima - primera + 1 - p.length);
  }
  return { puntos, marcas };
}

// El título con las letras encontradas resaltadas (nodos de texto: nada del nombre se interpreta como HTML).
function tituloResaltado(titulo, marcas) {
  const span = crear('span', 'p-titulo');
  let tramo = '', dentro = false;
  const cerrar = () => {
    if (!tramo) return;
    span.append(dentro ? crear('mark', null, tramo) : document.createTextNode(tramo));
    tramo = '';
  };
  [...titulo].forEach((letra, i) => {
    if (marcas.has(i) !== dentro) { cerrar(); dentro = !dentro; }
    tramo += letra;
  });
  cerrar();
  return span;
}

// Con la búsqueda vacía, una selección corta: perfiles, vista, Personalizar y los cinco primeros enlaces.
function seleccionCorta() {
  const enlaces = disponibles.filter(c => c.url && !c.id.startsWith('otro:')).slice(0, 5);
  return disponibles.filter(c => c.grupo === 'Perfiles' || c.grupo === 'Vista' || c.id === 'personalizar' || enlaces.includes(c));
}

function figura(c) {
  if (c.perfil) {
    const lienzo = crear('canvas', 'mini-perfil p-figura');
    lienzo.dataset.perfil = c.perfil;
    return lienzo;
  }
  if (c.muestra) {
    const m = crear('span', 'p-figura p-muestra');
    m.style.setProperty('--m-bg', c.muestra.bg);
    m.style.setProperty('--m-acento', c.muestra.acento);
    return m;
  }
  if (c.inicial) return crear('span', 'p-figura p-inicial', c.inicial);
  return null;
}

function opcion(c, marcas) {
  const el = crear('div', 'p-opcion');
  el.setAttribute('role', 'option');
  const f = figura(c);
  if (f) { f.setAttribute('aria-hidden', 'true'); el.append(f); }
  el.append(tituloResaltado(c.titulo, marcas));
  if (c.detalle) el.append(crear('span', 'p-detalle', c.detalle));
  if (c.atajo) el.append(crear('kbd', 'p-atajo', c.atajo));
  el.addEventListener('click', ev => ejecutarComando(c, ev.ctrlKey || ev.metaKey));
  return el;
}

function pintarPaleta() {
  const palabras = sinTildes(entrada.value.toLowerCase()).split(/\s+/).filter(Boolean);
  const encontrados = (palabras.length ? disponibles : (pasoPrincipal ? seleccionCorta() : disponibles))
    .map((c, orden) => ({ c, orden, ...(puntuar(sinTildes(`${c.titulo} ${c.detalle || ''}`.toLowerCase()), palabras) ?? { puntos: null }) }))
    .filter(r => r.puntos !== null)
    .sort((a, b) => a.puntos - b.puntos || a.orden - b.orden);
  // Agrupados: primero el grupo del mejor resultado. Los del segundo paso no tienen grupo y van seguidos.
  const porGrupo = new Map();
  for (const r of encontrados) {
    const g = r.c.grupo ?? '';
    if (!porGrupo.has(g)) porGrupo.set(g, []);
    porGrupo.get(g).push(r);
  }
  // Con la búsqueda vacía, los grupos en su orden de siempre.
  if (!palabras.length) {
    const orden = [...porGrupo].sort(([a], [b]) => GRUPOS.indexOf(a) - GRUPOS.indexOf(b));
    porGrupo.clear();
    for (const [g, filas] of orden) porGrupo.set(g, filas);
  }
  const ordenados = [...porGrupo.values()].flat();
  visibles = ordenados.map(r => r.c);
  marcado = Math.min(marcado, Math.max(0, visibles.length - 1));
  if (!visibles.length) {
    listaPaleta.replaceChildren(crear('li', 'p-vacio', 'Sin resultados'));
    return;
  }
  let n = 0;
  listaPaleta.replaceChildren(...[...porGrupo].map(([nombre, filas], i) => {
    const li = crear('li', 'p-grupo');
    li.setAttribute('role', 'group');
    if (nombre) {
      const cab = crear('div', 'p-cab', nombre);
      cab.id = `p-cab-${i}`;
      if (ATAJO_GRUPO[nombre]) cab.append(crear('kbd', 'p-atajo', ATAJO_GRUPO[nombre]));
      li.setAttribute('aria-labelledby', cab.id);
      li.append(cab);
    }
    for (const r of filas) {
      const el = opcion(r.c, r.marcas ?? new Set());
      el.setAttribute('aria-selected', String(n++ === marcado));
      li.append(el);
    }
    return li;
  }));
  // Import diferido: selector-perfiles depende de la isla, que depende de este módulo.
  const lienzos = listaPaleta.querySelectorAll('canvas[data-perfil]');
  if (lienzos.length) import('./selector-perfiles.js').then(m => lienzos.forEach(l => m.pintarMini(l, l.dataset.perfil)));
  listaPaleta.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}

// La paleta se abre sobre la isla, con su mismo ancho (al menos 560 px, o la ventana menos 24 px).
function colocarPaleta() {
  const r = $('#isla').getBoundingClientRect();
  const ancho = Math.max(r.width, Math.min(560, innerWidth - 24));
  const izquierda = r.width ? Math.min(Math.max(12, r.left + (r.width - ancho) / 2), innerWidth - 12 - ancho) : (innerWidth - ancho) / 2;
  paleta.style.setProperty('--p-ancho', `${ancho}px`);
  paleta.style.setProperty('--p-izq', `${izquierda}px`);
  paleta.style.setProperty('--p-arriba', `${r.width && r.top >= 0 ? r.top : 12}px`);
}

export function abrirPaleta() {
  document.dispatchEvent(new Event('novatab:paleta')); // la isla cierra su menú de perfiles
  focoAnterior = document.activeElement;
  disponibles = comandos();
  pasoPrincipal = true;
  entrada.value = '';
  marcado = 0;
  colocarPaleta();
  pintarPaleta();
  paleta.showModal();
  entrada.focus();
  enlacesDeOtrosPerfiles().then(lista => {
    if (!paleta.open || !pasoPrincipal || !lista.length) return;
    disponibles = [...disponibles, ...lista];
    pintarPaleta();
  });
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
    pasoPrincipal = false;
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
// Clic fuera de la paleta (en el velo): cierra.
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
