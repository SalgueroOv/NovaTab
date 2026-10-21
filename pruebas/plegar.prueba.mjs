import { igual } from './lib/util.mjs';

const plegarAlfa = `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('[data-plegar]').click()`;
const filaGamma = pg => pg.datos().then(d => d.grupos.find(g => g.nombre === 'Gamma').pos.y);

export default {
  nombre: 'plegar: lo de debajo sube y vuelve a su sitio',
  async ejecutar(abrir) {
    const pg = await abrir();
    igual(await filaGamma(pg), 7, 'fila inicial de Gamma');
    await pg.ev(plegarAlfa);
    await pg.esperar(300);
    igual(await filaGamma(pg), 3, 'fila de Gamma con Alfa plegado');
    await pg.ev(plegarAlfa);
    await pg.esperar(300);
    igual(await filaGamma(pg), 7, 'fila de Gamma al desplegar Alfa');
  },
};
