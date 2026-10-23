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
  // getKeys (Chrome 130+) no trae los valores: así no se copia la imagen de fondo en cada guardado.
  for (const area of [chrome.storage.sync, chrome.storage.local]) todas.push(...(area.getKeys ? await area.getKeys() : Object.keys(await area.get(null))));
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

// Una clave solo está en local cuando su última escritura en sync falló: esa copia es la más reciente.
export async function leer(clave) {
  if (!hayChrome) {
    try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
  }
  const l = await chrome.storage.local.get(clave);
  if (l[clave] != null) return l[clave];
  const s = await chrome.storage.sync.get(clave);
  return s[clave] ?? null;
}

const ESPERA_REINTENTO = 60 * 1000;
// Claves que no caben en sync y viven solo en este equipo.
export const clavesSoloLocal = new Set();
const pendientes = new Set();
let reintento = null;
let avisadoCuota = false;

// Sync admite 8 KB por clave y unas 120 escrituras por minuto. Si se pasa de tamaño, la clave se queda
// en este equipo (se avisa una vez); si se pasa de ritmo, se guarda en local y se reintenta al minuto.
export async function escribir(clave, valor) {
  if (!hayChrome) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
    return;
  }
  try {
    await chrome.storage.sync.set({ [clave]: valor });
    pendientes.delete(clave);
    clavesSoloLocal.delete(clave);
    await chrome.storage.local.remove(clave);
  } catch (err) {
    await chrome.storage.local.set({ [clave]: valor });
    if (String(err?.message).includes('MAX_WRITE_OPERATIONS')) {
      pendientes.add(clave);
      reintento ??= setTimeout(reintentarPendientes, ESPERA_REINTENTO);
      return;
    }
    // Demasiado grande para sincronizar: la copia de sync ya no vale para los demás equipos.
    clavesSoloLocal.add(clave);
    await chrome.storage.sync.remove(clave).catch(() => {});
    if (!avisadoCuota) {
      avisadoCuota = true;
      avisar('Demasiados datos para sincronizar: guardado solo en este equipo');
    }
  }
}

// Vuelve a intentar en sync las claves que quedaron en local por el límite de escrituras.
export async function reintentarPendientes() {
  clearTimeout(reintento);
  reintento = null;
  for (const clave of [...pendientes]) {
    const valor = (await chrome.storage.local.get(clave))[clave];
    if (valor == null) {
      pendientes.delete(clave);
      continue;
    }
    await escribir(clave, valor);
  }
}

// ---------- Formato v4 ----------
// «datos» guarda la estructura (grupos sin enlaces, widgets y títulos) y «grupo:<id>», los enlaces de cada
// grupo: cada cambio escribe solo lo que toca y ninguna clave se acerca a los 8 KB de sync.

export const claveDatos = perfil => `perfil:${perfil}:datos`;
export const claveAspecto = perfil => `perfil:${perfil}:aspecto`;
const claveGrupo = id => `grupo:${id}`;
// Lo último escrito o leído de cada clave (en JSON): lo que no cambió no se reescribe, y un aviso de
// cambio con ese mismo valor es el eco de una escritura propia.
const ultimo = new Map();

// Los ecos llegan con retraso: si se guarda dos veces seguidas, el eco de la primera llega cuando «ultimo»
// ya es la segunda. Por eso lo escrito se recuerda también unos segundos.
const propios = new Set();
const ESPERA_ECO = 10 * 1000;

export function recordar(clave, valor) {
  if (valor === undefined) {
    ultimo.delete(clave);
    return;
  }
  const json = JSON.stringify(valor);
  ultimo.set(clave, json);
  const entrada = `${clave}
${json}`;
  propios.add(entrada);
  setTimeout(() => propios.delete(entrada), ESPERA_ECO);
}

export const esLoUltimo = (clave, valor) => {
  if (valor === undefined) return !ultimo.has(clave);
  const json = JSON.stringify(valor);
  return ultimo.get(clave) === json || propios.has(`${clave}
${json}`);
};

// Devuelve los datos con los enlaces dentro de cada grupo. Si están en un formato anterior (v1-v3, todo
// en «datos»), los devuelve tal cual para que el arranque los migre.
// Los ids de los grupos que tiene cada perfil según lo último leído o guardado: al guardar solo se borran los
// grupos que este perfil tenía y ya no tiene (los de otros perfiles no se tocan).
const gruposDelPerfil = new Map();
// Con la migración fallida no se escribe en las claves nuevas (ver perfiles.js).
let bloqueado = null;
export const bloquearGuardado = motivo => { bloqueado = motivo; };

export async function cargarDatos(perfil) {
  const d = await leer(claveDatos(perfil));
  if (!d) return null;
  if ((d.version || 1) < 4) return d;
  recordar(claveDatos(perfil), d);
  gruposDelPerfil.set(perfil, new Set((d.grupos || []).map(g => claveGrupo(g.id))));
  const grupos = await Promise.all((d.grupos || []).map(async g => {
    const enlaces = (await leer(claveGrupo(g.id))) || [];
    recordar(claveGrupo(g.id), enlaces);
    return { ...g, enlaces };
  }));
  return { ...d, grupos };
}

// Escribe primero los grupos que cambiaron, luego la estructura y por último borra los grupos que ya no
// existen: si algo falla a medias, la estructura anterior sigue apuntando a grupos que existen.
// Cada valor se recuerda antes de escribirlo: el aviso de cambio puede llegar antes de que acabe la
// escritura, y así se reconoce como eco propio.
export async function guardarDatos(datos, perfil) {
  if (bloqueado) {
    avisar(bloqueado);
    return;
  }
  const CLAVE_DATOS = claveDatos(perfil);
  const porGrupo = new Map(datos.grupos.map(g => [claveGrupo(g.id), g.enlaces]));
  const estructura = { ...datos, grupos: datos.grupos.map(({ enlaces, ...resto }) => resto) };
  for (const [clave, enlaces] of porGrupo) {
    if (esLoUltimo(clave, enlaces)) continue;
    recordar(clave, enlaces);
    await escribir(clave, enlaces);
  }
  if (!esLoUltimo(CLAVE_DATOS, estructura)) {
    recordar(CLAVE_DATOS, estructura);
    await escribir(CLAVE_DATOS, estructura);
  }
  const sobran = [...(gruposDelPerfil.get(perfil) ?? [])].filter(clave => !porGrupo.has(clave));
  gruposDelPerfil.set(perfil, new Set(porGrupo.keys()));
  if (sobran.length) {
    sobran.forEach(clave => recordar(clave, undefined));
    await borrar(sobran);
  }
}
