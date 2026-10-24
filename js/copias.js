// Copia automática diaria (las 7 últimas) en este equipo, y su lista en Opciones.
import { $, avisarConAccion, crear } from './util.js';
import { borrar, claves, escribirLocal, leerLocal } from './almacen.js';
import { deshacerUltimo, reemplazarEstado, tomarFoto } from './edicion.js';
import { migracionFallida, perfilActivo } from './perfiles.js';
import { archivoDeCopia, carpetaDeCopias, elegirCarpeta, escribirEnCarpeta, hayCarpetas, ponerCarpeta, textoDeCopia } from './carpeta-copias.js';

const prefijo = (perfil = perfilActivo()) => `copia:${perfil}:`;
const MAXIMO = 7;

const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const legible = fecha => {
  if (fecha === fechaLocal()) return 'Hoy';
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');
};

// Solo las claves con forma de fecha: cualquier otra «copia:...» no es nuestra.
const clavesDeCopia = async () => (await claves(prefijo())).filter(k => /^copia:[^:]+:\d{4}-\d{2}-\d{2}$/.test(k));

const valida = c => typeof c?.fecha === 'string' && Array.isArray(c?.datos?.grupos);

// Guarda la copia de hoy si aún no existe y deja solo las 7 más recientes. Devuelve si creó una.
export async function hacerCopiaDelDia() {
  if (migracionFallida) return false;
  const hoy = fechaLocal();
  const perfil = perfilActivo(); // se captura ahora: si se cambia de perfil a medias, la copia no cae en el equivocado
  if (valida(await leerLocal(prefijo(perfil) + hoy))) return false;
  const foto = await tomarFoto();
  if (perfil !== perfilActivo()) return false;
  await escribirLocal(prefijo(perfil) + hoy, { fecha: hoy, datos: foto.datos, notas: foto.notas, tareas: foto.tareas });
  const todas = (await clavesDeCopia()).sort();
  await borrar(todas.slice(0, Math.max(0, todas.length - MAXIMO)));
  // Y en la carpeta de copias, si hay una y Chrome mantiene el permiso: el archivo de ayer se sobrescribe.
  escribirEnCarpeta(archivoDeCopia(perfil), textoDeCopia(foto)).catch(() => { /* lo intentará Exportar */ });
  return true;
}

// De la más reciente a la más antigua; lo que no sea una copia utilizable se ignora.
export async function listarCopias() {
  const lista = [];
  for (const clave of (await clavesDeCopia()).sort().reverse()) {
    const c = await leerLocal(clave);
    if (valida(c)) lista.push({ fecha: clave.slice(prefijo().length) });
  }
  return lista;
}

export async function recuperarCopia(fecha) {
  const c = await leerLocal(prefijo() + fecha);
  if (!valida(c)) return;
  await reemplazarEstado({ datos: c.datos, notas: c.notas || {}, tareas: c.tareas || {} });
  avisarConAccion(`Copia del ${legible(fecha).toLowerCase()} recuperada`, 'Deshacer', deshacerUltimo);
}

async function pintarLista() {
  const ul = $('#lista-copias');
  const copias = await listarCopias();
  ul.replaceChildren(...(copias.length ? copias.map(({ fecha }) => {
    const li = crear('li');
    const boton = crear('button', 'boton-texto', 'Recuperar');
    boton.type = 'button';
    boton.addEventListener('click', () => recuperarCopia(fecha));
    li.append(crear('span', null, legible(fecha)), boton);
    return li;
  }) : [crear('li', 'vacio-copias', 'Aún no hay copias')]));
}

$('#btn-tema').addEventListener('click', pintarLista);

// La carpeta de copias en la pestaña Datos.
async function pintarCarpeta() {
  const c = await carpetaDeCopias();
  $('#carpeta-estado').textContent = c
    ? `Exportar y la copia diaria escriben «${archivoDeCopia(perfilActivo())}» en «${c.name}» y lo sobrescriben.`
    : 'Ninguna: Exportar descarga un archivo nuevo en Descargas cada vez.';
  $('#btn-carpeta').textContent = c ? 'Cambiar carpeta…' : 'Elegir carpeta…';
  $('#btn-quitar-carpeta').hidden = !c;
}
if (hayCarpetas) {
  $('#carpeta-copias').hidden = false;
  $('#btn-tema').addEventListener('click', pintarCarpeta);
  document.addEventListener('novatab:carpeta', pintarCarpeta);
  $('#btn-carpeta').addEventListener('click', () => elegirCarpeta().catch(() => { /* cancelado */ }));
  $('#btn-quitar-carpeta').addEventListener('click', () => ponerCarpeta(null));
}
