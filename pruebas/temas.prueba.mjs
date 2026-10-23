import { afirmar, igual } from './lib/util.mjs';

const IDS = ['bosque', 'noche', 'medianoche', 'grafito', 'carbon', 'papel', 'glaciar', 'niebla', 'menta', 'rosa'];
const MODOS = { bosque: 'oscuro', noche: 'oscuro', medianoche: 'oscuro', grafito: 'oscuro', carbon: 'oscuro', papel: 'claro', glaciar: 'claro', niebla: 'claro', menta: 'claro', rosa: 'claro' };

export default {
  nombre: 'temas: diez, cada uno con sus colores, y el elegido se recuerda',
  async ejecutar(abrir) {
    const pg = await abrir();
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    igual(await pg.ev(`[...document.querySelectorAll('.muestra')].map(m => m.dataset.tema)`), IDS, 'muestras de tema');

    const fondos = new Set();
    for (const id of IDS) {
      await pg.ev(`document.querySelector('.muestra[data-tema="${id}"]').click()`);
      await pg.esperar(60);
      const [tema, modo, bg, l, l2, panel] = await pg.ev(`(() => { const e = getComputedStyle(document.documentElement); return [document.documentElement.dataset.tema, document.documentElement.dataset.modo, ...['--bg', '--l', '--l2', '--panel'].map(v => e.getPropertyValue(v).trim())]; })()`);
      igual([tema, modo], [id, MODOS[id]], `tema y modo de ${id}`);
      afirmar(bg && l && l2 && panel, `${id} define --bg, --l, --l2 y --panel`);
      afirmar(l !== bg && l2 !== l, `${id}: las líneas del fondo se distinguen del fondo`);
      fondos.add(bg);
      igual(await pg.ev(`document.querySelector('.muestra[data-tema="${id}"]').getAttribute('aria-pressed')`), 'true', `muestra de ${id} marcada`);
    }
    igual(fondos.size, IDS.length, 'cada tema tiene un fondo distinto');

    await pg.ev(`document.querySelector('.muestra[data-tema="menta"]').click()`);
    await pg.recargar();
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'menta', 'tema tras recargar');

    // El panel con diez temas no se sale de una ventana baja: se desplaza por dentro.
    const baja = await abrir({ alto: 560 });
    await baja.esperar(300);
    await baja.clic('#btn-tema');
    afirmar(await baja.ev(`document.getElementById('panel-tema').getBoundingClientRect().bottom <= innerHeight`), 'el panel cabe en una ventana de 560 px de alto');
    afirmar(await baja.ev(`getComputedStyle(document.getElementById('panel-tema')).overflowY === 'auto'`), 'el panel se desplaza por dentro');
  },
};
