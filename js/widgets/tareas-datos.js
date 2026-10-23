// Los datos del widget «Tareas»: una lista por widget en su propia clave de sync (como las notas), para no
// llenar la clave de la estructura. Sin dependencias de widgets.js: lo usan edicion.js y copias.js.
import { borrar, claves, escribir, leer } from '../almacen.js';
import { datos } from '../datos.js';

export const MAX_TAREAS = 40;
export const MAX_TEXTO = 120;
// Sync admite 8 KB por clave (con el nombre de la clave): se deja margen. Con texto multibyte (tildes,
// CJK, emoji) 40 tareas de 120 caracteres pasarían de largo, así que el límite real es el tamaño.
export const MAX_BYTES = 7000;
export const bytesDe = lista => new TextEncoder().encode(JSON.stringify(lista)).length;
export const idCorto = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
export const claveTareas = id => `tareas:${id}`;
export const memoriaTareas = new Map(); // id del widget → lista en pantalla (puede ir por delante de lo guardado)
export const idsDeTareas = d => new Set(d.widgets.filter(w => w.tipo === 'tareas').map(w => w.id));

// Solo tareas con texto, recortadas a 120 caracteres y como mucho 40; lo demás se descarta.
export function normalizarTareas(v) {
  const salida = [];
  const vistos = new Set();
  for (const t of Array.isArray(v) ? v : []) {
    if (!t || typeof t.texto !== 'string') continue;
    const texto = t.texto.trim().slice(0, MAX_TEXTO);
    if (!texto) continue;
    // Un id repetido haría que marcar o borrar una tarea afectara a todas las que lo comparten.
    let id = typeof t.id === 'string' && t.id ? t.id.slice(0, 40) : idCorto();
    while (vistos.has(id)) id = idCorto();
    vistos.add(id);
    const nueva = { id, texto, hecha: t.hecha === true };
    if (salida.length >= MAX_TAREAS || bytesDe([...salida, nueva]) > MAX_BYTES) break;
    salida.push(nueva);
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
