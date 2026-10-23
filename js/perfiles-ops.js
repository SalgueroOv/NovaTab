// Operaciones con perfiles que tocan la pantalla: crear, duplicar, borrar y cambiar de perfil.
import { avisar, nuevoId } from './util.js';
import { alCambiar, borrar, cargarDatos, claves, escribirLocal, esLoUltimo, escribir, guardarDatos, leer, leerLocal } from './almacen.js';
import { VERSION, normalizar, ponerDatos } from './datos.js';
import { resolver } from './rejilla.js';
import { pintar } from './pintado.js';
import { opciones, ponerOpciones, ponerTema } from './apariencia.js';
import { guardar, limpiarHistorial, ocupado, sincronizado } from './edicion.js';
import { hacerCopiaDelDia } from './copias.js';
import {
  CLAVE_ANTERIOR, CLAVE_REGISTRO, anadirPerfil, claveAspecto, idDePerfilNuevo, nombreUnico, nombreValido, perfilActivo, perfilesDeLaLista,
  ponerPerfilActivo, quitarPerfil, recibirRegistro, renombrarPerfil as renombrarEnRegistro, MAX_PERFILES,
} from './perfiles.js';

const dormir = ms => new Promise(r => setTimeout(r, ms));

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

// Una copia de un perfil con ids nuevos de grupos, widgets y enlaces (los grupos y widgets de dos perfiles no
// pueden compartir ids: comparten claves «grupo:<id>», «nota:<id>»…). Devuelve también cómo cambiaron los widgets.
function renumerar(d, { sinPrivados = false, tipos = null } = {}) {
  const widgets = new Map();
  const grupos = d.grupos.filter(g => !(sinPrivados && g.privado)).map(g => ({
    ...g,
    id: nuevoId(),
    enlaces: g.enlaces.map(e => ({ ...e, id: nuevoId() })),
  }));
  const ws = d.widgets.filter(w => !tipos || tipos.includes(w.tipo)).map(w => {
    const id = nuevoId();
    widgets.set(w.id, id);
    return { ...w, id };
  });
  const { ajenos, ...resto } = d;
  return { datos: { ...resto, grupos, widgets: ws }, widgets, omitidos: d.grupos.length - grupos.length };
}

// Copia el contenido de «origen» en «destino» (grupos, widgets, notas, tareas y aspecto) con ids nuevos.
async function copiarContenido(origen, destino, opcionesCopia) {
  const d = await cargarDatos(origen);
  if (!d || (d.version || 1) < 4) return { omitidos: 0 };
  const copia = renumerar(d, opcionesCopia);
  await guardarDatos(copia.datos, destino);
  for (const w of copia.datos.widgets) {
    const viejo = [...copia.widgets].find(([, nuevo]) => nuevo === w.id)?.[0];
    if (w.tipo === 'notas') {
      const nota = await leer(`nota:${viejo}`);
      if (typeof nota === 'string') await escribir(`nota:${w.id}`, nota);
    } else if (w.tipo === 'tareas') {
      const tareas = await leer(`tareas:${viejo}`);
      if (Array.isArray(tareas)) await escribir(`tareas:${w.id}`, tareas);
    }
  }
  await escribir(claveAspecto(destino), (await leer(claveAspecto(origen))) ?? {});
  return { omitidos: copia.omitidos };
}

// ---------- Crear, renombrar y borrar ----------

// «desde» duplica ese perfil; si no, el perfil nace con el ejemplo inicial. Devuelve { id, omitidos } (omitidos: grupos
// privados que no se copiaron).
export async function crearPerfil(nombre, { desde = null, demo = false, sinPrivados = false, tipos = null } = {}) {
  if (perfilesDeLaLista().length >= MAX_PERFILES) throw new Error(`Máximo ${MAX_PERFILES} perfiles`);
  if (demo && perfilesDeLaLista().some(p => p.demo)) throw new Error('Ya hay un perfil Demo');
  const id = demo ? 'demo' : idDePerfilNuevo();
  const nombreFinal = nombreUnico(demo ? 'Demo' : nombre);
  let omitidos = 0;
  if (desde) {
    if (desde === perfilActivo()) await volcarTodo();
    omitidos = (await copiarContenido(desde, id, { sinPrivados, tipos })).omitidos;
  } else {
    await guardarDatos(renumerar(normalizar(DATOS_DEFECTO)).datos, id);
    await escribir(claveAspecto(id), {});
  }
  await anadirPerfil({ id, nombre: nombreFinal, ...(demo ? { demo: true } : {}) });
  document.dispatchEvent(new Event('novatab:perfiles'));
  return { id, omitidos };
}

export async function renombrarPerfil(id, nombre) {
  await renombrarEnRegistro(id, nombreValido(nombre));
  document.dispatchEvent(new Event('novatab:perfiles'));
}

export async function borrarPerfil(id) {
  const lista = perfilesDeLaLista();
  if (lista.length <= 1) throw new Error('No se puede borrar el único perfil');
  if (!lista.some(p => p.id === id)) return;
  if (id === perfilActivo()) await cambiarPerfil(lista.find(p => p.id !== id).id);
  const d = await cargarDatos(id);
  await quitarPerfil(id);
  const propias = [claveDatosDe(id), claveAspecto(id)];
  for (const g of d?.grupos ?? []) propias.push(`grupo:${g.id}`);
  for (const w of [...(d?.widgets ?? []), ...(d?.ajenos ?? [])]) propias.push(`nota:${w.id}`, `tareas:${w.id}`, `rss:${w.id}`);
  propias.push(...(await claves(`copia:${id}:`)));
  await borrar(propias);
  document.dispatchEvent(new Event('novatab:perfiles'));
}
const claveDatosDe = id => `perfil:${id}:datos`;

// ---------- Cambiar de perfil ----------

// Carga el perfil activo en pantalla: aspecto y datos (o el ejemplo inicial si aún no tiene).
async function cargarPerfilActivo() {
  const id = perfilActivo();
  const [guardados, aspecto] = await Promise.all([cargarDatos(id), leer(claveAspecto(id))]);
  ponerTema(aspecto?.tema);
  ponerOpciones({ ...aspecto, buscador: opciones.buscador });
  let d;
  try {
    d = normalizar(guardados || DATOS_DEFECTO);
  } catch {
    d = normalizar(DATOS_DEFECTO);
  }
  ponerDatos(d);
  resolver();
  pintar();
  sincronizado();
  if (!guardados || (guardados.version || 1) < VERSION) await guardar().catch(err => avisar(`No se pudieron guardar los datos: ${err.message}`));
}

export async function cambiarPerfil(id, { descartar = false } = {}) {
  if (!perfilesDeLaLista().some(p => p.id === id)) throw new Error('Ese perfil no existe');
  if (id === perfilActivo()) return;
  if (!descartar) {
    await esperarLibre();
    await volcarTodo();
  }
  limpiarHistorial();
  await ponerPerfilActivo(id);
  await cargarPerfilActivo();
  document.dispatchEvent(new Event('novatab:perfil'));
  hacerCopiaDelDia().catch(() => { /* la copia diaria es un extra */ });
}

// ---------- Demo (el modo reunión) ----------

// Los widgets que se copian a Demo: los demás podrían enseñar contenido personal en una pantalla compartida.
const TIPOS_DEMO = ['tiempo', 'relojMundial', 'cuentaAtras'];

// El ojo: del perfil actual a Demo (creándolo la primera vez, sin los grupos privados) y de Demo al de antes.
export async function alternarDemo() {
  const lista = perfilesDeLaLista();
  if (lista.find(p => p.id === perfilActivo())?.demo) {
    const anterior = await leerLocal(CLAVE_ANTERIOR);
    const destino = lista.find(p => p.id === anterior && !p.demo) ?? lista.find(p => !p.demo) ?? lista[0];
    await cambiarPerfil(destino.id);
    return;
  }
  await escribirLocal(CLAVE_ANTERIOR, perfilActivo());
  let demo = lista.find(p => p.demo);
  if (!demo) {
    const { id, omitidos } = await crearPerfil('Demo', { desde: perfilActivo(), demo: true, sinPrivados: true, tipos: TIPOS_DEMO });
    demo = { id };
    if (!omitidos) avisar('Ningún grupo era privado: Demo es una copia completa de tus grupos');
  }
  await cambiarPerfil(demo.id);
}

// Un cambio del registro llegado de otro equipo (perfiles nuevos, renombrados o borrados).
alCambiar(cambios => {
  const nuevo = cambios[CLAVE_REGISTRO]?.newValue;
  if (!nuevo || esLoUltimo(CLAVE_REGISTRO, nuevo) || !recibirRegistro(nuevo)) return;
  document.dispatchEvent(new Event('novatab:perfiles'));
  if (!perfilesDeLaLista().some(p => p.id === perfilActivo())) {
    avisar('Ese perfil se borró en otro equipo');
    // Sin guardar: lo que hay en pantalla pertenece a un perfil que ya no existe.
    cambiarPerfil(perfilesDeLaLista()[0].id, { descartar: true });
  }
});
