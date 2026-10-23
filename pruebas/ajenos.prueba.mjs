import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

export default {
  nombre: 'widgets de un tipo desconocido (de una versión más nueva) se conservan al guardar',
  async ejecutar(abrir) {
    const futuro = { id: 'f1', tipo: 'widgetDelFuturo', panel: 'izq', pos: { x: 1, y: 1, w: 4, h: 4 }, config: { clave: 'valor' } };
    const pg = await abrir({ chrome: {}, datos: conWidgets([futuro]) });
    await pg.esperar(500);
    igual(await pg.ev(`novatab.datos.widgets.length`), 0, 'no se pinta ni se cuenta como widget');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')][0].querySelector('[data-plegar]').click()`);
    await pg.esperar(500);
    const guardado = await pg.ev(`chrome.storage.sync.get('datos').then(r => r.datos)`);
    igual((guardado.ajenos ?? []).map(w => [w.id, w.tipo, w.config.clave]), [['f1', 'widgetDelFuturo', 'valor']], 'sigue en lo guardado tras editar');
    await pg.recargar();
    await pg.esperar(500);
    const otra = await pg.ev(`chrome.storage.sync.get('datos').then(r => r.datos)`);
    igual((otra.ajenos ?? []).length, 1, 'y tras recargar');
    afirmar(true, 'sin errores');
  },
};
