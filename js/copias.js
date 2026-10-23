// Copia automática diaria (las 7 últimas) en este equipo, y su lista en Opciones.
import { $, avisarConAccion, crear } from './util.js';
import { borrar, claves, escribirLocal, leerLocal } from './almacen.js';
import { deshacerUltimo, reemplazarEstado, tomarFoto } from './edicion.js';

const PREFIJO = 'copia:';
const MAXIMO = 7;

const fechaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const legible = fecha => {
  if (fecha === fechaLocal()) return 'Hoy';
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '');
};

// Solo las claves con forma de fecha: cualquier otra «copia:...» no es nuestra.
const clavesDeCopia = async () => (await claves(PREFIJO)).filter(k => /^copia:\d{4}-\d{2}-\d{2}$/.test(k));

const valida = c => typeof c?.fecha === 'string' && Array.isArray(c?.datos?.grupos);

// Guarda la copia de hoy si aún no existe y deja solo las 7 más recientes. Devuelve si creó una.
export async function hacerCopiaDelDia() {
  const hoy = fechaLocal();
  if (valida(await leerLocal(PREFIJO + hoy))) return false;
  const foto = await tomarFoto();
  await escribirLocal(PREFIJO + hoy, { fecha: hoy, datos: foto.datos, notas: foto.notas, tareas: foto.tareas });
  const todas = (await clavesDeCopia()).sort();
  await borrar(todas.slice(0, Math.max(0, todas.length - MAXIMO)));
  return true;
}

// De la más reciente a la más antigua; lo que no sea una copia utilizable se ignora.
export async function listarCopias() {
  const lista = [];
  for (const clave of (await clavesDeCopia()).sort().reverse()) {
    const c = await leerLocal(clave);
    if (valida(c)) lista.push({ fecha: clave.slice(PREFIJO.length) });
  }
  return lista;
}

export async function recuperarCopia(fecha) {
  const c = await leerLocal(PREFIJO + fecha);
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
