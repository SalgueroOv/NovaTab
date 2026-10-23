import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const URL_FEED = 'https://feeds.example.com/noticias.xml';
const modulo = `import('/js/widgets/rss.js')`;
const widgetRss = (config = { url: URL_FEED, cantidad: 5 }) => conWidgets([{ id: 'w-rss', tipo: 'rss', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 10 }, config }]);
const item = (i, extra = '') => `<item><title>Titular ${i}${extra}</title><link>https://noticias.example.com/${i}</link><pubDate>Mon, 20 Oct 2026 0${i % 10}:00:00 GMT</pubDate></item>`;
const rssXml = (n, titulo = 'Mis noticias') => `<?xml version="1.0"?><rss version="2.0"><channel><title>${titulo}</title>${Array.from({ length: n }, (_, i) => item(i + 1)).join('')}</channel></rss>`;
const ATOM = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title>
  <entry><title>Uno</title><link rel="self" href="https://atom.example.com/self"/><link rel="alternate" href="https://atom.example.com/uno"/><updated>2026-10-20T10:00:00Z</updated></entry>
  <entry><title>Dos</title><link href="https://atom.example.com/dos"/><updated>2026-10-20T11:00:00Z</updated></entry></feed>`;
const titulares = pg => pg.ev(`[...document.querySelectorAll('.widget-rss .rss-item a')].map(a => a.textContent)`);
const aviso = pg => pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`);
const feedsEn = rss => ({ chrome: {}, rss, datos: widgetRss() });

export default {
  nombre: 'RSS: lectura de feeds, permiso del sitio, caché y fallos',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) leerFeed.
    const leer = xml => pg.ev(`${modulo}.then(m => m.leerFeed(${JSON.stringify(xml)}))`);
    let f = await leer(rssXml(3));
    igual([f.titulo, f.items.length, f.items[0].titulo, f.items[0].enlace], ['Mis noticias', 3, 'Titular 1', 'https://noticias.example.com/1'], 'RSS 2.0');
    afirmar(typeof f.items[0].fecha === 'number', 'la fecha es un número');
    f = await leer(ATOM);
    igual(f.items.map(i => [i.titulo, i.enlace]), [['Uno', 'https://atom.example.com/uno'], ['Dos', 'https://atom.example.com/dos']], 'Atom, con link alternate');
    for (const malo of ['<html><body>no soy un feed</body></html>', '', '<a><b/></a>', '<rss><channel>']) igual(await leer(malo), null, `«${malo.slice(0, 20)}» no es un feed`);
    f = await leer(`<rss><channel><title>t</title><item><title>Malo</title><link>javascript:alert(1)</link></item><item><link>https://x.example.com/</link></item><item><title>Bueno</title><link>https://ok.example.com/</link></item></channel></rss>`);
    igual(f.items.map(i => i.titulo), ['Bueno'], 'sin enlaces javascript: ni elementos sin título');
    igual((await leer(rssXml(80))).items.length, 50, 'como mucho 50 elementos');
    f = await leer(`<rss><channel><title>t</title><item><title><![CDATA[<b>x</b> & y]]></title><link>https://x.example.com/</link></item></channel></rss>`);
    igual(f.items[0].titulo, '<b>x</b> & y', 'CDATA como texto');

    // (b) Añadir un widget: el permiso se pide dentro del clic de Guardar.
    const anadir = async (pg, url) => {
      await pg.clic('#btn-editar');
      await pg.clic('#btn-nuevo-widget');
      await pg.esperar(200);
      await pg.ev(`[...document.querySelectorAll('#dlg-widget .tipo-widget')].find(b => b.textContent.startsWith('RSS')).click()`);
      await pg.esperar(300);
      await pg.ev(`document.querySelector('#dlg-widget input[type="text"]').value = ${JSON.stringify(url)}`);
      await pg.clic('#dlg-widget button[value="ok"]');
      await pg.esperar(500);
    };
    pg = await abrir({ chrome: {}, rss: { [URL_FEED]: rssXml(10) }, permisoRss: 'pendiente' });
    await pg.esperar(300);
    await anadir(pg, URL_FEED);
    igual(await pg.ev(`window.__permisos`), 1, 'se pidió el permiso una vez');
    igual(await pg.ev(`novatab.datos.widgets.map(w => [w.tipo, w.config.url, w.config.cantidad])`), [['rss', URL_FEED, 5]], 'widget guardado con 5 titulares');
    igual((await titulares(pg)).length, 5, 'cinco titulares');
    pg = await abrir({ chrome: {}, rss: { [URL_FEED]: rssXml(10) }, permisoRss: 'denegado' });
    await pg.esperar(300);
    await anadir(pg, URL_FEED);
    afirmar(await pg.ev(`document.getElementById('dlg-widget').open`), 'denegado: el diálogo sigue abierto');
    igual(await aviso(pg), 'Sin permiso para leer ese feed', 'aviso de permiso denegado');
    igual(await pg.ev(`novatab.datos.widgets.length`), 0, 'nada guardado');
    for (const url of ['ftp://feeds.example.com/x', 'javascript:alert(1)', 'no es una url']) {
      await pg.ev(`document.querySelector('#dlg-widget input[type="text"]').value = ${JSON.stringify(url)}`);
      const antes = await pg.ev(`window.__permisos`);
      await pg.clic('#dlg-widget button[value="ok"]');
      await pg.esperar(200);
      igual(await pg.ev(`window.__permisos`), antes, `«${url}» no pide permiso`);
      afirmar(await pg.ev(`document.getElementById('dlg-widget').open`), `«${url}» no se acepta`);
    }

    // (c) El widget: 5 y 10 titulares, enlaces seguros y títulos literales.
    for (const cantidad of [5, 10]) {
      pg = await abrir({ chrome: {}, rss: { [URL_FEED]: rssXml(12) }, datos: widgetRss({ url: URL_FEED, cantidad }) });
      await pg.esperar(600);
      igual((await titulares(pg)).length, cantidad, `${cantidad} titulares`);
    }
    const enlace = await pg.ev(`(() => { const a = document.querySelector('.widget-rss .rss-item a'); return [a.getAttribute('href'), a.target, a.rel]; })()`);
    igual(enlace, ['https://noticias.example.com/1', '_blank', 'noopener noreferrer'], 'enlace del titular');
    pg = await abrir({ chrome: {}, rss: { [URL_FEED]: `<rss><channel><title>t</title><item><title><![CDATA[<img src=x onerror="window.__xss=1"> & <b>x</b>]]></title><link>https://x.example.com/</link></item></channel></rss>` }, datos: widgetRss() });
    await pg.esperar(600);
    igual((await titulares(pg))[0], '<img src=x onerror="window.__xss=1"> & <b>x</b>', 'título literal');
    igual(await pg.ev(`document.querySelectorAll('.widget-rss img, .widget-rss b').length + (window.__xss ?? 0)`), 0, 'nada interpretado como HTML');

    // (d) Caché de 30 minutos, en local y nunca en sync; recargar fuerza la petición.
    pg = await abrir(feedsEn({ [URL_FEED]: rssXml(5) }));
    await pg.esperar(600);
    igual(await pg.ev(`window.__rss.length`), 1, 'una petición la primera vez');
    const cache = JSON.parse(await pg.ev(`localStorage.getItem('chrome.local/rss:w-rss')`));
    igual(cache.items.length, 5, 'caché en local');
    igual(await pg.ev(`localStorage.getItem('chrome.sync/rss:w-rss')`), null, 'nada en sync');
    await pg.recargar();
    await pg.esperar(600);
    igual(await pg.ev(`window.__rss.length`), 0, 'sin petición si la caché tiene menos de 30 minutos');
    igual((await titulares(pg)).length, 5, 'pero se ven los titulares');
    await pg.ev(`localStorage.setItem('chrome.local/rss:w-rss', ${JSON.stringify(JSON.stringify({ ...cache, t: Date.now() - 31 * 60000 }))})`);
    await pg.recargar();
    await pg.esperar(600);
    igual(await pg.ev(`window.__rss.length`), 1, 'con la caché de hace 31 minutos, sí');
    await pg.ev(`document.querySelector('.widget-rss .rss-recargar').click()`);
    await pg.esperar(500);
    igual(await pg.ev(`window.__rss.length`), 2, 'el botón de recargar fuerza la petición');

    // (e) Fallos: con caché se enseña la caché; sin caché, el error; lento, se corta.
    pg = await abrir(feedsEn({ [URL_FEED]: 'falla' }));
    await pg.ev(`localStorage.setItem('chrome.local/rss:w-rss', ${JSON.stringify(JSON.stringify({ t: Date.now() - 40 * 60000, url: URL_FEED, titulo: 'Vieja', items: [{ titulo: 'De la caché', enlace: 'https://c.example.com/', fecha: null }] }))})`);
    await pg.recargar();
    await pg.esperar(700);
    igual(await titulares(pg), ['De la caché'], 'con el feed caído se muestra la caché');
    afirmar((await pg.ev(`document.querySelector('.widget-rss .widget-nota, .widget-rss .rss-estado')?.textContent ?? ''`)).includes('No se pudo actualizar'), 'y avisa de que no se pudo actualizar');
    pg = await abrir(feedsEn({ [URL_FEED]: 'falla' }));
    await pg.esperar(700);
    afirmar((await pg.ev(`document.querySelector('.widget-rss').textContent`)).includes('No se pudo leer el feed'), 'sin caché, el mensaje de error');
    afirmar(await pg.ev(`!!document.querySelector('.widget-rss .rss-recargar')`), 'con su botón de recargar');
    pg = await abrir(feedsEn({ [URL_FEED]: 'lento' }));
    await pg.p.send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.__esperaRss = 300' });
    await pg.recargar();
    await pg.esperar(1500);
    afirmar((await pg.ev(`document.querySelector('.widget-rss').textContent`)).includes('No se pudo leer el feed'), 'una respuesta lenta se corta y es un fallo');

    // (f) Permiso retirado: lo dice y ofrece pedirlo.
    pg = await abrir({ chrome: {}, rss: { [URL_FEED]: rssXml(5) }, datos: widgetRss(), permisoRss: 'pendiente' });
    await pg.esperar(600);
    afirmar((await pg.ev(`document.querySelector('.widget-rss').textContent`)).includes('Falta el permiso para este feed'), 'sin permiso lo dice');
    igual(await pg.ev(`window.__rss.length`), 0, 'y no pide el feed');
    await pg.ev(`document.querySelector('.widget-rss .rss-permiso').click()`);
    await pg.esperar(600);
    igual((await titulares(pg)).length, 5, 'tras dar el permiso se ven los titulares');

    // (g) Borrar el widget y «Restablecer todo» borran la caché.
    pg = await abrir(feedsEn({ [URL_FEED]: rssXml(5) }));
    await pg.esperar(600);
    await pg.ev(`window.confirm = () => true`);
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('.widget-rss [data-accion-widget="borrar"]').click()`);
    await pg.esperar(400);
    igual(await pg.ev(`localStorage.getItem('chrome.local/rss:w-rss')`), null, 'borrar el widget borra su caché');
    await pg.ev(`localStorage.setItem('chrome.local/rss:otro', JSON.stringify({ t: 1, items: [] }))`);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-tema');
    await pg.clic('#btn-restablecer');
    await pg.ev(`document.getElementById('texto-restablecer').value = 'BORRAR'; document.getElementById('texto-restablecer').dispatchEvent(new Event('input'))`);
    await pg.clic('#confirmar-restablecer');
    await pg.esperar(600);
    igual(await pg.ev(`localStorage.getItem('chrome.local/rss:otro')`), null, '«Restablecer todo» borra las cachés rss:*');

    // ---- Revisión final ----
    // (h) El permiso cubre http y https (las redirecciones habituales) y el widget no se repinta de cero.
    igual(await pg.ev(`${modulo}.then(m => [m.patronDe('http://blog.example.com/feed'), m.patronDe('https://blog.example.com/x?y=1')])`), ['*://blog.example.com/*', '*://blog.example.com/*'], 'patrón de permiso para los dos esquemas');
    pg = await abrir(feedsEn({ [URL_FEED]: rssXml(5) }));
    await pg.esperar(600);
    await pg.ev(`document.querySelector('.widget-rss').dataset.marca = 'original'`);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-editar');
    igual(await pg.ev(`document.querySelector('.widget-rss')?.dataset.marca`), 'original', 'el widget RSS se conserva al repintar');
    igual(await pg.ev(`window.__rss.length`), 1, 'y no vuelve a pedir el feed');
  },
};
