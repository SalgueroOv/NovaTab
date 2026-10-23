// Modo edición: diálogos, altas y bajas, importar/exportar, restablecer y arrastrar.
import { $, $$, avisar, avisarConAccion, crear, enCampoDeTexto, ocultarAvisoAccion, limitar, nuevoId, urlSegura } from './util.js';
import { borrar, cargarDatos, claves, escribir, guardarDatos } from './almacen.js';
import { ALTO_MAXIMO, ALTO_MINIMO, ANCHO_MINIMO, CLAVE, COLUMNAS, datos, fusionar, grupo, gruposDe, normalizar, ponerDatos } from './datos.js';
import { REJILLAS, alto, bloque, colocarSinPosicion, panelDe, rejillaActiva, resolver } from './rejilla.js';
import { pintar, plegar } from './pintado.js';
import { opciones, panelTema } from './apariencia.js';
import { accionDeWidget, campo, escribirNotas, leerNotas, memoriaNotas, notasGuardadas, nuevoWidget } from './widgets.js';
import { leerIcono, refrescarCampoIcono } from './iconos.js';
import { crearHistorial } from './historial.js';
import { borrarTareas, escribirTareas, idsDeTareas, leerTareas } from './widgets/tareas-datos.js';

export let editando = false;
export let arrastre = null;
let moviendo = false; // un grupo o widget a medio mover o redimensionar

// ---------- Cambios de otras pestañas: tu edición en curso gana ----------
// Mientras hay un diálogo abierto, un arrastre o un título a medio escribir, lo que llega de fuera
// espera. Al guardar se aplica sobre lo más reciente y, en lo que se tocó aquí, gana lo de aquí.

let base = null; // los datos tal como estaban la última vez que se cargaron o guardaron
let deFuera = false; // llegó algo de otra pestaña mientras se editaba
// Guardar y recargar van uno detrás de otro: una recarga nunca lee un guardado a medias.
let cola = Promise.resolve();
const enCola = tarea => (cola = cola.catch(() => {}).then(tarea));

const ocupado = () => !!arrastre || moviendo || !!$('dialog[open]') || !!document.activeElement?.matches('[data-titulo]');

// Deshacer y rehacer: cada foto es { datos, notas } (notas por id de widget). La foto del estado anterior
// se empuja dentro de guardar(), por donde pasa todo cambio de datos.
const historial = crearHistorial(20);
const limpiarHistorial = () => { historial.limpiar(); ocultarAvisoAccion(); };
let notasUltimas = {}; // las notas tal como estaban en la última carga o guardado, y lo escrito desde entonces
let tareasUltimas = {}; // lo mismo con las listas de tareas

export const sincronizado = () => {
  base = structuredClone(datos);
  leerNotas().then(n => { notasUltimas = n; });
  leerTareas().then(t => { tareasUltimas = t; });
};

// Cada cambio de una lista de tareas cuenta aunque aún no se haya guardado (ver widgets/tareas.js).
document.addEventListener('novatab:tareas', ev => { tareasUltimas[ev.detail.id] = ev.detail.lista; });

// Lo que se escribe en una nota cuenta aunque aún no se haya guardado: si luego se borra su widget,
// deshacer la recupera con ese texto.
document.addEventListener('input', ev => {
  if (ev.target.matches?.('textarea[data-nota]')) notasUltimas[ev.target.dataset.nota] = ev.target.value;
});

export const tomarFoto = async () => ({ datos: structuredClone(datos), notas: await leerNotas(), tareas: await leerTareas() });

// Pone una foto como estado actual y la guarda sin añadirla al historial. Las notas de widgets que ya
// estaban se dejan como están (lo escrito después no se revierte); «todasLasNotas» las reescribe también.
// Solo se llama desde la cola (ver enCola).
async function aplicarDentro(foto, todasLasNotas = false) {
  const estaban = idsDeNotas(datos);
  const estabanTareas = idsDeTareas(datos);
  ponerDatos(normalizar(structuredClone(foto.datos)));
  await borrarNotas(idsDeNotas(datos));
  const reaparecen = Object.entries(foto.notas).filter(([id]) => todasLasNotas || !estaban.has(id));
  await escribirNotas(Object.fromEntries(reaparecen));
  await borrarTareas(idsDeTareas(datos));
  await escribirTareas(Object.fromEntries(Object.entries(foto.tareas || {}).filter(([id]) => todasLasNotas || !estabanTareas.has(id))));
  resolver();
  pintar();
  await guardarDentro(true);
}

export const aplicarEstado = (foto, todasLasNotas = false) => enCola(() => aplicarDentro(foto, todasLasNotas));

// Como aplicarEstado, pero el estado de ahora queda en el historial para poder deshacerlo.
export const reemplazarEstado = foto => enCola(async () => {
  historial.empujar(await tomarFoto());
  ocultarAvisoAccion();
  await aplicarDentro(foto, true);
});

// Deshace o rehace un paso. Va en la cola: dos atajos seguidos se aplican uno detrás de otro.
const pasoDeHistorial = sentido => enCola(async () => {
  const foto = historial[sentido](await tomarFoto());
  ocultarAvisoAccion();
  if (foto) await aplicarDentro(foto);
});
export const deshacerUltimo = () => pasoDeHistorial('deshacer');
export const rehacerUltimo = () => pasoDeHistorial('rehacer');

document.addEventListener('keydown', ev => {
  if (!(ev.ctrlKey || ev.metaKey) || ev.altKey) return;
  const tecla = ev.key.toLowerCase();
  const rehacer = tecla === 'y' || (tecla === 'z' && ev.shiftKey);
  const deshacer = tecla === 'z' && !ev.shiftKey;
  if (!rehacer && !deshacer) return;
  // En un campo con texto, Ctrl+Z es del campo. El buscador, vacío y con el foco al abrir la pestaña, no cuenta.
  if (enCampoDeTexto(ev.target) || ocupado()) return;
  ev.preventDefault();
  (rehacer ? rehacerUltimo : deshacerUltimo)();
});

export function cambioDeFuera() {
  if (ocupado()) deFuera = true;
  else enCola(recargar);
}

async function recargar() {
  deFuera = false;
  limpiarHistorial(); // lo ajeno ya guardado no se debe pisar al deshacer
  const d = await cargarDatos();
  if (!d) return;
  ponerDatos(normalizar(d));
  sincronizado();
  pintar();
}

// El cuerpo de guardar(), para usarlo dentro de la cola. «sinHistorial»: no apunta el estado anterior.
async function guardarDentro(sinHistorial = false) {
  if (deFuera && base) {
    deFuera = false;
    limpiarHistorial();
    const remoto = await cargarDatos();
    if (remoto) {
      ponerDatos(normalizar(fusionar(base, datos, remoto)));
      // Lo que llegó de fuera ya no es «antes de mi cambio»: deshacer solo debe revertir lo mío.
      base = structuredClone(normalizar(structuredClone(remoto)));
      resolver();
      pintar();
    }
  }
  if (!sinHistorial && base && JSON.stringify(datos) !== JSON.stringify(base)) {
    historial.empujar({ datos: base, notas: { ...notasUltimas, ...(await leerNotas()) }, tareas: { ...tareasUltimas, ...(await leerTareas()) } });
    ocultarAvisoAccion();
  }
  await guardarDatos(datos);
  sincronizado();
}

export const guardar = () => enCola(() => guardarDentro());

// Al terminar sin guardar (cancelar un diálogo, dejar un título igual) se aplica lo que llegó de fuera.
// Tras un cierre que sí guarda, el guardado ya va en la cola y deFuera está a false.
function alTerminar() {
  setTimeout(() => { if (deFuera && !ocupado()) enCola(recargar); });
}
document.addEventListener('close', alTerminar, true); // «close» no sube: se escucha en la captura
document.addEventListener('focusout', ev => { if (ev.target.matches?.('[data-titulo]')) alTerminar(); });

export async function guardarYPintar(fijo) {
  resolver(fijo);
  pintar();
  await guardar();
}

// Cancelar no es un botón de envío (así Enter en un campo guarda): cierra su diálogo sin más.
document.addEventListener('click', ev => {
  const cancelar = ev.target.closest('dialog button[data-cerrar]');
  if (cancelar) cancelar.closest('dialog').close('cancelar');
});


export function abrirDialogo(dlg, valores) {
  const form = dlg.querySelector('form');
  for (const [k, v] of Object.entries(valores)) {
    const campo = form.elements[k];
    if (campo.type === 'checkbox') campo.checked = !!v;
    else campo.value = v;
  }
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise(resolve => {
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok' ? Object.fromEntries(new FormData(form)) : null);
    }, { once: true });
  });
}

export function dialogoEnlace(titulo, valores) {
  const dlg = $('#dlg-enlace');
  dlg.querySelector('h2').textContent = titulo;
  const opciones = [['local', 'Red local'], ['online', 'Internet']].map(([zona, etiqueta]) => {
    const og = document.createElement('optgroup');
    og.label = etiqueta;
    og.append(...gruposDe(zona).map(g => new Option(g.nombre, g.id)));
    return og;
  }).filter(og => og.children.length);
  dlg.querySelector('select').replaceChildren(...opciones);
  const respuesta = abrirDialogo(dlg, valores);
  refrescarCampoIcono();
  return respuesta;
}


export function dialogoGrupo(titulo, valores) {
  const dlg = $('#dlg-grupo');
  dlg.querySelector('h2').textContent = titulo;
  return abrirDialogo(dlg, valores);
}

export async function nuevoEnlace(gid) {
  if (!datos.grupos.length) return nuevoGrupo('local');
  const r = await dialogoEnlace('Nuevo enlace', { nombre: '', url: '', grupo: gid || datos.grupos[0].id, icono: '' });
  if (!r) return;
  if (!urlSegura(r.url.trim())) return avisar('Solo direcciones http:// o https://');
  grupo(r.grupo).enlaces.push({ id: nuevoId(), nombre: r.nombre.trim(), url: r.url.trim(), icono: leerIcono(r.icono) });
  await guardarYPintar(grupo(r.grupo));
}

export async function editarEnlace(gid, eid) {
  const g = grupo(gid);
  const e = g.enlaces.find(x => x.id === eid);
  const r = await dialogoEnlace('Editar enlace', { nombre: e.nombre, url: e.url, grupo: gid, icono: e.icono ? JSON.stringify(e.icono) : '' });
  if (!r) return;
  if (!urlSegura(r.url.trim())) return avisar('Solo direcciones http:// o https://');
  e.nombre = r.nombre.trim();
  e.url = r.url.trim();
  e.icono = leerIcono(r.icono);
  if (r.grupo !== gid) {
    g.enlaces.splice(g.enlaces.indexOf(e), 1);
    grupo(r.grupo).enlaces.push(e);
  }
  await guardarYPintar(grupo(r.grupo));
}

export async function borrarEnlace(gid, eid) {
  const g = grupo(gid);
  const e = g.enlaces.find(x => x.id === eid);
  if (!confirm(`¿Borrar "${e.nombre}"?`)) return;
  g.enlaces.splice(g.enlaces.indexOf(e), 1);
  await guardarYPintar();
}

export async function nuevoGrupo(zona) {
  const r = await dialogoGrupo('Nuevo grupo', { nombre: '', zona, color: '#8a8c92', vista: 'lista', privado: false });
  if (!r) return;
  datos.grupos.push({ id: nuevoId(), nombre: r.nombre.trim(), zona: r.zona, color: r.color, privado: r.privado === 'on', vista: r.vista, pos: null, enlaces: [] });
  colocarSinPosicion(datos);
  await guardarYPintar();
}

export async function editarGrupo(gid) {
  const g = grupo(gid);
  const r = await dialogoGrupo('Editar grupo', { nombre: g.nombre, zona: g.zona, color: g.color, vista: g.vista, privado: g.privado });
  if (!r) return;
  g.nombre = r.nombre.trim();
  g.color = r.color;
  g.privado = r.privado === 'on';
  g.vista = r.vista;
  if (r.zona !== g.zona) {
    g.zona = r.zona;
    g.pos = null;
    colocarSinPosicion(datos);
  }
  await guardarYPintar(g); // el grupo editado manda: si crece, los vecinos se apartan
}

export async function borrarGrupo(gid) {
  const g = grupo(gid);
  const n = g.enlaces.length;
  if (!confirm(`¿Borrar el grupo "${g.nombre}"${n ? ` y sus ${n} enlaces` : ''}?`)) return;
  datos.grupos.splice(datos.grupos.indexOf(g), 1);
  await guardarYPintar();
  avisarConAccion('Grupo borrado', 'Deshacer', deshacerUltimo);
}

document.querySelector('.pagina').addEventListener('click', ev => {
  const plegador = ev.target.closest('[data-plegar]');
  if (plegador) return plegar(plegador.closest('.bloque').dataset.id);
  const w = ev.target.closest('.widget');
  const accionWidget = ev.target.closest('[data-accion-widget]');
  if (w && accionWidget) return accionDeWidget(accionWidget.dataset.accionWidget, w.dataset.id);
  const nuevo = ev.target.closest('[data-nuevo-grupo]');
  if (nuevo) return nuevoGrupo(nuevo.dataset.nuevoGrupo);
  const g = ev.target.closest('.grupo');
  const boton = ev.target.closest('[data-accion]');
  if (boton && g) {
    if (boton.dataset.accion === 'nuevo-enlace') nuevoEnlace(g.dataset.id);
    if (boton.dataset.accion === 'editar-grupo') editarGrupo(g.dataset.id);
    if (boton.dataset.accion === 'borrar-grupo') borrarGrupo(g.dataset.id);
    return;
  }
  const a = ev.target.closest('.enlace');
  if (a && g && editando) {
    ev.preventDefault();
    if (ev.target.closest('.borrar')) borrarEnlace(g.dataset.id, a.dataset.id);
    else editarEnlace(g.dataset.id, a.dataset.id);
  }
});

export function ponerEdicion(activo) {
  editando = activo;
  document.body.classList.toggle('editando', activo);
  $('#btn-editar').setAttribute('aria-pressed', String(activo));
  pintar();
}

$('#btn-editar').addEventListener('click', () => ponerEdicion(!editando));
$('#btn-listo').addEventListener('click', () => ponerEdicion(false));
$('#btn-nuevo-widget').addEventListener('click', () => nuevoWidget());

$('#btn-exportar').addEventListener('click', async () => {
  const copia = { ...datos, notas: await leerNotas(), tareas: await leerTareas() };
  const blob = new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'marcadores.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#btn-importar').addEventListener('click', () => $('#archivo').click());
$('#archivo').addEventListener('change', async ev => {
  const archivo = ev.target.files[0];
  ev.target.value = '';
  if (!archivo) return;
  try {
    const leido = JSON.parse(await archivo.text());
    const nuevos = normalizar(leido);
    if (!confirm('¿Reemplazar todos los enlaces por los del archivo?')) return;
    await borrarNotas(idsDeNotas(nuevos));
    await escribirNotas(leido.notas);
    await borrarTareas(idsDeTareas(nuevos));
    await escribirTareas(Object.fromEntries(Object.entries(leido.tareas || {}).filter(([id]) => idsDeTareas(nuevos).has(id))));
    ponerDatos(nuevos);
    await guardarYPintar();
    avisar('Enlaces importados');
  } catch (err) {
    avisar('No se pudo importar: ' + err.message);
  }
});

// Borra las notas guardadas cuyo widget no está en «conservar» (ids de widget); sin argumento, todas.
export async function borrarNotas(conservar = new Set()) {
  await borrar((await claves('nota:')).filter(clave => !conservar.has(clave.slice(5))));
  for (const id of [...memoriaNotas.keys()]) if (!conservar.has(id)) memoriaNotas.delete(id);
  for (const id of [...notasGuardadas.keys()]) if (!conservar.has(id)) notasGuardadas.delete(id);
}

export const idsDeNotas = d => new Set(d.widgets.filter(w => w.tipo === 'notas').map(w => w.id));

// Restablecer todo: los datos de ejemplo y ninguna nota guardada. Si no se pueden borrar las notas,
// no se cambia nada y se avisa (antes se cambiaba la memoria y el siguiente guardado lo hacía a medias).
export async function restablecerTodo() {
  try {
    await borrarNotas();
    await borrarTareas();
    await borrar(await claves('rss:')); // cachés de los feeds
  } catch (err) {
    avisar(`No se pudo restablecer: ${err.message}`);
    return;
  }
  ponerDatos(normalizar(DATOS_DEFECTO));
  await guardarYPintar();
  limpiarHistorial(); // el diálogo avisa de que no se puede deshacer
}

$('#btn-restablecer').addEventListener('click', () => {
  panelTema.hidden = true;
  $('#texto-restablecer').value = '';
  $('#confirmar-restablecer').disabled = true;
  $('#dlg-restablecer').returnValue = '';
  $('#dlg-restablecer').showModal();
});
$('#texto-restablecer').addEventListener('input', ev => {
  $('#confirmar-restablecer').disabled = ev.target.value !== 'BORRAR';
});
$('#dlg-restablecer').addEventListener('close', ev => {
  if (ev.target.returnValue === 'ok') restablecerTodo();
});

// ---------- Mover y redimensionar grupos en la rejilla (modo edición) ----------

export function medidas(rejilla) {
  const r = rejilla.getBoundingClientRect();
  const estilo = getComputedStyle(rejilla);
  const columnas = COLUMNAS[rejilla.dataset.panel];
  const huecoCol = parseFloat(estilo.columnGap) || 0;
  const filaPaso = (parseFloat(estilo.gridAutoRows) || 40) + (parseFloat(estilo.rowGap) || 0);
  return { r, columnas, huecoCol, colPaso: (r.width + huecoCol) / columnas, filaPaso };
}

// El panel (columna izquierda o derecha) que hay bajo el puntero.
export function panelBajo(x, y) {
  for (const [panel, rejilla] of Object.entries(REJILLAS)) {
    const c = rejilla.closest('.izquierda, .derecha').getBoundingClientRect();
    if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return panel;
  }
  return null;
}

document.querySelector('.pagina').addEventListener('pointerdown', ev => {
  if (!editando || !rejillaActiva() || ev.button !== 0 || !ev.target.closest('.rejilla')) return;
  const asa = ev.target.closest('.asa-ancho, .asa-esquina');
  const cab = ev.target.closest('.grupo-cab, .widget-cab');
  if ((!asa && !cab) || ev.target.closest('button')) return;
  ev.preventDefault();

  const sec = ev.target.closest('.bloque');
  const g = bloque(sec.dataset.id);
  const conAlto = asa?.classList.contains('asa-esquina');
  const origen = panelDe(g);
  const r0 = sec.getBoundingClientRect();
  const agarre = { x: ev.clientX - r0.left, y: ev.clientY - r0.top };
  const inicio = { x: ev.clientX, y: ev.clientY, pos: { ...g.pos } };
  let destinoPanel = origen;
  let destinoPos = { ...g.pos };

  const destino = crear('div', 'destino');
  destino.style.gridColumn = `${g.pos.x} / span ${g.pos.w}`;
  destino.style.gridRow = `${g.pos.y} / span ${alto(g)}`;
  REJILLAS[origen].append(destino);
  sec.classList.add('moviendo');
  moviendo = true;
  sec.setPointerCapture(ev.pointerId);

  const mover = e => {
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (asa) {
      const m = medidas(REJILLAS[origen]);
      const w = limitar(inicio.pos.w + Math.round(dx / m.colPaso), ANCHO_MINIMO[origen], m.columnas - inicio.pos.x + 1);
      destinoPos = { ...inicio.pos, w };
      if (conAlto) destinoPos.h = limitar(inicio.pos.h + Math.round(dy / m.filaPaso), ALTO_MINIMO, ALTO_MAXIMO);
      sec.style.gridColumn = `${inicio.pos.x} / span ${w}`;
      if (conAlto) sec.style.gridRow = `${inicio.pos.y} / span ${destinoPos.h}`;
    } else {
      sec.style.transform = `translate(${dx}px, ${dy}px)`;
      // Los grupos se quedan en la red local; los widgets pueden pasar de un panel a otro.
      if (g.tipo) destinoPanel = panelBajo(e.clientX, e.clientY) || destinoPanel;
      const rejilla = REJILLAS[destinoPanel];
      const m = medidas(rejilla);
      // Al cambiar de panel se conserva el ancho en píxeles, no en columnas.
      const w = destinoPanel === origen ? inicio.pos.w
        : limitar(Math.round((r0.width + m.huecoCol) / m.colPaso), ANCHO_MINIMO[destinoPanel], m.columnas);
      destinoPos = {
        ...inicio.pos,
        w,
        x: limitar(Math.round((e.clientX - agarre.x - m.r.left) / m.colPaso) + 1, 1, m.columnas - w + 1),
        y: Math.max(1, Math.round((e.clientY - agarre.y - m.r.top) / m.filaPaso) + 1),
      };
      if (destino.parentNode !== rejilla) rejilla.append(destino);
    }
    destino.style.gridColumn = `${destinoPos.x} / span ${destinoPos.w}`;
    destino.style.gridRow = `${destinoPos.y} / span ${conAlto ? destinoPos.h : alto(g)}`;
  };

  const soltar = () => {
    moviendo = false;
    sec.removeEventListener('pointermove', mover);
    sec.removeEventListener('pointerup', soltar);
    sec.removeEventListener('pointercancel', soltar);
    g.pos = destinoPos;
    if (g.tipo) g.panel = destinoPanel;
    guardarYPintar(g);
  };

  sec.addEventListener('pointermove', mover);
  sec.addEventListener('pointerup', soltar);
  sec.addEventListener('pointercancel', soltar);
});

// ---------- Arrastrar enlaces entre grupos (modo edición) ----------
// Se mueven en el DOM mientras se arrastra y al soltar se reconstruye el orden desde el DOM.

export const pagina = document.querySelector('.pagina');

pagina.addEventListener('dragstart', ev => {
  const a = ev.target.closest?.('.enlace');
  if (!editando || !a) return;
  arrastre = { el: a, horizontal: a.classList.contains('atajo') };
  ev.dataTransfer.effectAllowed = 'move';
  requestAnimationFrame(() => arrastre?.el.classList.add('arrastrando'));
});

pagina.addEventListener('dragover', ev => {
  if (!arrastre) return;
  ev.preventDefault();
  const lista = ev.target.closest('.grupo')?.querySelector('.enlaces');
  if (!lista) return;
  // Los atajos de Internet y las filas locales no se mezclan: cada uno en su zona.
  if (lista.classList.contains('atajos') !== arrastre.horizontal) return;
  const sobre = ev.target.closest('.enlace');
  if (sobre && sobre !== arrastre.el) {
    const r = sobre.getBoundingClientRect();
    // En las vistas de iconos y compacta los enlaces van en filas de varias columnas: se compara por la horizontal.
    const enRejilla = lista.classList.contains('vista-iconos') || lista.classList.contains('vista-compacta');
    const antes = arrastre.horizontal || enRejilla ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2;
    lista.insertBefore(arrastre.el, antes ? sobre : sobre.nextSibling);
  } else if (!sobre && arrastre.el.parentNode !== lista) {
    lista.insertBefore(arrastre.el, lista.querySelector('.anadir'));
  }
});

pagina.addEventListener('drop', ev => {
  if (arrastre) ev.preventDefault();
});

pagina.addEventListener('dragend', async () => {
  if (!arrastre) return;
  arrastre.el.classList.remove('arrastrando');
  arrastre = null;
  const enlaces = new Map(datos.grupos.flatMap(g => g.enlaces).map(e => [e.id, e]));
  for (const sec of $$('.grupo[data-id]')) {
    grupo(sec.dataset.id).enlaces = [...sec.querySelectorAll('.enlace')].map(a => enlaces.get(a.dataset.id));
  }
  await guardarYPintar();
});
