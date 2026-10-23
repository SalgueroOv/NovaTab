// Perfiles: el registro (en sync), el perfil activo de este equipo (en local) y la migración desde la versión 4.
import { borrar, claveAspecto, claveDatos, claveGrupo, claves, escribir, escribirLocal, leer, leerLocal, recordar } from './almacen.js';

export const CLAVE_REGISTRO = 'perfiles';
export const CLAVE_ACTIVO = 'perfil-activo';
export const CLAVE_ANTERIOR = 'perfil-anterior';
export const CLAVE_RESPALDO = 'respaldo-v4';
export const PRINCIPAL = 'principal';
export const MAX_PERFILES = 8;
export const MAX_NOMBRE = 30;
export { claveAspecto, claveDatos };

let registro = null;
let activo = PRINCIPAL;
// Si la migración falla, se sigue mostrando lo antiguo pero no se guarda nada en las claves nuevas.
export let migracionFallida = false;

export const perfilesDeLaLista = () => registro?.lista ?? [];
export const perfilActivo = () => activo;
export const esDemo = () => !!registro?.lista.find(p => p.id === activo)?.demo;
// Hay perfiles con los que trabajar (la migración terminó bien).
export const perfilesListos = () => !migracionFallida && !!registro?.lista.length;

// Un registro bien formado (1 a 8 perfiles con id y nombre, un solo Demo), o null.
export function normalizarRegistro(r) {
  if (!r || typeof r !== 'object' || !Array.isArray(r.lista)) return null;
  const vistos = new Set();
  const lista = [];
  let hayDemo = false;
  for (const p of r.lista) {
    if (!p || typeof p.id !== 'string' || !p.id || vistos.has(p.id) || lista.length >= MAX_PERFILES) continue;
    const nombre = typeof p.nombre === 'string' ? p.nombre.trim().slice(0, MAX_NOMBRE) : '';
    if (!nombre) continue;
    vistos.add(p.id);
    const demo = p.demo === true && !hayDemo;
    hayDemo ||= demo;
    lista.push({ id: p.id, nombre, ...(demo ? { demo: true } : {}) });
  }
  return lista.length ? { version: 5, lista } : null;
}

export const leerRegistro = async () => normalizarRegistro(await leer(CLAVE_REGISTRO));

export async function guardarRegistro(r) {
  registro = r;
  recordar(CLAVE_REGISTRO, r);
  await escribir(CLAVE_REGISTRO, r);
}

// Cambia el perfil activo solo en memoria (sin esperas: se hace justo al poner sus datos); persistirlo es aparte.
export const fijarActivo = id => { activo = id; };
export const recordarActivo = id => escribirLocal(CLAVE_ACTIVO, id);
export async function ponerPerfilActivo(id) {
  activo = id;
  await recordarActivo(id);
}

// El perfil activo de este equipo: el recordado si todavía existe; si no, el primero de la lista.
async function elegirActivo() {
  const guardado = await leerLocal(CLAVE_ACTIVO);
  activo = registro.lista.some(p => p.id === guardado) ? guardado : registro.lista[0].id;
}

// El aspecto de un perfil, a partir de lo que guardaba la versión 4 en «tema» y «opciones».
export function aspectoDeLegado(tema, opciones) {
  const o = opciones && typeof opciones === 'object' ? opciones : {};
  const aspecto = {};
  if (typeof tema === 'string') aspecto.tema = tema;
  for (const k of ['sobrio', 'fondoGrupos', 'ocultos', 'anchoIzq', 'apariencia']) if (o[k] !== undefined) aspecto[k] = o[k];
  return aspecto;
}

const mismo = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Los ids de los perfiles que tienen su estructura guardada, estén o no en el registro.
async function idsConDatos() {
  const ids = [];
  for (const clave of await claves('perfil:')) {
    const m = /^perfil:([^:]+):datos$/.exec(clave);
    if (m) ids.push(m[1]);
  }
  return ids;
}

const nombreDeRescate = id => (id === 'demo' ? 'Demo' : id === PRINCIPAL ? 'Principal' : `Perfil ${id.slice(-4)}`);
const perfilDeRescate = id => ({ id, nombre: nombreDeRescate(id), ...(id === 'demo' ? { demo: true } : {}) });

// Perfiles que existen (tienen datos) pero se han caído del registro (dos equipos que lo escribieron a la vez, o un
// equipo nuevo que arrancó antes de recibirlo): se vuelven a añadir para que nadie borre sus claves.
async function repararRegistro() {
  const conocidos = new Set(registro.lista.map(p => p.id));
  const faltan = (await idsConDatos()).filter(id => !conocidos.has(id)).slice(0, MAX_PERFILES - registro.lista.length);
  if (faltan.length) await guardarRegistro({ version: 5, lista: [...registro.lista, ...faltan.map(perfilDeRescate)] });
}

const conCerrojo = fn => (typeof navigator !== 'undefined' && navigator.locks?.request ? navigator.locks.request('novatab-migracion', fn) : fn());

// Crea el registro si no existe: desde los datos de la versión 4 (con copia de seguridad), o desde cero.
// Se ejecuta con un cerrojo (dos pestañas a la vez no migran dos veces) y el registro se escribe el último:
// mientras no exista, la siguiente apertura vuelve a intentarlo entero.
export const migrar = () => conCerrojo(migrarDentro);

async function migrarDentro() {
  const existente = await leerRegistro();
  if (existente) {
    registro = existente;
    await elegirActivo();
    await repararRegistro();
    return 'ya-estaba';
  }
  const datos = await leer('datos');
  const tema = await leer('tema');
  const opciones = await leer('opciones');
  const nuevo = { version: 5, lista: [{ id: PRINCIPAL, nombre: 'Principal' }] };
  // Perfiles ya migrados por otra pestaña u otro equipo cuyo registro todavía no ha llegado: se reconstruye.
  const ids = (await idsConDatos()).sort((a, b) => (b === PRINCIPAL) - (a === PRINCIPAL)); // principal el primero
  if (ids.length) {
    await guardarRegistro({ version: 5, lista: ids.slice(0, MAX_PERFILES).map(perfilDeRescate) });
    await elegirActivo();
    return 'ya-estaba';
  }
  const opcionesNuevas = !opciones || Object.keys(opciones).every(k => k === 'buscador');
  if (!datos && tema == null && opcionesNuevas) {
    await guardarRegistro(nuevo);
    activo = PRINCIPAL;
    return 'nuevo';
  }
  try {
    // Lo antiguo, tal cual y con sus enlaces y notas, por si hubiera que volver atrás. Solo la primera vez.
    const grupos = {};
    const notas = {};
    // Los enlaces solo van aparte desde la versión 4 (antes estaban dentro de cada grupo); las notas, desde siempre.
    if (datos && (datos.version || 1) >= 4) for (const g of datos.grupos ?? []) grupos[g.id] = await leer(`grupo:${g.id}`);
    for (const w of datos?.widgets ?? []) if (w.tipo === 'notas') notas[w.id] = await leer(`nota:${w.id}`);
    if (!(await leerLocal(CLAVE_RESPALDO))) await escribirLocal(CLAVE_RESPALDO, { datos, tema, opciones, grupos, notas });
    if (datos) await escribir(claveDatos(PRINCIPAL), datos);
    if (!(await leer(claveAspecto(PRINCIPAL)))) await escribir(claveAspecto(PRINCIPAL), aspectoDeLegado(tema, opciones));
    for (const [id, enlaces] of Object.entries(grupos)) if (enlaces != null) await escribir(claveGrupo(id), enlaces);
    for (const [id, nota] of Object.entries(notas)) if (typeof nota === 'string') await escribir(`notas:${id}`, nota);
    for (const clave of await claves('copia:')) {
      const m = /^copia:(\d{4}-\d{2}-\d{2})$/.exec(clave);
      const valor = m ? await leerLocal(clave) : null;
      if (!m || valor == null) continue;
      await escribirLocal(`copia:${PRINCIPAL}:${m[1]}`, valor);
      await borrar([clave]);
    }
    // Todo lo copiado se lee de vuelta igual antes de dar nada por hecho ni borrar lo antiguo.
    if (datos && !mismo(await leer(claveDatos(PRINCIPAL)), datos)) throw new Error('no se pudo comprobar lo copiado');
    for (const [id, enlaces] of Object.entries(grupos)) if (enlaces != null && !mismo(await leer(claveGrupo(id)), enlaces)) throw new Error('no se pudieron comprobar los enlaces copiados');
    for (const [id, nota] of Object.entries(notas)) if (typeof nota === 'string' && (await leer(`notas:${id}`)) !== nota) throw new Error('no se pudieron comprobar las notas copiadas');
    await guardarRegistro(nuevo);
    activo = PRINCIPAL;
    // Lo común (el buscador) se queda en «opciones»; lo demás ya vive en el aspecto del perfil.
    const comunes = opciones?.buscador ? { buscador: opciones.buscador } : {};
    await escribir('opciones', comunes);
    recordar('opciones', comunes);
    // Con el nombre antiguo ya no hay nada: una versión 4 que siga instalada en otro equipo empieza de cero en sus
    // propias claves y no puede borrar ni pisar lo de los perfiles.
    await borrar(['datos', 'tema', ...Object.keys(grupos).map(id => `grupo:${id}`), ...Object.keys(notas).map(id => `nota:${id}`)]);
    return 'migrado';
  } catch (err) {
    migracionFallida = true;
    registro = null;
    throw err;
  }
}

// ---------- Operaciones sobre el registro ----------

export function nombreValido(nombre) {
  const n = String(nombre ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOMBRE);
  if (!n) throw new Error('Nombre no válido');
  return n;
}

// Si ya hay un perfil con ese nombre se añade « (2)», « (3)»…
export function nombreUnico(nombre, ignorar = null) {
  const base = nombreValido(nombre);
  const usados = new Set(perfilesDeLaLista().filter(p => p.id !== ignorar).map(p => p.nombre));
  let candidato = base;
  for (let i = 2; usados.has(candidato); i++) candidato = `${base.slice(0, MAX_NOMBRE - ` (${i})`.length)} (${i})`;
  return candidato;
}

export const idDePerfilNuevo = () => `p${Math.random().toString(36).slice(2, 10)}`;

export async function anadirPerfil(perfil) {
  if (perfilesDeLaLista().length >= MAX_PERFILES) throw new Error(`Máximo ${MAX_PERFILES} perfiles`);
  if (perfilesDeLaLista().some(p => p.id === perfil.id)) throw new Error('Ese perfil ya existe');
  await guardarRegistro({ version: 5, lista: [...perfilesDeLaLista(), perfil] });
}

export async function renombrarPerfil(id, nombre) {
  const n = nombreUnico(nombre, id);
  await guardarRegistro({ version: 5, lista: perfilesDeLaLista().map(p => (p.id === id ? { ...p, nombre: n } : p)) });
}

export async function quitarPerfil(id) {
  const lista = perfilesDeLaLista().filter(p => p.id !== id);
  if (!lista.length) throw new Error('No se puede borrar el único perfil');
  await guardarRegistro({ version: 5, lista });
}

// Un cambio del registro llegado de otro equipo.
export function recibirRegistro(nuevo) {
  const r = normalizarRegistro(nuevo);
  if (!r) return false;
  registro = r;
  return true;
}

// Los ids de grupos y de widgets de los perfiles que hay que respetar al borrar claves «que sobran» (notas, tareas,
// cachés y enlaces de grupos o widgets que ya no están en el perfil activo pero sí en otro): todos los perfiles
// menos los de «excepto», estén o no en el registro. Si falta la estructura de un perfil del registro, lanza: sin
// saber qué tiene, no se borra nada.
export async function idsDeOtrosPerfiles(excepto = [activo]) {
  const grupos = new Set();
  const widgets = new Set();
  const listados = new Set(perfilesDeLaLista().map(p => p.id));
  for (const id of new Set([...listados, ...(await idsConDatos())])) {
    if (excepto.includes(id)) continue;
    const d = await leer(claveDatos(id));
    if (!d) {
      if (listados.has(id)) throw new Error('No se pudo comprobar el contenido de otro perfil: por si acaso, no se borra nada');
      continue;
    }
    for (const g of d.grupos ?? []) grupos.add(String(g.id));
    for (const w of [...(d.widgets ?? []), ...(d.ajenos ?? [])]) widgets.add(String(w.id));
  }
  return { grupos, widgets };
}

// Con la migración fallida: lo antiguo (con sus enlaces), para mostrarlo sin guardar.
export async function leerLegado() {
  const datos = await leer('datos');
  const opciones = await leer('opciones');
  if (datos && (datos.version || 1) >= 4) {
    datos.grupos = await Promise.all((datos.grupos ?? []).map(async g => ({ ...g, enlaces: (await leer(`grupo:${g.id}`)) || [] })));
  }
  return { datos, aspecto: aspectoDeLegado(await leer('tema'), opciones), opciones };
}
