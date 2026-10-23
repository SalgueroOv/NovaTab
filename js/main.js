// Arranque de NovaTab: carga los datos, aplica tema y opciones y escucha los cambios de otras pestañas.
import { $, svg } from './util.js';
import { alCambiar, bloquearGuardado, cargarDatos, esLoUltimo, escribirLocal, leer } from './almacen.js';
import { claveAspecto, claveDatos, leerLegado, migrar, perfilActivo } from './perfiles.js';
import { avisar } from './util.js';
import { VERSION, datos, normalizar, ponerDatos } from './datos.js';
import { resolver } from './rejilla.js';
import { pintar, pintarLocal } from './pintado.js';
import { CLAVE_OPCIONES, opciones, pintarFondo, ponerOpciones, ponerTema, recibirEco } from './apariencia.js';
import { cambioDeFuera, editando, guardar, sincronizado } from './edicion.js';
import './buscador.js';
import './ajustes-buscador.js';
import './comandos.js';
import './separador.js';
import './widgets.js';
import './widgets/reloj-mundial.js';
import './widgets/cuenta-atras.js';
import './widgets/tareas.js';
import './widgets/rss.js';
import './widgets/servicios.js';
import './iconos.js';
import { hacerCopiaDelDia } from './copias.js';
import './importar.js';
import './perfiles-ops.js';

// Cambios hechos en otra pestaña u otro equipo sincronizado.
alCambiar(cambios => {
  // El aspecto del perfil activo (tema y demás) y lo común (el buscador); los de otros perfiles no cuentan.
  const claveAsp = claveAspecto(perfilActivo());
  const aspecto = cambios[claveAsp]?.newValue;
  if (aspecto && !esLoUltimo(claveAsp, aspecto)) {
    if (aspecto.tema) ponerTema(aspecto.tema);
    recibirEco({ ...aspecto, buscador: opciones.buscador });
  }
  const comunes = cambios[CLAVE_OPCIONES]?.newValue;
  if (comunes && !esLoUltimo(CLAVE_OPCIONES, comunes)) recibirEco({ ...opciones, buscador: comunes.buscador });
  const deDatos = Object.entries(cambios).filter(([clave]) => clave === claveDatos(perfilActivo()) || clave.startsWith('grupo:'));
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

  let redimension;
  pintarFondo();
  addEventListener('resize', () => {
    clearTimeout(redimension);
    redimension = setTimeout(() => { pintarFondo(); if (editando) pintarLocal(); }, 120);
  });

  let aspecto = null;
  let guardados = null;
  let comunes = null;
  try {
    await migrar();
    [guardados, aspecto, comunes] = await Promise.all([cargarDatos(perfilActivo()), leer(claveAspecto(perfilActivo())), leer(CLAVE_OPCIONES)]);
  } catch (err) {
    // Sin migrar: se enseña lo de antes pero no se guarda nada en las claves nuevas hasta la próxima apertura.
    bloquearGuardado('Tus datos aún no se han actualizado al formato nuevo: se reintentará al abrir otra pestaña');
    avisar(`No se pudieron actualizar tus datos al formato nuevo: ${err.message}`);
    try {
      const legado = await leerLegado();
      guardados = legado.datos;
      aspecto = legado.aspecto;
      comunes = legado.opciones;
    } catch { /* sin datos guardados */ }
  }
  ponerTema(aspecto?.tema);
  ponerOpciones({ ...aspecto, buscador: comunes?.buscador });
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
  alIr: null, // las pruebas la sustituyen para no salir de la página (ver atajos.js)
  DATOS_DEFECTO, // const de datos-defecto.js (script clásico): visible por su nombre, no en globalThis
};
