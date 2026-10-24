import { afirmar, igual } from './lib/util.mjs';

// [id, modo, fondo, acento] de los once temas incluidos (js/temas.js).
const TEMAS = [
  ['bosque', 'oscuro', '#18221d', '#a8d672'],
  ['noche', 'oscuro', '#111316', '#f2b35b'],
  ['medianoche', 'oscuro', '#14171c', '#7fb0e8'],
  ['grafito', 'oscuro', '#1b1b1d', '#d6b25e'],
  ['carbon', 'oscuro', '#18181b', '#ff7a45'],
  ['abismo', 'oscuro', '#0b191d', '#4fd1c5'],
  ['papel', 'claro', '#f5f0e6', '#2a4fb0'],
  ['glaciar', 'claro', '#eaf2f6', '#0a7099'],
  ['niebla', 'claro', '#eef1f5', '#3d6a9e'],
  ['menta', 'claro', '#eef6f2', '#1b7d4c'],
  ['rosa', 'claro', '#fbf1f2', '#bd2d57'],
];

const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
function luminosidad(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const sobreAcento = hex => {
  const l = luminosidad(hex);
  return (l + 0.05) / 0.0637 > 1.05 / (l + 0.05) ? '#1f1f1f' : '#ffffff';
};
const variables = `(() => { const e = getComputedStyle(document.documentElement); return ['--bg', '--acento', '--sobre-acento'].map(v => e.getPropertyValue(v).trim()); })()`;

export default {
  nombre: 'temas: once tríos de color, con superficies derivadas, acento propio y el elegido se recuerda',
  async ejecutar(abrir) {
    const pg = await abrir({ reducirMovimiento: true });
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    igual(await pg.ev(`[...document.querySelectorAll('#muestras .muestra')].map(m => m.dataset.tema)`), TEMAS.map(t => t[0]), 'muestras de tema');

    const fondos = new Set();
    const paneles = {};
    for (const [id, modo, bg, acento] of TEMAS) {
      await pg.ev(`document.querySelector('.muestra[data-tema="${id}"]').click()`);
      await pg.esperar(60);
      igual(await pg.ev(`[document.documentElement.dataset.tema, document.documentElement.dataset.modo]`), [id, modo], `tema y modo de ${id}`);
      igual(await pg.ev(variables), [rgb(bg), acento, sobreAcento(acento)], `fondo, acento y texto sobre el acento de ${id}`);
      igual(await pg.ev(`document.querySelector('.muestra[data-tema="${id}"]').getAttribute('aria-pressed')`), 'true', `muestra de ${id} marcada`);
      paneles[id] = await pg.ev(`getComputedStyle(document.getElementById('panel-tema')).backgroundColor`);
      afirmar(paneles[id] !== 'rgb(42, 45, 51)', `${id}: el panel ya no es el gris fijo de antes`);
      fondos.add(bg);
    }
    igual(fondos.size, TEMAS.length, 'cada tema tiene un fondo distinto');
    afirmar(paneles.bosque !== paneles.noche, 'el panel se tiñe con el tema');

    await pg.ev(`document.querySelector('.muestra[data-tema="menta"]').click()`);
    await pg.recargar();
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'menta', 'tema tras recargar');

    // El panel con once temas no se sale de una ventana baja: se desplaza por dentro.
    const baja = await abrir({ alto: 560, reducirMovimiento: true });
    await baja.esperar(300);
    await baja.clic('#btn-tema');
    afirmar(await baja.ev(`document.getElementById('panel-tema').getBoundingClientRect().bottom <= innerHeight`), 'el panel cabe en una ventana de 560 px de alto');
    afirmar(await baja.ev(`getComputedStyle(document.getElementById('panel-tema')).overflowY === 'auto'`), 'el panel se desplaza por dentro');
  },
};
