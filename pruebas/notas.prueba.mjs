import { igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const NOTAS = conWidgets([{ id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]);
const teclear = texto => `(() => { const t = document.querySelector('.notas-texto'); t.focus(); t.value = ${JSON.stringify(texto)}; t.dispatchEvent(new Event('input')); })()`;
const escriturasDeNota = `__chromeFalso.escritas().filter(k => k.startsWith('nota:')).length`;

export default {
  nombre: 'notas: se guardan 2 s después de dejar de escribir y al salir de la pestaña',
  async ejecutar(abrir) {
    // (a) 10 pulsaciones en 1,5 s: nada guardado mientras se escribe ni 1 s después; a los 2,5 s, una
    // sola escritura.
    let pg = await abrir({ chrome: {}, datos: NOTAS });
    await pg.esperar(300);
    await pg.ev(`__chromeFalso.escritas()`);
    for (let i = 1; i <= 10; i++) {
      await pg.ev(teclear('x'.repeat(i)));
      await pg.esperar(150);
    }
    igual(await pg.ev(escriturasDeNota), 0, 'escrituras de la nota mientras se escribe');
    await pg.esperar(850);
    igual(await pg.ev(escriturasDeNota), 0, 'escrituras de la nota 1 s después de la última pulsación');
    await pg.esperar(1500);
    igual(await pg.ev(escriturasDeNota), 1, 'escrituras de la nota 2,5 s después');
    igual(await pg.ev(`chrome.storage.sync.get('nota:w-notas').then(r => r['nota:w-notas'])`), 'x'.repeat(10), 'texto guardado');

    // (b) Al ocultar la pestaña con texto pendiente se guarda al momento.
    pg = await abrir({ chrome: {}, datos: NOTAS });
    await pg.esperar(300);
    await pg.ev(`__chromeFalso.escritas()`);
    await pg.ev(teclear('a medias'));
    await pg.ev(`(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    })()`);
    await pg.esperar(100);
    igual(await pg.ev(escriturasDeNota), 1, 'escrituras de la nota al ocultar la pestaña');
    igual(await pg.ev(`chrome.storage.sync.get('nota:w-notas').then(r => r['nota:w-notas'])`), 'a medias', 'texto guardado al ocultar');
    await pg.esperar(2200);
    igual(await pg.ev(escriturasDeNota), 0, 'no se vuelve a guardar lo mismo');
  },
};
