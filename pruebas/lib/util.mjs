// Abre newtab.html como archivo en Chrome sin ventana, con unos datos de prueba, y ofrece
// atajos para manejar la página: evaluar código, ratón, teclado y leer lo guardado.
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sleep } from './cdp.mjs';
import { DATOS_PRUEBA } from './datos-prueba.mjs';

export const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHROME_FALSO = readFileSync(join(RAIZ, 'pruebas', 'lib', 'chrome-falso.js'), 'utf8');

const TECLAS = {
  Enter: { code: 'Enter', vk: 13, text: '\r' },
  Escape: { code: 'Escape', vk: 27 },
  ArrowDown: { code: 'ArrowDown', vk: 40 },
  ArrowUp: { code: 'ArrowUp', vk: 38 },
  Tab: { code: 'Tab', vk: 9 },
};
const MODIFICADORES = { alt: 1, ctrl: 2, meta: 4, shift: 8 };

export function afirmar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

export function igual(real, esperado, mensaje) {
  const a = JSON.stringify(real);
  const b = JSON.stringify(esperado);
  if (a !== b) throw new Error(`${mensaje}: se esperaba ${b} y se obtuvo ${a}`);
}

// La página se sirve por HTTP desde urlBase (ver servidor.mjs).
// datos: null deja los datos por defecto de la página. topSites simula chrome.topSites.get.
// chrome: { cuotaPorClave, escriturasPorMinuto } simula chrome.storage (ver chrome-falso.js); los datos
// de prueba se guardan entonces en su almacén de sincronización en lugar de en localStorage.
export function crearAbrir(navegador, urlBase) {
  const URL_PAGINA = `${urlBase}/newtab.html`;
  // guardados: entradas extra de localStorage (o del simulador, «chrome.sync/clave») antes de cargar.
  return async function abrir({ ancho = 1440, alto = 900, datos = DATOS_PRUEBA, topSites = null, chrome = null, guardados = {} } = {}) {
    const p = await navegador.newPage({ width: ancho, height: alto });
    const errores = [];
    await p.send('Runtime.enable');
    navegador.on(p.sessionId, 'Runtime.exceptionThrown', e =>
      errores.push(e.exceptionDetails.exception?.description || e.exceptionDetails.text));
    if (chrome) {
      await p.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `window.__configChromeFalso = ${JSON.stringify(chrome)};
${CHROME_FALSO}`,
      });
    }
    if (topSites) {
      await p.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `window.chrome = Object.assign(window.chrome || {}, { topSites: { get: cb => setTimeout(() => cb(${JSON.stringify(topSites)}), 5) } });`,
      });
    }
    await p.goto(URL_PAGINA, { settleMs: 200 });
    const claveDatos = chrome ? 'chrome.sync/datos' : 'datos';
    await p.eval(`localStorage.clear(); ${datos ? `localStorage.setItem('${claveDatos}', ${JSON.stringify(JSON.stringify(datos))});` : ''}
      for (const [k, v] of Object.entries(${JSON.stringify(guardados)})) localStorage.setItem(k, JSON.stringify(v));`);
    await p.goto(URL_PAGINA, { settleMs: 600 });

    const ev = js => p.eval(js);
    const raton = (type, x, y, botones = 1) => p.send('Input.dispatchMouseEvent', {
      type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : botones, clickCount: 1,
    });
    const centro = selector => ev(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) throw new Error('no existe ' + ${JSON.stringify(selector)});
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    })()`);

    return {
      p,
      errores,
      ev,
      raton,
      centro,
      esperar: sleep,
      async clic(selector) {
        await ev(`document.querySelector(${JSON.stringify(selector)}).click()`);
        await sleep(150);
      },
      async arrastrar([x0, y0], [x1, y1], pasos = 10) {
        await raton('mousePressed', x0, y0);
        for (let i = 1; i <= pasos; i++) await raton('mouseMoved', x0 + (x1 - x0) * i / pasos, y0 + (y1 - y0) * i / pasos);
        await raton('mouseReleased', x1, y1);
        await sleep(300);
      },
      async escribir(texto) {
        await p.send('Input.insertText', { text: texto });
        await sleep(200);
      },
      // Enter lleva su carácter (\r): sin él Chrome no envía el formulario como con un teclado real.
      async tecla(nombre, ...mods) {
        const t = TECLAS[nombre] || { code: nombre, vk: 0 };
        const modifiers = mods.reduce((m, k) => m | MODIFICADORES[k], 0);
        for (const type of ['keyDown', 'keyUp']) {
          const text = type === 'keyDown' ? t.text : undefined;
          await p.send('Input.dispatchKeyEvent', { type, key: nombre, code: t.code, windowsVirtualKeyCode: t.vk, modifiers, text });
        }
        await sleep(150);
      },
      // El estado en memoria (con los enlaces dentro de cada grupo), sea cual sea el formato guardado.
      datos: () => ev(`JSON.parse(JSON.stringify(novatab.datos))`),
      async recargar() {
        await p.goto(URL_PAGINA, { settleMs: 600 });
      },
      cerrar: () => p.close(),
    };
  };
}
