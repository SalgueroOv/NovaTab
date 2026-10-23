import { afirmar, igual } from './lib/util.mjs';
import { conWidgets, DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const w = (id, tipo, y, config = {}) => ({ id, tipo, panel: 'izq', pos: { x: 1, y, w: 6, h: 4 }, config });
const TODOS = conWidgets([
  w('w-n', 'notas', 1), w('w-t', 'tareas', 5), w('w-r', 'relojMundial', 9), w('w-c', 'cuentaAtras', 13, { nombre: 'Fin', fecha: '2099-01-01T00:00' }),
  w('w-s', 'spotify', 17, { url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' }), w('w-m', 'masUsadas', 21, { cantidad: 5 }),
  w('w-sv', 'servicios', 25, { grupos: null }), w('w-rss', 'rss', 29, { url: 'https://feeds.example.com/x.xml', cantidad: 5 }),
]);
const SIN_PRIVADOS = { ...structuredClone(TODOS), grupos: TODOS.grupos.filter(g => !g.privado) };
const sync = pg => pg.ev(`chrome.storage.sync.get(null)`);
const activo = pg => pg.ev(`import('/js/perfiles.js').then(m => m.perfilActivo())`);
const ojo = pg => pg.ev(`document.getElementById('btn-reunion').getAttribute('aria-pressed')`);
const aviso = pg => pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`);
const rss = { 'https://feeds.example.com/x.xml': 'falla' };

export default {
  nombre: 'perfiles: Demo sustituye al modo reunión (el ojo)',
  async ejecutar(abrir) {
    // (a) El ojo crea Demo la primera vez: sin privados ni widgets personales, con ids nuevos y el mismo aspecto.
    let pg = await abrir({ chrome: {}, datos: TODOS, rss, guardados: { 'chrome.sync/tema': 'papel' } });
    await pg.esperar(1000);
    const antes = await pg.ev(`JSON.parse(JSON.stringify(novatab.datos))`);
    await pg.clic('#btn-reunion');
    await pg.esperar(1200);
    igual(await activo(pg), 'demo', 'el perfil activo es Demo');
    let s = await sync(pg);
    igual(s.perfiles.lista.map(p => [p.id, p.nombre, !!p.demo]), [['principal', 'Principal', false], ['demo', 'Demo', true]], 'registro con Demo');
    const demo = s['perfil:demo:datos'];
    igual(demo.grupos.map(g => g.nombre), ['Alfa', 'Beta', 'Trabajo'], 'sin los grupos privados (Gamma y Ocio)');
    igual(demo.widgets.map(x => x.tipo).sort(), ['cuentaAtras', 'relojMundial'], 'solo los widgets que no enseñan contenido personal');
    const idsAntes = new Set([...antes.grupos.map(g => g.id), ...antes.widgets.map(x => x.id)]);
    afirmar(demo.grupos.every(g => !idsAntes.has(g.id)) && demo.widgets.every(x => !idsAntes.has(x.id)), 'con ids nuevos');
    igual(s['perfil:demo:aspecto'].tema, 'papel', 'con el aspecto del perfil de origen');
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'papel', 'y se ve');
    igual(await ojo(pg), 'true', 'el ojo queda pulsado');

    // (b) Pulsar otra vez vuelve al perfil de antes, idéntico; Demo se conserva editado.
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')][0].querySelector('[data-plegar]').click()`);
    await pg.esperar(400);
    await pg.clic('#btn-reunion');
    await pg.esperar(1200);
    igual(await activo(pg), 'principal', 'vuelve al perfil anterior');
    igual(await pg.ev(`JSON.parse(JSON.stringify(novatab.datos))`), antes, 'idéntico a como estaba');
    igual(await ojo(pg), 'false', 'el ojo se suelta');
    await pg.clic('#btn-reunion');
    await pg.esperar(1200);
    igual(await pg.ev(`novatab.datos.grupos[0].plegado`), true, 'la segunda vez no se recrea Demo: conserva lo editado');
    igual((await sync(pg)).perfiles.lista.length, 2, 'y no hay un tercer perfil');

    // (c) En Demo un grupo marcado privado no se pinta; en otros perfiles sí.
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Beta').querySelector('[data-accion="editar-grupo"]').click()`);
    await pg.esperar(200);
    await pg.ev(`document.querySelector('#dlg-grupo input[name="privado"]').checked = true`);
    await pg.clic('#dlg-grupo button[value="ok"]');
    await pg.esperar(500);
    afirmar(!(await pg.ev(`document.querySelector('.pagina').innerText`)).includes('Router Beta'), 'un grupo privado de Demo no se ve');
    await pg.clic('#btn-editar');
    await pg.clic('#btn-reunion');
    await pg.esperar(1200);
    afirmar((await pg.ev(`document.querySelector('.pagina').innerText`)).includes('Secreto Uno'), 'en el perfil normal los privados se ven');

    // (d) Si el perfil de antes se borra estando en Demo, el ojo vuelve a uno válido.
    pg = await abrir({ chrome: {}, datos: TODOS, rss });
    await pg.esperar(1000);
    await pg.ev(`import('/js/perfiles-ops.js').then(m => m.crearPerfil('Casa'))`);
    await pg.clic('#btn-reunion');
    await pg.esperar(1200);
    await pg.ev(`import('/js/perfiles-ops.js').then(m => m.borrarPerfil('principal'))`);
    await pg.esperar(500);
    await pg.clic('#btn-reunion');
    await pg.esperar(1200);
    const ahora = await activo(pg);
    igual((await sync(pg)).perfiles.lista.find(p => p.id === ahora)?.nombre, 'Casa', 'sin el perfil anterior, vuelve a otro perfil que no es Demo');

    // (e) Sin ningún grupo privado, Demo avisa de que es una copia completa.
    pg = await abrir({ chrome: {}, datos: SIN_PRIVADOS, rss });
    await pg.esperar(1000);
    await pg.clic('#btn-reunion');
    await pg.esperar(1200);
    igual(await aviso(pg), 'Ningún grupo era privado: Demo es una copia completa de tus grupos', 'aviso sin grupos privados');

    // (f) Un «reunion: true» de la versión anterior no deja a nadie atrapado en un modo que ya no existe.
    pg = await abrir({ chrome: {}, datos: TODOS, rss, guardados: { 'chrome.sync/opciones': { reunion: true } } });
    await pg.esperar(1000);
    igual([await activo(pg), await ojo(pg)], ['principal', 'false'], 'tras migrar se está en el perfil principal, con el ojo suelto');
    afirmar((await pg.ev(`document.querySelector('.pagina').innerText`)).includes('Secreto Uno'), 'y los grupos privados se ven');

    // ---- Revisión final ----
    // (g) Un doble clic en el ojo no mezcla perfiles: Demo se crea una sola vez, con ids propios, y principal queda intacto.
    pg = await abrir({ chrome: {}, datos: TODOS, rss });
    await pg.esperar(1000);
    const previo = JSON.stringify((await sync(pg))['perfil:principal:datos']);
    await pg.ev(`(() => { const b = document.getElementById('btn-reunion'); b.click(); b.click(); })()`);
    await pg.esperar(3000);
    s = await sync(pg);
    igual(s.perfiles.lista.filter(p => p.demo).length, 1, 'un solo perfil Demo');
    igual(JSON.stringify(s['perfil:principal:datos']), previo, 'la estructura de principal no cambió');
    const idsP = new Set(s['perfil:principal:datos'].grupos.map(g => g.id));
    afirmar(s['perfil:demo:datos'].grupos.every(g => !idsP.has(g.id)), 'Demo tiene ids propios');
    afirmar([...idsP].every(id => `enlaces:${id}` in s), 'los enlaces de principal siguen en sus claves');
    igual(await activo(pg), 'principal', 'dos clics seguidos dejan el perfil de antes');
  },
};
