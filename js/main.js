// Arranque de NovaTab: carga los datos, aplica tema y opciones y escucha los cambios de otras pestañas.
import { $, svg } from './util.js';
import { alCambiar, cargarDatos, esLoUltimo, escribirLocal, leer } from './almacen.js';
import { avisar } from './util.js';
import { CLAVE, VERSION, datos, normalizar, ponerDatos } from './datos.js';
import { resolver } from './rejilla.js';
import { pintar, pintarLocal } from './pintado.js';
import { CLAVE_OPCIONES, CLAVE_TEMA, pintarFondo, ponerOpciones, ponerTema, reloj } from './apariencia.js';
import { cambioDeFuera, editando, guardar, sincronizado } from './edicion.js';
import './buscador.js';
import './widgets.js';
import './iconos.js';
import { hacerCopiaDelDia } from './copias.js';
import './importar.js';

// Cambios hechos en otra pestaña u otro equipo sincronizado.
alCambiar(cambios => {
  if (cambios[CLAVE_TEMA]?.newValue) ponerTema(cambios[CLAVE_TEMA].newValue);
  if (cambios[CLAVE_OPCIONES]?.newValue) ponerOpciones(cambios[CLAVE_OPCIONES].newValue);
  const deDatos = Object.entries(cambios).filter(([clave]) => clave === CLAVE || clave.startsWith('grupo:'));
  // Los ecos de lo que esta pestaña acaba de guardar no cuentan.
  if (!deDatos.length || deDatos.every(([clave, c]) => esLoUltimo(clave, c.newValue))) return;
  clearTimeout(recarga);
  recarga = setTimeout(cambioDeFuera, 50);
});

let recarga;

(async () => {
  $('#btn-editar').innerHTML = svg('lapiz');
  $('#btn-panel-izq').innerHTML = svg('panelIzq');
  $('#btn-panel-der').innerHTML = svg('panelDer');
  $('#btn-tema').innerHTML = svg('paleta');
  $('#ico-buscar').innerHTML = svg('buscar');
  $('#modo-ia').innerHTML = `${svg('ia')}Modo IA`;

  reloj();
  setInterval(reloj, 10000);
  let redimension;
  pintarFondo();
  addEventListener('resize', () => {
    clearTimeout(redimension);
    redimension = setTimeout(() => { pintarFondo(); if (editando) pintarLocal(); }, 120);
  });

  let tema = null;
  let guardados = null;
  let opcionesGuardadas = null;
  try {
    [tema, guardados, opcionesGuardadas] = await Promise.all([leer(CLAVE_TEMA), cargarDatos(), leer(CLAVE_OPCIONES)]);
  } catch { /* sin datos guardados */ }
  ponerTema(tema);
  ponerOpciones(opcionesGuardadas);
  try {
    ponerDatos(normalizar(guardados || DATOS_DEFECTO));
  } catch {
    ponerDatos(normalizar(DATOS_DEFECTO));
  }
  resolver();
  pintar();
  sincronizado();
  if (!guardados) {
    await guardar().catch(err => avisar(`No se pudieron guardar los datos: ${err.message}`));
  } else if ((guardados.version || 1) < VERSION) {
    // Formato anterior: copia de seguridad en este equipo y migración. Si falla, los datos antiguos
    // quedan intactos y se reintenta en la siguiente apertura.
    try {
      await escribirLocal('respaldo-v3', guardados);
      await guardar();
    } catch (err) {
      avisar(`No se pudieron actualizar tus datos al formato nuevo: ${err.message}`);
    }
  }
  if (guardados) hacerCopiaDelDia().catch(() => { /* la copia diaria es un extra */ });
})();

// Para las pruebas automáticas: el estado actual y la forma de repintar, solo lectura.
globalThis.novatab = {
  get datos() { return datos; },
  pintar,
  DATOS_DEFECTO, // const de datos-defecto.js (script clásico): visible por su nombre, no en globalThis
};
