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
// datos: null deja los datos por defecto de la página. topSites simula chrome.topSites.get. sugerenciasGoogle simula las sugerencias de Google. marcadores simula chrome.bookmarks y permisoMarcadores chrome.permissions.
// chrome: { cuotaPorClave, escriturasPorMinuto } simula chrome.storage (ver chrome-falso.js); los datos
// de prueba se guardan entonces en su almacén de sincronización en lugar de en localStorage.
export function crearAbrir(navegador, urlBase) {
  const URL_PAGINA = `${urlBase}/newtab.html`;
  // guardados: entradas extra de localStorage (o del simulador, «chrome.sync/clave») antes de cargar.
  return async function abrir({ ancho = 1440, alto = 900, datos = DATOS_PRUEBA, topSites = null, marcadores = null, permisoMarcadores = 'concedido', sugerenciasGoogle = null, permisoSugerencias = 'concedido', rss = null, permisoRss = 'concedido', servicios = null, permisoServicios = 'concedido', chrome = null, guardados = {} } = {}) {
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
    if (marcadores) {
      // chrome.bookmarks y chrome.permissions simulados; con 'pendiente' el permiso se concede al pedirlo.
      await p.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          let permiso = ${JSON.stringify(permisoMarcadores)};
          window.chrome = Object.assign(window.chrome || {}, {
            bookmarks: { getTree: cb => setTimeout(() => cb(${JSON.stringify(marcadores)}), 5) },
            permissions: {
              contains: (_p, cb) => setTimeout(() => cb(permiso === 'concedido'), 0),
              request: (_p, cb) => setTimeout(() => { window.__solicitudes = (window.__solicitudes || 0) + 1; if (permiso === 'pendiente') permiso = 'concedido'; cb(permiso === 'concedido'); }, 0),
            },
          });
        })()`,
      });
    }
    if (sugerenciasGoogle) {
      // fetch a suggestqueries.google.com simulado ('normal', 'falla' o 'mala') y chrome.permissions para su origen.
      await p.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          let permiso = ${JSON.stringify(permisoSugerencias)};
          window.__sugerencias = [];
          const original = window.fetch.bind(window);
          window.fetch = (url, ...resto) => {
            if (!String(url).startsWith('https://suggestqueries.google.com/')) return original(url, ...resto);
            const q = decodeURIComponent(new URL(url).searchParams.get('q'));
            window.__sugerencias.push(q);
            const modo = ${JSON.stringify(sugerenciasGoogle)};
            if (modo === 'falla') return Promise.reject(new TypeError('Failed to fetch'));
            const cuerpo = modo === 'mala' ? { x: 1 } : [q, [q + 's', q + 'itos']];
            const espera = q === 'ga' ? 400 : 5;
            return new Promise(r => setTimeout(() => r(new Response(JSON.stringify(cuerpo))), espera));
          };
          window.chrome = Object.assign(window.chrome || {}, {
            permissions: {
              contains: (_p, cb) => setTimeout(() => cb(permiso === 'concedido'), 0),
              request: (_p, cb) => setTimeout(() => { if (permiso === 'pendiente') permiso = 'concedido'; cb(permiso === 'concedido'); }, 0),
            },
          });
        })()`,
      });
    }
    if (rss) {
      // fetch simulado de feeds ({ url: xml | 'falla' | 'lento' }) y chrome.permissions para su origen.
      await p.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          let permiso = ${JSON.stringify(permisoRss)};
          const feeds = ${JSON.stringify(rss)};
          window.__rss = [];
          window.__permisos = 0;
          const original = window.fetch.bind(window);
          window.fetch = (url, opciones = {}) => {
            if (!(String(url) in feeds)) return original(url, opciones);
            window.__rss.push(String(url));
            const v = feeds[String(url)];
            if (v === 'falla') return Promise.reject(new TypeError('Failed to fetch'));
            if (v === 'lento') {
              return new Promise((_, rechazar) => opciones.signal?.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError'))));
            }
            return Promise.resolve(new Response(v, { status: 200, headers: { 'content-type': 'application/xml' } }));
          };
          window.chrome = Object.assign(window.chrome || {}, {
            permissions: {
              contains: (_p, cb) => setTimeout(() => cb(permiso === 'concedido'), 0),
              request: (_p, cb) => setTimeout(() => { window.__permisos++; if (permiso === 'pendiente') permiso = 'concedido'; cb(permiso === 'concedido'); }, 0),
            },
          });
        })()`,
      });
    }
    if (servicios) {
      // fetch simulado a los orígenes vigilados ({ origen: 'vivo' | 'cae' | 'cert' | 'cuelga' | 'lento' }) y permisos.
      await p.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          let permiso = ${JSON.stringify(permisoServicios)};
          const modos = ${JSON.stringify(servicios)};
          window.__sondeos = [];
          window.__permisos = 0;
          let vuelo = 0;
          window.__maxVuelo = 0;
          const original = window.fetch.bind(window);
          window.fetch = (url, opciones = {}) => {
            const origen = new URL(String(url)).origin;
            if (!(origen in modos)) return original(url, opciones);
            window.__sondeos.push(origen);
            const modo = modos[origen];
            if (modo === 'cae') return Promise.reject(new TypeError('Failed to fetch'));
            if (modo === 'cert') return origen.startsWith('https:') ? Promise.reject(new TypeError('net::ERR_CERT_AUTHORITY_INVALID')) : Promise.resolve(new Response('', { status: 200 }));
            if (modo === 'cuelga') return new Promise((_, rechazar) => opciones.signal?.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError'))));
            if (modo === 'lento') {
              vuelo++;
              window.__maxVuelo = Math.max(window.__maxVuelo, vuelo);
              return new Promise(r => setTimeout(() => { vuelo--; r(new Response('', { status: 200 })); }, 100));
            }
            return Promise.resolve(new Response('', { status: 200 }));
          };
          window.chrome = Object.assign(window.chrome || {}, {
            permissions: {
              contains: (_p, cb) => setTimeout(() => cb(permiso === 'concedido'), 0),
              request: (_p, cb) => setTimeout(() => { window.__permisos++; if (permiso === 'pendiente') permiso = 'concedido'; cb(permiso === 'concedido'); }, 0),
            },
          });
        })()`,
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
