import { afirmar, igual } from './lib/util.mjs';

const modulo = `import('/js/apariencia.js')`;
const columnas = `getComputedStyle(document.querySelector('.pagina')).gridTemplateColumns`;
const opcionesSync = `JSON.parse(localStorage.getItem('chrome.sync/opciones') || 'null')`;
// Medidas: el contenido de la página (sin su relleno), el hueco entre paneles y el borde del panel izquierdo.
const medidas = `(() => {
  const p = document.querySelector('.pagina');
  const e = getComputedStyle(p);
  const r = p.getBoundingClientRect();
  const izq = document.querySelector('.izquierda').getBoundingClientRect();
  const s = document.getElementById('separador-paneles').getBoundingClientRect();
  const ini = r.left + parseFloat(e.paddingLeft);
  return { ini, ancho: r.width - parseFloat(e.paddingLeft) - parseFloat(e.paddingRight), hueco: parseFloat(e.columnGap), izqAncho: izq.width, izqDer: izq.right, sepCentro: s.left + s.width / 2, sepY: s.top + s.height / 2 };
})()`;
const xDe = (m, pct) => m.ini + m.ancho * pct / 100 + m.hueco / 2;

export default {
  nombre: 'separador: ancho del panel izquierdo arrastrable, con teclado y restaurable',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) Normalizar.
    const valores = await pg.ev(`${modulo}.then(m => [30, 25, 50, 24, 51, 90, -5, 'x', null, undefined, 33.6].map(v => m.normalizarAnchoIzq(v)))`);
    igual(valores, [30, 25, 50, null, null, null, null, null, null, null, 34], 'normalizarAnchoIzq');

    // (b) Un valor guardado con basura vale el ancho de siempre.
    const defecto = await pg.ev(columnas);
    pg = await abrir({ guardados: { opciones: { anchoIzq: 90 } } });
    await pg.esperar(300);
    igual(await pg.ev(columnas), defecto, 'ancho de siempre con anchoIzq 90');
    afirmar(!(await pg.ev(`document.body.classList.contains('ancho-izq')`)), 'sin la clase ancho-izq');

    // (c) Arrastrar: se aplica al momento, se limita a 25-50 y se guarda una sola vez al soltar.
    pg = await abrir({ chrome: {} });
    await pg.esperar(400);
    let m = await pg.ev(medidas);
    await pg.ev(`__chromeFalso.escritas()`);
    await pg.raton('mousePressed', m.sepCentro, m.sepY);
    await pg.raton('mouseMoved', xDe(m, 33), m.sepY);
    await pg.raton('mouseMoved', xDe(m, 30), m.sepY);
    await pg.esperar(100);
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '30', 'aria-valuenow durante el arrastre');
    igual(await pg.ev(`document.documentElement.style.getPropertyValue('--ancho-izq')`), '30%', 'variable CSS durante el arrastre');
    igual((await pg.ev(`__chromeFalso.escritas()`)).filter(k => k === 'opciones').length, 0, 'sin escrituras mientras se arrastra');
    await pg.raton('mouseReleased', xDe(m, 30), m.sepY);
    await pg.esperar(400);
    igual((await pg.ev(`__chromeFalso.escritas()`)).filter(k => k === 'opciones').length, 1, 'una escritura al soltar');
    igual((await pg.ev(opcionesSync)).anchoIzq, 30, 'anchoIzq guardado');
    m = await pg.ev(medidas);
    afirmar(Math.abs(m.izqAncho - m.ancho * 0.30) <= 2, `la columna izquierda mide el 30 % (mide ${m.izqAncho} de ${m.ancho})`);

    for (const [pct, esperado] of [[10, 25], [80, 50]]) {
      m = await pg.ev(medidas);
      await pg.arrastrar([m.sepCentro, m.sepY], [xDe(m, pct), m.sepY], 6);
      await pg.esperar(450);
      igual((await pg.ev(opcionesSync)).anchoIzq, esperado, `arrastrar hasta el ${pct} % se queda en ${esperado}`);
    }

    // (d) Se conserva al recargar y el doble clic lo restaura.
    await pg.recargar();
    await pg.esperar(400);
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '50', 'valor tras recargar');
    await pg.ev(`document.getElementById('separador-paneles').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
    await pg.esperar(450);
    igual((await pg.ev(opcionesSync)).anchoIzq, null, 'doble clic vuelve a null');
    igual(await pg.ev(columnas), defecto, 'y al ancho de siempre');

    // (e) Teclado: ±1 punto, sin pasar de 25 ni de 50.
    pg = await abrir({ guardados: { opciones: { anchoIzq: 30 } } });
    await pg.esperar(400);
    await pg.ev(`document.getElementById('separador-paneles').focus()`);
    await pg.tecla('ArrowRight');
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '31', 'ArrowRight suma uno');
    await pg.tecla('ArrowLeft');
    await pg.tecla('ArrowLeft');
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '29', 'ArrowLeft resta uno');
    pg = await abrir({ guardados: { opciones: { anchoIzq: 25 } } });
    await pg.esperar(400);
    await pg.ev(`document.getElementById('separador-paneles').focus()`);
    await pg.tecla('ArrowLeft');
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '25', 'no baja de 25');
    pg = await abrir({ guardados: { opciones: { anchoIzq: 50 } } });
    await pg.esperar(400);
    await pg.ev(`document.getElementById('separador-paneles').focus()`);
    await pg.tecla('ArrowRight');
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '50', 'no sube de 50');

    // (f) No se ve con un panel oculto ni con la pantalla estrecha.
    const visible = () => pg.ev(`getComputedStyle(document.getElementById('separador-paneles')).display !== 'none'`);
    pg = await abrir();
    await pg.esperar(300);
    afirmar(await visible(), 'visible con los dos paneles');
    await pg.clic('#btn-panel-izq');
    igual(await visible(), false, 'oculto con body.sin-izq');
    await pg.clic('#btn-panel-izq');
    await pg.clic('#btn-panel-der');
    igual(await visible(), false, 'oculto con body.sin-der');
    pg = await abrir({ ancho: 900 });
    await pg.esperar(300);
    igual(await visible(), false, 'oculto con 900 px de ancho');

    // (g) Tras cambiar el tamaño de la ventana sigue pegado al borde del panel izquierdo.
    pg = await abrir({ guardados: { opciones: { anchoIzq: 30 } } });
    await pg.esperar(400);
    await pg.p.setViewport({ width: 1200, height: 900 });
    await pg.esperar(500);
    m = await pg.ev(medidas);
    afirmar(Math.abs(m.sepCentro - (m.izqDer + m.hueco / 2)) <= 2, `el separador sigue en el borde del panel izquierdo (centro ${m.sepCentro}, borde ${m.izqDer + m.hueco / 2})`);

    // (h) Con el separador movido, mover bloques con el ratón sigue cayendo en su celda.
    pg = await abrir({ guardados: { opciones: { anchoIzq: 30 } } });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    const [col, fila] = await pg.ev(`(() => { const r = document.querySelector('#rejilla'); const e = getComputedStyle(r); return [(r.getBoundingClientRect().width + parseFloat(e.columnGap)) / 12, parseFloat(e.gridAutoRows) + parseFloat(e.rowGap)]; })()`);
    const [x, y] = await pg.ev(`(() => { const r = [...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Beta').querySelector('h3').getBoundingClientRect(); return [r.left + 10, r.top + r.height / 2]; })()`);
    await pg.arrastrar([x, y], [x - 6 * col, y + 7 * fila]);
    const beta = (await pg.datos()).grupos.find(g => g.nombre === 'Beta').pos;
    igual(beta.x, 1, 'Beta en la columna 1 con el separador movido');
    afirmar(beta.y >= 8, `Beta en la fila 8 o más abajo (está en la ${beta.y})`);

    // (i) Un eco de opciones de otra pestaña no pisa el valor que se arrastra.
    pg = await abrir({ chrome: {} });
    await pg.esperar(400);
    m = await pg.ev(medidas);
    await pg.raton('mousePressed', m.sepCentro, m.sepY);
    await pg.raton('mouseMoved', xDe(m, 32), m.sepY);
    await pg.ev(`__chromeFalso.remoto('sync', 'opciones', { anchoIzq: 40 })`);
    await pg.esperar(200);
    await pg.raton('mouseMoved', xDe(m, 28), m.sepY);
    await pg.raton('mouseReleased', xDe(m, 28), m.sepY);
    await pg.esperar(450);
    igual((await pg.ev(opcionesSync)).anchoIzq, 28, 'se guarda lo arrastrado, no el eco de fuera');

    // ---- Revisión final ----
    // (j) Un cambio de otra pestaña llegado durante el arrastre se conserva al soltar (solo el ancho es mío).
    pg = await abrir({ chrome: {} });
    await pg.esperar(400);
    m = await pg.ev(medidas);
    await pg.raton('mousePressed', m.sepCentro, m.sepY);
    await pg.raton('mouseMoved', xDe(m, 32), m.sepY);
    await pg.ev(`__chromeFalso.remoto('sync', 'opciones', { sobrio: true, anchoIzq: 45 })`);
    await pg.esperar(200);
    await pg.raton('mouseMoved', xDe(m, 28), m.sepY);
    await pg.raton('mouseReleased', xDe(m, 28), m.sepY);
    await pg.esperar(500);
    let g = await pg.ev(opcionesSync);
    igual([g.anchoIzq, g.sobrio], [28, true], 'se guarda mi ancho y el cambio de la otra pestaña');
    afirmar(await pg.ev(`document.body.classList.contains('sobrio')`), 'esta pestaña también lo aplica');
    // Un simple clic (sin mover) tampoco deja la pestaña desfasada.
    pg = await abrir({ chrome: {} });
    await pg.esperar(400);
    m = await pg.ev(medidas);
    await pg.raton('mousePressed', m.sepCentro, m.sepY);
    await pg.ev(`__chromeFalso.remoto('sync', 'opciones', { sobrio: true })`);
    await pg.esperar(200);
    await pg.raton('mouseReleased', m.sepCentro, m.sepY);
    await pg.esperar(300);
    afirmar(await pg.ev(`document.body.classList.contains('sobrio')`), 'el cambio llegado durante un clic se aplica al soltar');

    // (k) Con el ancho de siempre en una ventana de 1100 px, ArrowRight ensancha (no encoge) el panel.
    pg = await abrir({ ancho: 1100 });
    await pg.esperar(400);
    const antes = (await pg.ev(medidas)).izqAncho;
    await pg.ev(`document.getElementById('separador-paneles').focus()`);
    await pg.tecla('ArrowRight');
    await pg.esperar(100);
    const despues = (await pg.ev(medidas)).izqAncho;
    afirmar(despues > antes, `el panel crece con ArrowRight (de ${antes} a ${despues})`);
    afirmar(Math.abs(Number(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`)) - despues / (await pg.ev(medidas)).ancho * 100) <= 1.5, 'aria-valuenow corresponde al ancho real');

    // (l) Home y End, y aria-valuetext.
    pg = await abrir({ guardados: { opciones: { anchoIzq: 30 } } });
    await pg.esperar(400);
    await pg.ev(`document.getElementById('separador-paneles').focus()`);
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuetext')`), '30 %', 'aria-valuetext');
    await pg.tecla('Home');
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '25', 'Inicio: 25');
    await pg.tecla('End');
    igual(await pg.ev(`document.getElementById('separador-paneles').getAttribute('aria-valuenow')`), '50', 'Fin: 50');
  },
};
