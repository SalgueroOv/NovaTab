import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const widget = (id, tipo, y, config = {}) => ({ id, tipo, panel: 'izq', pos: { x: 1, y, w: 6, h: 4 }, config });
const estructura = (grupos, widgets) => ({ version: 4, titulos: {}, grupos: grupos.map(({ enlaces, ...g }) => g), widgets });
const GRUPO_O = { id: 'g-otro', nombre: 'GrupoOtro', zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [{ id: 'eo', nombre: 'Uno', url: 'http://192.168.9.9/' }] };
const PERFILES = {
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'otro', nombre: 'Otro' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA.grupos, [widget('wn-p', 'notas', 1), widget('wt-p', 'tareas', 5), widget('wr-p', 'rss', 9, { url: 'https://p.example.com/feed', cantidad: 5 })]),
  'chrome.sync/perfil:otro:datos': estructura([GRUPO_O], [widget('wn-o', 'notas', 1), widget('wt-o', 'tareas', 5), widget('wr-o', 'rss', 9, { url: 'https://o.example.com/feed', cantidad: 5 })]),
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/enlaces:g-otro': guardables(GRUPO_O.enlaces),
  'chrome.sync/notas:wn-p': 'nota de principal',
  'chrome.sync/notas:wn-o': 'nota del otro',
  'chrome.sync/tareas:wt-p': [{ id: 'a', texto: 'tarea de principal', hecha: false }],
  'chrome.sync/tareas:wt-o': [{ id: 'b', texto: 'tarea del otro', hecha: false }],
  'chrome.local/rss:wr-p': { t: 1, url: 'https://p.example.com/feed', titulo: 'P', items: [] },
  'chrome.local/rss:wr-o': { t: 1, url: 'https://o.example.com/feed', titulo: 'O', items: [] },
  'chrome.local/perfil-activo': 'principal',
};
const sync = pg => pg.ev(`chrome.storage.sync.get(null).then(t => Object.keys(t).sort())`);
const loc = pg => pg.ev(`chrome.storage.local.get(null).then(t => Object.keys(t).filter(k => k.startsWith('rss:')).sort())`);
const sinFeeds = { 'https://p.example.com/feed': 'falla', 'https://o.example.com/feed': 'falla' };
const DEL_OTRO = ['enlaces:g-otro', 'notas:wn-o', 'perfil:otro:datos', 'tareas:wt-o'];
const delOtroPresente = (claves, rss) => DEL_OTRO.every(k => claves.includes(k)) && rss.includes('rss:wr-o');

export default {
  nombre: 'perfiles: la limpieza de claves huérfanas no toca los demás perfiles',
  async ejecutar(abrir) {
    const abrirDos = () => abrir({ chrome: {}, datos: null, rss: sinFeeds, guardados: PERFILES });
    // (a) y (b) Importar un archivo sin widgets limpia lo propio y deja lo del otro; deshacer tampoco lo toca.
    let pg = await abrirDos();
    await pg.esperar(800);
    afirmar(delOtroPresente(await sync(pg), await loc(pg)), 'al principio está todo');
    const vacio = JSON.stringify({ version: 4, titulos: {}, grupos: [], widgets: [] });
    await pg.ev(`window.confirm = () => true`);
    await pg.clic('#btn-editar');
    await pg.ev(`(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([${JSON.stringify(vacio)}], 'copia.json', { type: 'application/json' }));
      const i = document.getElementById('archivo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await pg.esperar(800);
    let claves = await sync(pg);
    afirmar(!claves.includes('notas:wn-p') && !claves.includes('tareas:wt-p'), 'lo propio (notas y tareas de principal) se limpia');
    afirmar(delOtroPresente(claves, await loc(pg)), 'lo del otro perfil sigue intacto tras importar');
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(800);
    claves = await sync(pg);
    afirmar(delOtroPresente(claves, await loc(pg)), 'y tras deshacer');
    afirmar(claves.includes('notas:wn-p'), 'deshacer recupera la nota propia');

    // (c) «Restablecer todo» deja el perfil activo con el ejemplo y el otro intacto.
    pg = await abrirDos();
    await pg.esperar(800);
    await pg.clic('#btn-tema');
    await pg.clic('#btn-restablecer');
    await pg.ev(`document.getElementById('texto-restablecer').value = 'BORRAR'; document.getElementById('texto-restablecer').dispatchEvent(new Event('input'))`);
    await pg.clic('#confirmar-restablecer');
    await pg.esperar(900);
    claves = await sync(pg);
    afirmar(!claves.includes('notas:wn-p') && !claves.includes('tareas:wt-p'), 'se borran las notas y tareas de este perfil');
    igual((await loc(pg)).includes('rss:wr-p'), false, 'y su caché de RSS');
    afirmar(delOtroPresente(claves, await loc(pg)), 'pero no nada del otro perfil');
    afirmar((await pg.datos()).grupos.length > 0 && !(await pg.datos()).widgets.some(w => ['wn-p', 'wt-p', 'wr-p'].includes(w.id)), 'el perfil activo vuelve al ejemplo inicial');
    afirmar((await pg.ev(`document.querySelector('#dlg-restablecer h2').textContent`)).includes('perfil'), 'el diálogo dice que es de este perfil');

    // (d) Lo propio sigue limpiándose: deshacer la creación de un widget de notas borra su clave.
    pg = await abrirDos();
    await pg.esperar(800);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-nuevo-widget');
    await pg.esperar(200);
    await pg.ev(`[...document.querySelectorAll('#dlg-widget .tipo-widget')].find(b => b.textContent.startsWith('Notas')).click()`);
    await pg.esperar(500);
    await pg.ev(`(() => { const t = document.querySelectorAll('.notas-texto'); const u = t[t.length - 1]; u.focus(); u.value = 'nueva'; u.dispatchEvent(new Event('input')); u.blur(); })()`);
    await pg.esperar(2600);
    const tras = (await sync(pg)).filter(k => k.startsWith('notas:'));
    igual(tras.length, 3, 'la nota nueva se guardó');
    await pg.clic('#btn-editar');
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(800);
    igual((await sync(pg)).filter(k => k.startsWith('notas:')).sort(), ['notas:wn-o', 'notas:wn-p'], 'deshacer borra la nota del widget que ya no existe, y solo esa');
  },
};
