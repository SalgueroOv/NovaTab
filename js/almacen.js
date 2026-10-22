// Todo el acceso a chrome.storage (o a localStorage cuando la página se abre fuera de la extensión).
import { avisar } from './util.js';

export const hayChrome = typeof chrome !== 'undefined' && !!chrome.storage;

// En la extensión: chrome.storage.sync (se sincroniza con tu cuenta de Chrome).
// Abierto como archivo suelto: localStorage.

// Avisa de los cambios guardados desde otra pestaña u otro equipo: fn({ clave: { newValue } }).
// Fuera de la extensión no hay otras pestañas que escuchar.
export function alCambiar(fn) {
  if (hayChrome) chrome.storage.onChanged.addListener(fn);
}

// Solo en este equipo (cachés como la del tiempo): chrome.storage.local o localStorage.
export async function leerLocal(clave) {
  if (hayChrome) return (await chrome.storage.local.get(clave))[clave] ?? null;
  try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
}

export async function escribirLocal(clave, valor) {
  if (hayChrome) return chrome.storage.local.set({ [clave]: valor });
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
}

// Las claves guardadas que empiezan por «prefijo», en sync y en local.
export async function claves(prefijo) {
  if (!hayChrome) return Object.keys(localStorage).filter(k => k.startsWith(prefijo));
  const todas = [];
  for (const area of [chrome.storage.sync, chrome.storage.local]) todas.push(...Object.keys(await area.get(null)));
  return [...new Set(todas)].filter(k => k.startsWith(prefijo));
}

// Borra las claves de los dos almacenes. Si falla, lanza el error (quien llama decide qué hacer).
export async function borrar(lista) {
  if (!lista.length) return;
  if (!hayChrome) {
    for (const clave of lista) localStorage.removeItem(clave);
    return;
  }
  await chrome.storage.sync.remove(lista);
  await chrome.storage.local.remove(lista);
}

export async function leer(clave) {
  if (!hayChrome) {
    try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
  }
  const s = await chrome.storage.sync.get(clave);
  if (s[clave] != null) return s[clave];
  const l = await chrome.storage.local.get(clave);
  return l[clave] ?? null;
}

export async function escribir(clave, valor) {
  if (!hayChrome) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
    return;
  }
  try {
    await chrome.storage.sync.set({ [clave]: valor });
    await chrome.storage.local.remove(clave);
  } catch {
    // sync admite 8 KB por elemento; si se supera, se guarda solo en este equipo.
    await chrome.storage.local.set({ [clave]: valor });
    await chrome.storage.sync.remove(clave);
    avisar('Demasiados datos para sincronizar: guardado solo en este equipo');
  }
}
