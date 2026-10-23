import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afirmar, igual, RAIZ } from './lib/util.mjs';

const modulo = `import('/js/motores.js')`;
const ATAJOS = [
  { clave: 'y', nombre: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
  { clave: 'gh', nombre: 'GitHub', url: 'https://github.com/search?q=%s' },
  { clave: 'w', nombre: 'Wikipedia', url: 'https://es.wikipedia.org/w/index.php?search=%s' },
  { clave: 'm', nombre: 'Maps', url: 'https://www.google.com/maps/search/%s' },
];
const DEFECTO = { motor: 'google', atajos: ATAJOS, sugerencias: false };
const normalizar = valor => `${modulo}.then(m => m.normalizarBuscador(${valor}))`;
const resolver = (texto, buscador = 'null') => `${modulo}.then(m => m.resolverConsulta(${JSON.stringify(texto)}, ${buscador === 'null' ? 'm.BUSCADOR' : buscador}))`;
const filas = pg => pg.ev(`[...document.querySelectorAll('#sugerencias .sugerencia')].map(s => [s.querySelector('.s-titulo').textContent, s.querySelector('.s-etiqueta').textContent, s.href])`);

export default {
  nombre: 'motores: motor configurable, atajos con ! y desplegable del buscador',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) Normalizar.
    for (const malo of ['undefined', 'null', "'x'"]) igual(await pg.ev(normalizar(malo)), DEFECTO, `normalizar(${malo})`);
    igual((await pg.ev(normalizar(`{ motor: 'altavista' }`))).motor, 'google', 'motor desconocido vuelve a google');
    const raros = [
      { clave: '', nombre: 'a', url: 'https://a.example.com/?q=%s' },
      { clave: 'A B', nombre: 'b', url: 'https://b.example.com/?q=%s' },
      { clave: 'sinpct', nombre: 'c', url: 'https://c.example.com/' },
      { clave: 'dos', nombre: 'd', url: 'https://d.example.com/?q=%s&r=%s' },
      { clave: 'js', nombre: 'e', url: 'javascript:alert(1)%s' },
      { clave: 'Y', nombre: 'Primero', url: 'https://uno.example.com/?q=%s' },
      { clave: 'y', nombre: 'Repetido', url: 'https://dos.example.com/?q=%s' },
    ];
    const r = await pg.ev(normalizar(`{ atajos: ${JSON.stringify(raros)} }`));
    igual(r.atajos, [{ clave: 'y', nombre: 'Primero', url: 'https://uno.example.com/?q=%s' }], 'atajos inválidos o repetidos se descartan y la clave va en minúsculas');
    const muchos = Array.from({ length: 25 }, (_, i) => ({ clave: `k${i}`, nombre: `K${i}`, url: `https://k${i}.example.com/?q=%s` }));
    igual((await pg.ev(normalizar(`{ atajos: ${JSON.stringify(muchos)} }`))).atajos.length, 20, 'como mucho 20 atajos');

    // (b) Resolver una consulta.
    let q = await pg.ev(resolver('!y gatos'));
    igual([q.q, q.destino.etiqueta, q.destino.url], ['gatos', 'YouTube', 'https://www.youtube.com/results?search_query=gatos'], '!y gatos');
    q = await pg.ev(resolver('!y gatos y perros & más #1'));
    igual(q.destino.url, 'https://www.youtube.com/results?search_query=gatos%20y%20perros%20%26%20m%C3%A1s%20%231', 'el texto va codificado');
    for (const texto of ['!hola mundo', '!', '!y', '!y ']) {
      q = await pg.ev(resolver(texto));
      igual([q.destino.etiqueta, q.q], ['Google', texto.trim()], `«${texto}» va al motor`);
    }
    q = await pg.ev(resolver('cómo hacer pan', `{ ...m.BUSCADOR, motor: 'duckduckgo' }`));
    igual(q.destino.url, 'https://duckduckgo.com/?q=c%C3%B3mo%20hacer%20pan', 'DuckDuckGo');

    // (c) El desplegable: !y gatos primero, Google detrás; con tus enlaces, siguen primero.
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('!y gatos');
    let f = await filas(pg);
    igual(f[0], ['Buscar «gatos» en YouTube', 'YouTube', 'https://www.youtube.com/results?search_query=gatos'], 'primera fila con !y');
    igual(f.slice(1).map(x => x[1]), ['Google', 'Google', 'Google', 'Google', 'Google'], 'las filas de Google siguen detrás');
    await pg.tecla('Escape');
    await pg.escribir('NAS Beta');
    f = await filas(pg);
    igual(f[0][0], 'NAS Beta', 'tus enlaces primero');
    igual(f.find(x => x[0].startsWith('Buscar')), ['Buscar «NAS Beta» en Google', 'Google', 'https://www.google.com/search?q=NAS%20Beta'], 'fila del motor');

    // (d) Con otro motor, su fila va primero y Modo IA sigue siendo de Google.
    pg = await abrir({ guardados: { opciones: { buscador: { motor: 'bing' } } } });
    await pg.esperar(300);
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('hola');
    f = await filas(pg);
    igual(f[0], ['Buscar «hola» en Bing', 'Bing', 'https://www.bing.com/search?q=hola'], 'fila de Bing');
    afirmar(f.some(x => x[0] === 'Preguntar al Modo IA' && x[1] === 'Google' && x[2].startsWith('https://www.google.com/search?udm=50')), 'Modo IA sigue siendo de Google');
    afirmar((await pg.ev(`document.getElementById('modo-ia').href`)).startsWith('https://www.google.com/search?udm=50'), '#modo-ia apunta a Google');

    // ---- Pestaña Buscador ----
    const guardado = () => pg.ev(`JSON.parse(localStorage.getItem('opciones'))?.buscador`);
    const escribirCampo = (selector, valor) => pg.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.value = ${JSON.stringify(valor)}; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const abrirPestana = async () => {
      await pg.clic('#btn-tema');
      await pg.ev(`document.querySelector('#panel-tema [data-pestana="buscador"]').click()`);
    };

    // (e) Cuatro pestañas y el selector con los cinco motores.
    pg = await abrir();
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    igual(await pg.ev(`[...document.querySelectorAll('#panel-tema [role="tab"]')].map(t => t.textContent)`), ['Tema', 'Fondo', 'Diseño', 'Buscador'], 'pestañas');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="buscador"]').click()`);
    igual(await pg.ev(`[...document.querySelectorAll('#motor-buscador option')].map(o => o.textContent)`), ['Google', 'DuckDuckGo', 'Bing', 'Perplexity', 'ChatGPT'], 'motores del selector');
    igual(await pg.ev(`document.getElementById('motor-buscador').value`), 'google', 'Google marcado');

    // (f) Elegir DuckDuckGo se guarda, se usa y sobrevive a una recarga.
    await pg.ev(`(() => { const e = document.getElementById('motor-buscador'); e.value = 'duckduckgo'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await pg.esperar(450);
    igual((await guardado()).motor, 'duckduckgo', 'motor guardado');
    await pg.recargar();
    await pg.esperar(300);
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('pan');
    igual((await filas(pg))[0][2], 'https://duckduckgo.com/?q=pan', 'el desplegable usa DuckDuckGo tras recargar');

    // (g) Editar la clave de un atajo.
    pg = await abrir();
    await pg.esperar(300);
    await abrirPestana();
    igual(await pg.ev(`document.querySelectorAll('#lista-atajos li').length`), 4, 'cuatro atajos listados');
    await escribirCampo('#lista-atajos li:nth-child(1) [data-campo="clave"]', 'yt');
    await pg.esperar(450);
    igual((await guardado()).atajos[0].clave, 'yt', 'clave editada guardada');
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('!yt gatos');
    igual((await filas(pg))[0][0], 'Buscar «gatos» en YouTube', '!yt funciona');
    await pg.tecla('Escape');
    await pg.escribir('!y gatos');
    igual((await filas(pg))[0][1], 'Google', '!y ya no es un atajo');

    // (h) Una dirección con javascript: se marca y no se guarda.
    pg = await abrir();
    await pg.esperar(300);
    await abrirPestana();
    await pg.clic('#atajo-nuevo');
    await escribirCampo('#lista-atajos li:last-child [data-campo="clave"]', 'xx');
    await escribirCampo('#lista-atajos li:last-child [data-campo="nombre"]', 'Malo');
    await escribirCampo('#lista-atajos li:last-child [data-campo="url"]', 'javascript:alert(1)?%s');
    await pg.esperar(450);
    igual(await pg.ev(`document.querySelector('#lista-atajos li:last-child [data-campo="url"]').getAttribute('aria-invalid')`), 'true', 'dirección marcada como inválida');
    afirmar(!JSON.stringify((await guardado())?.atajos ?? []).includes('javascript'), 'el atajo malo no se guarda');
    await escribirCampo('#lista-atajos li:last-child [data-campo="url"]', 'https://ok.example.com/?q=%s');
    await pg.esperar(450);
    igual((await guardado()).atajos.at(-1).clave, 'xx', 'con una dirección válida sí se guarda');

    // (i) Borrar y restaurar.
    await pg.clic('#lista-atajos li:nth-child(2) [data-accion="borrar"]');
    await pg.esperar(450);
    igual((await guardado()).atajos.map(a => a.clave), ['y', 'w', 'm', 'xx'], 'atajo borrado');
    await pg.ev(`(() => { const e = document.getElementById('motor-buscador'); e.value = 'bing'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await pg.clic('#atajos-restaurar');
    await pg.esperar(450);
    const tras = await guardado();
    igual([tras.motor, tras.atajos.map(a => a.clave)], ['bing', ['y', 'gh', 'w', 'm']], 'restaurar conserva el motor');

    // ---- Sugerencias de Google ----
    const aviso = () => pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`);
    const marcarSugerencias = async () => {
      await pg.clic('#btn-tema');
      await pg.ev(`document.querySelector('#panel-tema [data-pestana="buscador"]').click()`);
      await pg.ev(`document.getElementById('opt-sugerencias').click()`);
      await pg.esperar(450);
    };
    const escribirRapido = texto => pg.ev(`(() => { const b = document.getElementById('buscar'); b.focus(); b.value = ${JSON.stringify(texto)}; b.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    const activas = { 'chrome.sync/opciones': { buscador: { sugerencias: true } } };

    // (j) El permiso es opcional y de host.
    const manifest = JSON.parse(readFileSync(join(RAIZ, 'manifest.json'), 'utf8'));
    afirmar(manifest.optional_host_permissions?.includes('https://suggestqueries.google.com/*'), 'permiso de host opcional');
    afirmar(!(manifest.host_permissions || []).includes('https://suggestqueries.google.com/*'), 'no es un host_permissions fijo');

    // (k) Marcar la casilla pide el permiso: concedido se guarda; denegado se desmarca y avisa.
    pg = await abrir({ chrome: {}, sugerenciasGoogle: 'normal', permisoSugerencias: 'pendiente' });
    await pg.esperar(300);
    await marcarSugerencias();
    igual(await pg.ev(`JSON.parse(localStorage.getItem('chrome.sync/opciones')).buscador.sugerencias`), true, 'sugerencias activadas con permiso');
    pg = await abrir({ chrome: {}, sugerenciasGoogle: 'normal', permisoSugerencias: 'denegado' });
    await pg.esperar(300);
    await marcarSugerencias();
    igual(await pg.ev(`document.getElementById('opt-sugerencias').checked`), false, 'casilla desmarcada si se deniega');
    igual(await aviso(), 'Sin permiso para pedir sugerencias a Google', 'aviso de permiso denegado');
    afirmar(!(await pg.ev(`JSON.parse(localStorage.getItem('chrome.sync/opciones') || '{}').buscador?.sugerencias`)), 'nada guardado');

    // (l) Con la casilla y el permiso, aparecen filas «Sugerencia»; sin ellos, ninguna llamada.
    pg = await abrir({ chrome: {}, sugerenciasGoogle: 'normal', permisoSugerencias: 'concedido', guardados: activas });
    await pg.esperar(400);
    await escribirRapido('gat');
    await pg.esperar(450);
    f = await filas(pg);
    igual(f.slice(0, 2), [['gats', 'Sugerencia', 'https://www.google.com/search?q=gats'], ['gatitos', 'Sugerencia', 'https://www.google.com/search?q=gatitos']], 'filas de sugerencia primero');
    igual(f[2][1], 'Google', 'la fila del motor viene detrás de las sugerencias');
    pg = await abrir({ chrome: {}, sugerenciasGoogle: 'normal', permisoSugerencias: 'concedido' });
    await pg.esperar(300);
    await escribirRapido('gat');
    await pg.esperar(450);
    igual(await pg.ev(`window.__sugerencias.length`), 0, 'sin la casilla no hay llamadas');
    pg = await abrir({ chrome: {}, sugerenciasGoogle: 'normal', permisoSugerencias: 'denegado', guardados: activas });
    await pg.esperar(400);
    await escribirRapido('gat');
    await pg.esperar(450);
    igual(await pg.ev(`window.__sugerencias.length`), 0, 'sin permiso no hay llamadas');

    // (m) Un fallo o una respuesta rara no rompen el desplegable.
    for (const modo of ['falla', 'mala']) {
      pg = await abrir({ chrome: {}, sugerenciasGoogle: modo, permisoSugerencias: 'concedido', guardados: activas });
      await pg.esperar(400);
      await escribirRapido('gat');
      await pg.esperar(500);
      f = await filas(pg);
      afirmar(f.length > 0 && f.every(x => x[1] !== 'Sugerencia'), `con ${modo} solo salen las filas normales`);
    }

    // (n) «ga» y enseguida «gato»: una sola llamada, la de gato.
    pg = await abrir({ chrome: {}, sugerenciasGoogle: 'normal', permisoSugerencias: 'concedido', guardados: activas });
    await pg.esperar(400);
    await escribirRapido('ga');
    await pg.esperar(50);
    await escribirRapido('gato');
    await pg.esperar(700);
    igual(await pg.ev(`window.__sugerencias`), ['gato'], 'solo se pide la última consulta');
    f = await filas(pg);
    igual(f.filter(x => x[1] === 'Sugerencia').map(x => x[0]), ['gatos', 'gatoitos'], 'filas de la última consulta');

    // (o) Respuesta tardía de una consulta anterior: se descarta.
    pg = await abrir({ chrome: {}, sugerenciasGoogle: 'normal', permisoSugerencias: 'concedido', guardados: activas });
    await pg.esperar(400);
    await escribirRapido('ga');
    await pg.esperar(250); // la llamada de «ga» ya salió y tarda 400 ms
    await escribirRapido('gato');
    await pg.esperar(900);
    f = await filas(pg);
    afirmar(!f.some(x => x[1] === 'Sugerencia' && x[0].startsWith('gas')), 'la respuesta tardía de «ga» no se pinta');
  },
};
