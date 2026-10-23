// Operaciones con perfiles que tocan la pantalla: crear, duplicar, borrar y cambiar de perfil.
import { avisar } from './util.js';
import { alCambiar, borrar, cargarDatos, claveGrupo, claves, escribirLocal, esLoUltimo, escribir, guardarDatos, leer, leerLocal } from './almacen.js';
import { VERSION, normalizar, ponerDatos } from './datos.js';
import { resolver } from './rejilla.js';
import { pintar } from './pintado.js';
import { descartarEco, opciones, ponerOpciones, ponerTema } from './apariencia.js';
import { guardar, limpiarHistorial, ocupado, sincronizado } from './edicion.js';
import { hacerCopiaDelDia } from './copias.js';
import { claveNota } from './widgets.js';
import { renumerar } from './renumerar.js';
import {
  CLAVE_ANTERIOR, CLAVE_REGISTRO, MAX_PERFILES, anadirPerfil, claveAspecto, claveDatos, fijarActivo, idDePerfilNuevo, idsDeOtrosPerfiles,
  nombreUnico, nombreValido, perfilActivo, perfilesDeLaLista, perfilesListos, quitarPerfil, recibirRegistro, recordarActivo,
  renombrarPerfil as renombrarEnRegistro,
} from './perfiles.js';

const dormir = ms => new Promise(r => setTimeout(r, ms));

// Las operaciones que cambian perfiles van una detrás de otra: un doble clic en el ojo, o un borrado remoto
// mientras se cambia, no pueden mezclarse (se podría guardar un perfil en las claves de otro).
let cola = Promise.resolve();
const enSerie = fn => {
  const p = cola.catch(() => {}).then(fn);
  cola = p;
  return p;
};

const comprobarListos = () => {
  if (!perfilesListos()) throw new Error('Los perfiles aún no están disponibles');
};

// Guarda lo que esté pendiente (notas, tareas, ajustes que se arrastran y los datos) antes de dejar un perfil.
export async function volcarTodo() {
  document.dispatchEvent(new Event('novatab:volcar'));
  await guardar();
  await dormir(0);
}

// Si hay un diálogo abierto, un arrastre o un título a medio escribir, se espera a que acabe.
async function esperarLibre() {
  for (let i = 0; i < 150 && ocupado(); i++) await dormir(100);
}

// ---------- Contenido de un perfil ----------

// Copia el contenido de «origen» en «destino» (grupos, widgets, notas, tareas y aspecto) con ids nuevos.
async function copiarContenido(origen, destino, opcionesCopia = {}) {
  const d = await cargarDatos(origen);
  if (!d || (d.version || 1) < 4) return { omitidos: 0 };
  const copia = renumerar(d, opcionesCopia);
  await guardarDatos(copia.datos, destino);
  for (const [viejo, nuevo] of copia.widgets) {
    const tipo = copia.datos.widgets.find(w => w.id === nuevo)?.tipo;
    if (tipo === 'notas') {
      const nota = await leer(claveNota(viejo));
      if (typeof nota === 'string') await escribir(claveNota(nuevo), nota);
    } else if (tipo === 'tareas') {
      const tareas = await leer(`tareas:${viejo}`);
      if (Array.isArray(tareas)) await escribir(`tareas:${nuevo}`, tareas);
    }
  }
  const aspecto = (await leer(claveAspecto(origen))) ?? {};
  // La imagen de fondo propia es una sola por equipo: en Demo (una pantalla compartida) no se usa.
  if (opcionesCopia.sinImagen && aspecto.apariencia?.fondo === 'imagen') aspecto.apariencia = { ...aspecto.apariencia, fondo: 'curvas' };
  await escribir(claveAspecto(destino), aspecto);
  return { omitidos: copia.omitidos };
}

// ---------- Crear, renombrar y borrar ----------

async function crearDentro(nombre, { desde = null, demo = false, sinPrivados = false, tipos = null } = {}) {
  comprobarListos();
  if (perfilesDeLaLista().length >= MAX_PERFILES) throw new Error(`Máximo ${MAX_PERFILES} perfiles`);
  if (demo && perfilesDeLaLista().some(p => p.demo)) throw new Error('Ya hay un perfil Demo');
  const id = demo ? 'demo' : idDePerfilNuevo();
  const nombreFinal = nombreUnico(demo ? 'Demo' : nombre);
  let omitidos = 0;
  if (desde) {
    if (desde === perfilActivo()) await volcarTodo();
    omitidos = (await copiarContenido(desde, id, { sinPrivados, tipos, sinImagen: demo })).omitidos;
  } else {
    await guardarDatos(renumerar(normalizar(DATOS_DEFECTO)).datos, id);
    await escribir(claveAspecto(id), {});
  }
  await anadirPerfil({ id, nombre: nombreFinal, ...(demo ? { demo: true } : {}) });
  document.dispatchEvent(new Event('novatab:perfiles'));
  return { id, omitidos };
}

async function borrarDentro(id) {
  comprobarListos();
  const lista = perfilesDeLaLista();
  if (lista.length <= 1) throw new Error('No se puede borrar el único perfil');
  if (!lista.some(p => p.id === id)) return;
  if (id === perfilActivo()) await cambiarDentro(lista.find(p => p.id !== id).id);
  const d = await cargarDatos(id);
  // Se respeta lo que también usa otro perfil (por si por algún motivo compartieran ids).
  const otros = await idsDeOtrosPerfiles([id]);
  await quitarPerfil(id);
  const propias = [claveDatos(id), claveAspecto(id)];
  for (const g of d?.grupos ?? []) if (!otros.grupos.has(String(g.id))) propias.push(claveGrupo(g.id));
  for (const w of [...(d?.widgets ?? []), ...(d?.ajenos ?? [])]) {
    if (!otros.widgets.has(String(w.id))) propias.push(claveNota(w.id), `tareas:${w.id}`, `rss:${w.id}`);
  }
  propias.push(...(await claves(`copia:${id}:`)));
  await borrar(propias);
  document.dispatchEvent(new Event('novatab:perfiles'));
}

// ---------- Cambiar de perfil ----------

// Pone en pantalla los datos y el aspecto de un perfil. Todo en un mismo tramo sin esperas: nunca se queda el
// perfil activo de uno con los datos de otro (lo que se guardara en ese instante iría a las claves equivocadas).
function ponerPerfil(id, guardados, aspecto) {
  let d;
  try {
    d = normalizar(guardados || DATOS_DEFECTO);
  } catch {
    d = normalizar(DATOS_DEFECTO);
  }
  fijarActivo(id);
  ponerDatos(d);
  ponerTema(aspecto?.tema);
  ponerOpciones({ ...aspecto, buscador: opciones.buscador });
  resolver();
  pintar();
  sincronizado();
}

async function cambiarDentro(id, { descartar = false } = {}) {
  comprobarListos();
  if (!perfilesDeLaLista().some(p => p.id === id)) throw new Error('Ese perfil no existe');
  if (id === perfilActivo()) return;
  if (!descartar) {
    await esperarLibre();
    await volcarTodo();
  }
  descartarEco();
  limpiarHistorial();
  const [guardados, aspecto] = await Promise.all([cargarDatos(id), leer(claveAspecto(id))]);
  ponerPerfil(id, guardados, aspecto);
  await recordarActivo(id);
  if (!guardados || (guardados.version || 1) < VERSION) await guardar().catch(err => avisar(`No se pudieron guardar los datos: ${err.message}`));
  document.dispatchEvent(new Event('novatab:perfil'));
  hacerCopiaDelDia().catch(() => { /* la copia diaria es un extra */ });
}

export const crearPerfil = (nombre, opcionesCrear) => enSerie(() => crearDentro(nombre, opcionesCrear));
export const borrarPerfil = id => enSerie(() => borrarDentro(id));
export const cambiarPerfil = (id, opcionesCambio) => enSerie(() => cambiarDentro(id, opcionesCambio));
export const renombrarPerfil = (id, nombre) => enSerie(async () => {
  comprobarListos();
  await renombrarEnRegistro(id, nombreValido(nombre));
  document.dispatchEvent(new Event('novatab:perfiles'));
});

// ---------- Demo (el modo reunión) ----------

// Los widgets que se copian a Demo: los demás podrían enseñar contenido personal en una pantalla compartida.
const TIPOS_DEMO = ['tiempo', 'relojMundial', 'cuentaAtras'];

// El ojo: del perfil actual a Demo (creándolo la primera vez, sin los grupos privados) y de Demo al de antes.
export const alternarDemo = () => enSerie(async () => {
  comprobarListos();
  const lista = perfilesDeLaLista();
  if (lista.find(p => p.id === perfilActivo())?.demo) {
    const anterior = await leerLocal(CLAVE_ANTERIOR);
    const destino = lista.find(p => p.id === anterior && !p.demo) ?? lista.find(p => !p.demo) ?? lista[0];
    await cambiarDentro(destino.id);
    return;
  }
  await escribirLocal(CLAVE_ANTERIOR, perfilActivo());
  let demo = lista.find(p => p.demo);
  if (!demo) {
    const { id, omitidos } = await crearDentro('Demo', { desde: perfilActivo(), demo: true, sinPrivados: true, tipos: TIPOS_DEMO });
    demo = { id };
    if (!omitidos) avisar('Ningún grupo era privado: Demo es una copia completa de tus grupos');
  }
  await cambiarDentro(demo.id);
});

// Un cambio del registro llegado de otro equipo (perfiles nuevos, renombrados o borrados).
alCambiar(cambios => {
  const nuevo = cambios[CLAVE_REGISTRO]?.newValue;
  if (!nuevo || esLoUltimo(CLAVE_REGISTRO, nuevo) || !recibirRegistro(nuevo)) return;
  document.dispatchEvent(new Event('novatab:perfiles'));
  if (!perfilesDeLaLista().some(p => p.id === perfilActivo())) {
    avisar('Ese perfil se borró en otro equipo');
    // Sin guardar: lo que hay en pantalla pertenece a un perfil que ya no existe.
    cambiarPerfil(perfilesDeLaLista()[0].id, { descartar: true }).catch(() => {});
  }
});
