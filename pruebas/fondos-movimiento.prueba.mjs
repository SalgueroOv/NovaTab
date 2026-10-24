import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });
const DOS_PERFILES = {
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'otro', nombre: 'Otro' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA),
  'chrome.sync/perfil:otro:datos': { ...estructura(DATOS_PRUEBA), grupos: [] },
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/perfil:principal:aspecto': { tema: 'bosque', apariencia: { fondo: 'curvas' } },
  'chrome.sync/perfil:otro:aspecto': { tema: 'bosque', apariencia: { fondo: 'curvas' } },
  'chrome.local/perfil-activo': 'principal',
};
const huella = `(() => { const c = document.getElementById('terreno'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; })()`;
const aspecto = parcial => `import('/js/apariencia.js').then(m => m.cambiarApariencia(${JSON.stringify(parcial)}))`;
// Dibujos que hace el fondo en un intervalo de la página.
const dibujosEn = ms => `(async () => { const d0 = novatab.terreno.dibujos; await new Promise(r => setTimeout(r, ${ms})); return novatab.terreno.dibujos - d0; })()`;
const raton = (pg, x, y) => pg.p.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
const altP = async pg => {
  for (const type of ['keyDown', 'keyUp']) await pg.p.send('Input.dispatchKeyEvent', { type, key: 'p', code: 'KeyP', windowsVirtualKeyCode: 80, modifiers: 1 });
};

export default {
  nombre: 'fondos: movimiento, pausa, luz bajo el ratón y transformación al cambiar de perfil',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(2000); // el relieve termina de «subir» al abrir

    // (a) Quieto y sin ratón: no se dibuja.
    await pg.ev(aspecto({ movimiento: 'quieto' }));
    await pg.esperar(200);
    igual(await pg.ev(dibujosEn(1000)), 0, 'quieto: ningún dibujo en 1 s');

    // (b) Lento: se anima, como mucho a unos 30 dibujos por segundo.
    await pg.ev(aspecto({ movimiento: 'lento' }));
    const lento = await pg.ev(dibujosEn(1000));
    afirmar(lento >= 10 && lento <= 35, `lento: entre 10 y 35 dibujos en 1 s (fueron ${lento})`);

    // (d) Con la pestaña oculta no se dibuja.
    await pg.ev(`(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); })()`);
    igual(await pg.ev(dibujosEn(1000)), 0, 'pestaña oculta: ningún dibujo');
    await pg.ev(`(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); })()`);

    // (e) Luz bajo el ratón: con brillo hay elementos iluminados; sin brillo, ninguno.
    await pg.ev(aspecto({ movimiento: 'quieto', brillo: true }));
    await raton(pg, 400, 600);
    await pg.esperar(150);
    afirmar(await pg.ev(`novatab.terreno.estadistica.luz`) > 0, 'con brillo se ilumina lo que hay bajo el ratón');
    await pg.ev(aspecto({ brillo: false }));
    await raton(pg, 410, 600);
    await pg.esperar(150);
    igual(await pg.ev(`novatab.terreno.estadistica.luz`), 0, 'sin brillo no se ilumina nada');

    // (f) La luz se difumina: la capa exterior es casi transparente y crece hacia el centro.
    const alfas = await pg.ev(`import('/js/fondos.js').then(m => Array.from({ length: m.BINS }, (_, i) => m.alfaLuz(i, 0.9)))`);
    afirmar(alfas[0] < 0.05, `la capa exterior casi no se ve (${alfas[0]})`);
    afirmar(alfas.every((a, i) => i === 0 || a > alfas[i - 1]), 'cada capa más opaca que la anterior');
    afirmar(alfas[alfas.length - 1] > 0.5, 'el centro se ve bien');

    // (i) Cambiar de tema redibuja el fondo con la tinta nueva, también con el fondo quieto (al final de la transición).
    await pg.ev(aspecto({ movimiento: 'quieto', brillo: false }));
    await pg.ev(`import('/js/apariencia.js').then(m => m.ponerTema('papel'))`);
    await pg.esperar(1300);
    const rojoMedio = await pg.ev(`(() => { const c = document.getElementById('terreno'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20) { s += d[i]; n++; } return n ? s / n : 255; })()`);
    afirmar(rojoMedio < 100, `las líneas toman la tinta oscura de Papel (rojo medio ${Math.round(rojoMedio)})`);
    await pg.ev(`import('/js/apariencia.js').then(m => m.ponerTema('bosque'))`);

    // (c) Con movimiento reducido, ni siquiera «vivo» anima.
    pg = await abrir({ reducirMovimiento: true });
    await pg.esperar(500);
    await pg.ev(aspecto({ movimiento: 'vivo' }));
    await pg.esperar(200);
    igual(await pg.ev(dibujosEn(1000)), 0, 'movimiento reducido: ningún dibujo con vivo');

    // (g) Cambiar de perfil transforma el relieve en el del perfil nuevo.
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES });
    await pg.esperar(2000);
    await pg.ev(aspecto({ movimiento: 'quieto' }));
    await pg.esperar(200);
    const antes = await pg.ev(huella);
    await pg.ev(`import('/js/perfiles-ops.js').then(m => m.cambiarPerfil('otro'))`);
    await pg.esperar(100);
    afirmar(await pg.ev(`novatab.terreno.campoB !== null`), 'empieza la transformación');
    afirmar(await pg.ev(dibujosEn(500)) >= 12, 'durante la transformación se dibuja en cada fotograma');
    await pg.esperar(1500);
    afirmar(await pg.ev(`novatab.terreno.campoB === null`), 'la transformación termina');
    igual(await pg.ev(`novatab.terreno.op.semilla`), 'otro', 'con la semilla del perfil nuevo');
    afirmar(await pg.ev(huella) !== antes, 'y otro relieve');

    // (h) Alt+P muchas veces seguidas: sin errores y con la semilla del perfil que queda activo.
    for (let i = 0; i < 8; i++) {
      await altP(pg);
      await pg.esperar(50);
    }
    await pg.esperar(2000);
    igual(pg.errores, [], 'sin errores con cambios de perfil seguidos');
    igual(await pg.ev(`novatab.terreno.op.semilla`), await pg.ev(`import('/js/perfiles.js').then(m => m.perfilActivo())`), 'la semilla es la del perfil activo');
    afirmar(await pg.ev(`novatab.terreno.campoB === null`), 'sin transformaciones a medias');
  },
};
