// Perfiles: el registro (en sync), el perfil activo de este equipo (en local) y la migración desde la versión 4.
import { borrar, claveAspecto, claveDatos, claves, escribir, escribirLocal, leer, leerLocal, recordar } from './almacen.js';

export const CLAVE_REGISTRO = 'perfiles';
export const CLAVE_ACTIVO = 'perfil-activo';
export const CLAVE_ANTERIOR = 'perfil-anterior';
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

export async function ponerPerfilActivo(id) {
  activo = id;
  await escribirLocal(CLAVE_ACTIVO, id);
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

// Los ids de grupos y de widgets de los demás perfiles: lo que hay que respetar al borrar claves «que sobran»
// (notas, tareas, cachés y enlaces cuyo widget o grupo ya no está en el perfil activo pero sí en otro).
export async function idsDeOtrosPerfiles() {
  const grupos = new Set();
  const widgets = new Set();
  for (const p of perfilesDeLaLista().filter(x => x.id !== activo)) {
    const d = await leer(claveDatos(p.id));
    for (const g of d?.grupos ?? []) grupos.add(String(g.id));
    for (const w of [...(d?.widgets ?? []), ...(d?.ajenos ?? [])]) widgets.add(String(w.id));
  }
  return { grupos, widgets };
}

const mismo = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

// Crea el registro si no existe: desde los datos de la versión 4 (con copia de seguridad), o desde cero.
// El registro se escribe el último: mientras no exista, la siguiente apertura vuelve a intentarlo entero.
export async function migrar() {
  const existente = await leerRegistro();
  if (existente) {
    registro = existente;
    await elegirActivo();
    return 'ya-estaba';
  }
  const datos = await leer('datos');
  const tema = await leer('tema');
  const opciones = await leer('opciones');
  const nuevo = { version: 5, lista: [{ id: PRINCIPAL, nombre: 'Principal' }] };
  if (!datos && tema == null && opciones == null) {
    await guardarRegistro(nuevo);
    activo = PRINCIPAL;
    return 'nuevo';
  }
  try {
    await escribirLocal('respaldo-v4', { datos, tema, opciones });
    const aspecto = aspectoDeLegado(tema, opciones);
    if (datos) await escribir(claveDatos(PRINCIPAL), datos);
    await escribir(claveAspecto(PRINCIPAL), aspecto);
    for (const clave of await claves('copia:')) {
      const m = /^copia:(\d{4}-\d{2}-\d{2})$/.exec(clave);
      if (!m) continue;
      await escribirLocal(`copia:${PRINCIPAL}:${m[1]}`, await leerLocal(clave));
      await borrar([clave]);
    }
    if (datos && !mismo(await leer(claveDatos(PRINCIPAL)), datos)) throw new Error('no se pudo comprobar lo copiado');
    await guardarRegistro(nuevo);
    activo = PRINCIPAL;
    // Lo común (el buscador) se queda en «opciones»; lo demás ya vive en el aspecto del perfil.
    const comunes = opciones?.buscador ? { buscador: opciones.buscador } : {};
    await escribir('opciones', comunes);
    recordar('opciones', comunes);
    await borrar(['datos', 'tema']);
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

// Con la migración fallida: lo antiguo, para mostrarlo sin guardar.
export async function leerLegado() {
  return { datos: await leer('datos'), aspecto: aspectoDeLegado(await leer('tema'), await leer('opciones')), opciones: await leer('opciones') };
}
