import { afirmar, igual } from './lib/util.mjs';

const IDS = ['curvas', 'grafo', 'teselas', 'ondas', 'puntos', 'rayas', 'cuadricula', 'hexagonos', 'anillos', 'montanas'];
const modulo = `import('/js/fondos.js')`;
const opcionesGuardadas = `JSON.parse(localStorage.getItem('opciones'))`;

export default {
  nombre: 'fondos: diez dibujos deterministas, liso e intensidad',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) Los diez ids, con nombres distintos.
    igual(await pg.ev(`${modulo}.then(m => Object.keys(m.FONDOS))`), IDS, 'ids de FONDOS');
    const nombres = await pg.ev(`${modulo}.then(m => Object.values(m.FONDOS).map(f => f.nombre))`);
    afirmar(nombres.every(n => typeof n === 'string' && n) && new Set(nombres).size === IDS.length, 'nombres no vacíos y distintos');

    // (b) y (c) Cada dibujo: solo path/circle/line/polygon, sin colores, determinista, y todos distintos.
    const dibujos = await pg.ev(`${modulo}.then(m => Object.fromEntries(Object.entries(m.FONDOS).map(([id, f]) => [id, [f.dibujar(1440, 900), f.dibujar(1440, 900)]])))`);
    for (const id of IDS) {
      const [a, b] = dibujos[id];
      igual(a === b, true, `${id} es determinista`);
      const etiquetas = [...a.matchAll(/<([a-z]+)/g)].map(m => m[1]);
      afirmar(etiquetas.length >= 10, `${id} tiene al menos 10 elementos (tiene ${etiquetas.length})`);
      afirmar(etiquetas.every(e => ['path', 'circle', 'line', 'polygon'].includes(e)), `${id} usa solo path, circle, line y polygon`);
      afirmar(!/\s(fill|stroke)=/.test(a), `${id} no lleva colores en atributos`);
    }
    afirmar(new Set(IDS.map(id => dibujos[id][0])).size === IDS.length, 'los diez dibujos son distintos');

    // (d) Elegir una muestra cambia el fondo y se recuerda; «liso» lo deja vacío.
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    const contenido = () => pg.ev(`document.getElementById('fondo').innerHTML`);
    const vistos = new Set();
    for (const id of IDS) {
      await pg.ev(`document.querySelector('[data-fondo="${id}"]').click()`);
      await pg.esperar(100);
      vistos.add(await contenido());
      igual((await pg.ev(opcionesGuardadas)).apariencia.fondo, id, `fondo guardado: ${id}`);
    }
    igual(vistos.size, IDS.length, 'cada muestra pinta un fondo distinto');
    await pg.ev(`document.querySelector('[data-fondo="rayas"]').click()`);
    await pg.recargar();
    await pg.esperar(300);
    afirmar((await contenido()).includes('<line'), 'rayas sobrevive a la recarga');
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    await pg.ev(`document.querySelector('[data-fondo="liso"]').click()`);
    await pg.esperar(100);
    igual(await pg.ev(`document.querySelectorAll('#fondo path, #fondo line, #fondo circle, #fondo polygon').length`), 0, 'liso no dibuja nada');

    // (e) Intensidad.
    await pg.ev(`document.querySelector('[data-fondo="curvas"]').click()`);
    await pg.ev(`(() => { const e = document.getElementById('intensidad'); e.value = '30'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await pg.esperar(100);
    igual(await pg.ev(`getComputedStyle(document.getElementById('fondo')).opacity`), '0.3', 'opacidad con intensidad 30');
    igual((await pg.ev(opcionesGuardadas)).apariencia.intensidad, 30, 'intensidad guardada');
    await pg.ev(`(() => { const e = document.getElementById('intensidad'); e.value = '0'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await pg.esperar(100);
    igual(await pg.ev(`getComputedStyle(document.getElementById('fondo')).opacity`), '0', 'con intensidad 0 no se ve');

    // (f) Al cambiar el tamaño de la ventana queda un solo dibujo del tamaño nuevo.
    await pg.p.setViewport({ width: 1000, height: 700 });
    await pg.esperar(500);
    igual(await pg.ev(`document.querySelectorAll('#fondo svg').length`), 1, 'un solo svg tras redimensionar');
    igual(await pg.ev(`document.querySelector('#fondo svg').getAttribute('viewBox')`), `0 0 ${await pg.ev('innerWidth')} ${await pg.ev('innerHeight')}`, 'viewBox con el tamaño nuevo');
  },
};
