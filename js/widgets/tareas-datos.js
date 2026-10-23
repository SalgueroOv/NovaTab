// Los datos del widget «Tareas»: una lista por widget en su propia clave de sync (como las notas), para no
// llenar la clave de la estructura. Sin dependencias de widgets.js: lo usan edicion.js y copias.js.
import { nuevoId } from '../util.js';
import { borrar, claves, escribir, leer } from '../almacen.js';
import { datos } from '../datos.js';

export const MAX_TAREAS = 40;
export const MAX_TEXTO = 120;
export const claveTareas = id => `tareas:${id}`;
export const memoriaTareas = new Map(); // id del widget → lista en pantalla (puede ir por delante de lo guardado)
export const idsDeTareas = d => new Set(d.widgets.filter(w => w.tipo === 'tareas').map(w => w.id));

// Solo tareas con texto, recortadas a 120 caracteres y como mucho 40; lo demás se descarta.
export function normalizarTareas(v) {
  const salida = [];
  for (const t of Array.isArray(v) ? v : []) {
    if (!t || typeof t.texto !== 'string') continue;
    const texto = t.texto.trim().slice(0, MAX_TEXTO);
    if (!texto) continue;
    salida.push({ id: typeof t.id === 'string' && t.id ? t.id.slice(0, 40) : nuevoId(), texto, hecha: t.hecha === true });
    if (salida.length >= MAX_TAREAS) break;
  }
  return salida;
}

// Avisa a quien pinte la lista (el widget) y a edicion.js (que guarda lo último para deshacer).
export const notificarTareas = (id, lista) => document.dispatchEvent(new CustomEvent('novatab:tareas', { detail: { id, lista } }));

// Las listas con tareas de los widgets que existen: { idDelWidget: [...] }.
export async function leerTareas() {
  const mapa = {};
  for (const id of idsDeTareas(datos)) {
    const lista = memoriaTareas.get(id) ?? normalizarTareas(await leer(claveTareas(id)));
    if (lista.length) mapa[id] = lista;
  }
  return mapa;
}

export async function escribirTareas(mapa) {
  if (!mapa || typeof mapa !== 'object') return;
  for (const [id, v] of Object.entries(mapa)) {
    const lista = normalizarTareas(v);
    memoriaTareas.set(id, lista);
    await escribir(claveTareas(id), lista);
    notificarTareas(id, lista);
  }
}

// Borra las listas cuyo widget no está en «conservar» (ids de widget); sin argumento, todas.
export async function borrarTareas(conservar = new Set()) {
  await borrar((await claves('tareas:')).filter(clave => !conservar.has(clave.slice(7))));
  for (const id of [...memoriaTareas.keys()]) if (!conservar.has(id)) memoriaTareas.delete(id);
}

export function borrarUna(id) {
  memoriaTareas.delete(id);
  borrar([claveTareas(id)]).catch(() => { /* la clave huérfana se limpiará al restablecer o importar */ });
}
