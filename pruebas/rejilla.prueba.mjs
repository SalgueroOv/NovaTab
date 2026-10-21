import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

// Paso de una columna y de una fila de la rejilla indicada, en píxeles.
const PASOS = sel => `(() => {
  const r = document.querySelector('${sel}');
  const e = getComputedStyle(r);
  const cols = Number(getComputedStyle(r).getPropertyValue('--columnas')) || 12;
  return [(r.getBoundingClientRect().width + parseFloat(e.columnGap)) / cols, parseFloat(e.gridAutoRows) + parseFloat(e.rowGap)];
})()`;

const tituloDe = nombre => `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === '${nombre}')`;

export default {
  nombre: 'rejilla: mover, ensanchar y cambiar de panel',
  async ejecutar(abrir) {
    // Mover Beta 6 columnas a la izquierda y 7 filas abajo.
    let pg = await abrir();
    await pg.clic('#btn-editar');
    const [col, fila] = await pg.ev(PASOS('#rejilla'));
    const [x, y] = await pg.ev(`(() => { const r = ${tituloDe('Beta')}.querySelector('h3').getBoundingClientRect(); return [r.left + 10, r.top + r.height / 2]; })()`);
    await pg.arrastrar([x, y], [x - 6 * col, y + 7 * fila]);
    const beta = (await pg.datos()).grupos.find(g => g.nombre === 'Beta').pos;
    igual(beta.x, 1, 'Beta debería quedar en la columna 1');
    afirmar(beta.y >= 8, `Beta debería quedar en la fila 8 o más abajo y está en la ${beta.y}`);

    // Estrechar Beta con el asa: de 6 a 4 columnas.
    pg = await abrir();
    await pg.clic('#btn-editar');
    const asa = await pg.ev(`(() => { const r = ${tituloDe('Beta')}.querySelector('.asa-ancho').getBoundingClientRect(); return [r.left + 6, r.top + r.height / 2]; })()`);
    await pg.arrastrar(asa, [asa[0] - 2 * col, asa[1]], 6);
    igual((await pg.datos()).grupos.find(g => g.nombre === 'Beta').pos.w, 4, 'ancho de Beta tras estrecharla');

    // Un widget de notas pasa del panel derecho al izquierdo.
    pg = await abrir({ datos: conWidgets([{ id: 'w-notas', tipo: 'notas', panel: 'der', pos: { x: 7, y: 6, w: 6, h: 4 }, config: {} }]) });
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('#rejilla .widget-notas').scrollIntoView({ block: 'center' })`);
    const origen = await pg.ev(`(() => { const r = document.querySelector('#rejilla .widget-notas .widget-cab h3').getBoundingClientRect(); return [r.left + 10, r.top + r.height / 2]; })()`);
    const destino = await pg.ev(`(() => { const r = document.querySelector('#rejilla-izq').getBoundingClientRect(); return [r.left + 30, r.top + 30]; })()`);
    await pg.arrastrar(origen, destino, 12);
    igual((await pg.datos()).widgets.find(w => w.id === 'w-notas').panel, 'izq', 'panel del widget de notas');
  },
};
