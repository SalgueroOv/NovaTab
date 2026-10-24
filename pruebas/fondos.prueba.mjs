import { afirmar, igual } from './lib/util.mjs';

const IDS = ['curvas', 'cotas', 'sombreado', 'crestas', 'grafo', 'rayas', 'rombos', 'trama', 'galaxia'];
const modulo = `import('/js/fondos.js')`;
const opcionesGuardadas = `JSON.parse(localStorage.getItem('perfil:principal:aspecto'))`;
// Píxeles pintados del canvas del fondo y una huella de todo su contenido.
const pixeles = `(() => { const c = document.getElementById('terreno'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()`;
const huella = `(() => { const c = document.getElementById('terreno'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; })()`;
const elegir = id => `document.querySelector('#muestras-fondo [data-fondo="${id}"]').click()`;
const abrirFondo = async pg => {
  await pg.clic('#btn-tema');
  await pg.ev(`document.querySelector('#panel-tema [data-pestana="tema"]').click()`);
};

export default {
  nombre: 'fondos: nueve dibujos en canvas, deterministas, con liso, intensidad y tinta del tema',
  async ejecutar(abrir) {
    let pg = await abrir({ reducirMovimiento: true });
    await pg.esperar(400);

    // (a) Los nueve ids, con nombres distintos.
    igual(await pg.ev(`${modulo}.then(m => Object.keys(m.FONDOS))`), IDS, 'ids de FONDOS');
    const nombres = await pg.ev(`${modulo}.then(m => Object.values(m.FONDOS).map(f => f.nombre))`);
    afirmar(nombres.every(n => typeof n === 'string' && n) && new Set(nombres).size === IDS.length, 'nombres no vacíos y distintos');

    // (b) Cada muestra pinta su dibujo y se guarda; los nueve son distintos.
    await abrirFondo(pg);
    const huellas = new Set();
    for (const id of IDS) {
      await pg.ev(elegir(id));
      await pg.esperar(150);
      afirmar(await pg.ev(pixeles) > 2000, `${id} pinta el canvas`);
      igual((await pg.ev(opcionesGuardadas)).apariencia.fondo, id, `fondo guardado: ${id}`);
      huellas.add(await pg.ev(huella));
    }
    igual(huellas.size, IDS.length, 'los nueve dibujos son distintos');

    // (c) Determinista: dos dibujos seguidos dan lo mismo.
    const a = await pg.ev(`(() => { novatab.terreno.dibujar(); return ${huella}; })()`);
    const b = await pg.ev(`(() => { novatab.terreno.dibujar(); return ${huella}; })()`);
    igual(a, b, 'dos dibujos seguidos son iguales');

    // (d) «Liso» oculta el canvas; rayas sobrevive a la recarga.
    await pg.ev(elegir('liso'));
    await pg.esperar(100);
    afirmar(await pg.ev(`document.getElementById('terreno').hidden`), 'liso oculta el canvas');
    await pg.ev(elegir('rayas'));
    await pg.recargar();
    await pg.esperar(400);
    igual((await pg.ev(opcionesGuardadas)).apariencia.fondo, 'rayas', 'rayas guardado');
    afirmar(await pg.ev(pixeles) > 2000, 'rayas se pinta tras recargar');

    // (e) Intensidad.
    await abrirFondo(pg);
    await pg.ev(`(() => { const e = document.getElementById('intensidad'); e.value = '30'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await pg.esperar(450);
    igual(await pg.ev(`getComputedStyle(document.getElementById('fondo')).opacity`), '0.3', 'opacidad con intensidad 30');
    igual((await pg.ev(opcionesGuardadas)).apariencia.intensidad, 30, 'intensidad guardada');

    // (f) Al cambiar el tamaño, el canvas toma el tamaño nuevo (por la densidad de píxeles).
    await pg.p.setViewport({ width: 1000, height: 700 });
    await pg.esperar(500);
    igual(await pg.ev(`document.getElementById('terreno').width`), await pg.ev(`Math.round(1000 * Math.min(2, devicePixelRatio || 1))`), 'ancho interno del canvas tras redimensionar');

    // (g) El dibujo usa la tinta del tema: Bosque y Papel dan dibujos distintos.
    pg = await abrir({ reducirMovimiento: true, guardados: { 'perfil:principal:aspecto': { tema: 'bosque', apariencia: { fondo: 'curvas' } } } });
    await pg.esperar(400);
    const enBosque = await pg.ev(huella);
    await pg.ev(`import('/js/apariencia.js').then(m => m.ponerTema('papel'))`);
    await pg.esperar(200);
    afirmar(await pg.ev(huella) !== enBosque, 'la tinta cambia con el tema');

    // (h) Rendimiento: ningún estilo pasa de 40 ms por dibujo a 1440×900.
    const tiempos = await pg.ev(`(async () => {
      const ap = await import('/js/apariencia.js');
      const t = {};
      for (const id of ${JSON.stringify(IDS)}) {
        ap.cambiarApariencia({ fondo: id });
        await new Promise(r => setTimeout(r, 50));
        const t0 = performance.now();
        for (let i = 0; i < 5; i++) novatab.terreno.dibujar();
        t[id] = Math.round((performance.now() - t0) / 5 * 10) / 10;
      }
      return t;
    })()`);
    console.log('    tiempos por dibujo (ms):', JSON.stringify(tiempos));
    for (const [id, ms] of Object.entries(tiempos)) afirmar(ms < 40, `${id} tarda ${ms} ms por dibujo`);
  },
};
