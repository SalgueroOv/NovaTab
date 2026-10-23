import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const fecha = (dias = 0) => { const d = new Date(); d.setDate(d.getDate() + dias); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const GRUPO_C = { id: 'g-casa', nombre: 'GrupoCasa', zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [{ id: 'ec', nombre: 'Router casa', url: 'http://192.168.0.1/' }] };
const estructura = (grupos, widgets = []) => ({ version: 4, titulos: {}, grupos: grupos.map(({ enlaces, ...g }) => g), widgets });
const copia = (dias, nombre) => ({ fecha: fecha(-dias), datos: { ...estructura([{ id: `g-${nombre}`, nombre, zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [] }]), grupos: [{ id: `g-${nombre}`, nombre, zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [] }] }, notas: {}, tareas: {} });
const semilla = (activo, extra = {}) => ({
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'casa', nombre: 'Casa' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA.grupos),
  'chrome.sync/perfil:casa:datos': estructura([GRUPO_C]),
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/enlaces:g-casa': guardables(GRUPO_C.enlaces),
  'chrome.local/perfil-activo': activo,
  ...extra,
});
const copiasLocales = (pg, perfil) => pg.ev(`chrome.storage.local.get(null).then(t => Object.keys(t).filter(k => k.startsWith('copia:${perfil}:')).sort())`);
const lista = pg => pg.ev(`[...document.querySelectorAll('#lista-copias li span')].map(s => s.textContent)`);

export default {
  nombre: 'perfiles: las copias automáticas son de cada perfil',
  async ejecutar(abrir) {
    // (a) Abrir cada perfil el mismo día crea una copia de cada uno; la lista muestra solo las del activo.
    let pg = await abrir({ chrome: {}, datos: null, guardados: semilla('principal') });
    await pg.esperar(900);
    igual(await copiasLocales(pg, 'principal'), [`copia:principal:${fecha()}`], 'copia de principal');
    igual(await copiasLocales(pg, 'casa'), [], 'todavía ninguna de casa');
    await pg.ev(`import('/js/perfiles-ops.js').then(m => m.cambiarPerfil('casa'))`);
    await pg.esperar(900);
    igual(await copiasLocales(pg, 'casa'), [`copia:casa:${fecha()}`], 'al cambiar a casa se hace la suya');
    await pg.clic('#btn-tema');
    igual(await lista(pg), ['Hoy'], 'la lista muestra solo las del perfil activo');
    const copiaCasa = JSON.parse(await pg.ev(`localStorage.getItem('chrome.local/copia:casa:${fecha()}')`));
    igual(copiaCasa.datos.grupos.map(g => g.nombre), ['GrupoCasa'], 'la copia de casa tiene los grupos de casa');

    // (b) Con 8 copias de un perfil quedan 7 y no se toca lo de otro.
    const antiguas = {};
    for (let i = 1; i <= 8; i++) antiguas[`chrome.local/copia:casa:${fecha(-i)}`] = copia(i, `Dia${i}`);
    for (let i = 1; i <= 3; i++) antiguas[`chrome.local/copia:principal:${fecha(-i)}`] = copia(i, `P${i}`);
    pg = await abrir({ chrome: {}, datos: null, guardados: semilla('casa', antiguas) });
    await pg.esperar(900);
    igual((await copiasLocales(pg, 'casa')).length, 7, 'siete copias de casa');
    igual((await copiasLocales(pg, 'principal')).length, 3, 'las de principal intactas');
    afirmar(!(await copiasLocales(pg, 'casa')).includes(`copia:casa:${fecha(-8)}`), 'se borró la más antigua de casa');

    // (c) Recuperar una copia afecta solo al perfil activo y se puede deshacer.
    pg = await abrir({ chrome: {}, datos: null, guardados: semilla('casa', { [`chrome.local/copia:casa:${fecha(-2)}`]: copia(2, 'Antiguo') }) });
    await pg.esperar(900);
    const principalAntes = JSON.stringify((await pg.ev(`chrome.storage.sync.get('perfil:principal:datos')`))['perfil:principal:datos']);
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelectorAll('#lista-copias li')[1].querySelector('button').click()`);
    await pg.esperar(800);
    igual(await pg.ev(`novatab.datos.grupos.map(g => g.nombre)`), ['Antiguo'], 'la copia restaura los grupos de casa');
    igual(JSON.stringify((await pg.ev(`chrome.storage.sync.get('perfil:principal:datos')`))['perfil:principal:datos']), principalAntes, 'principal no se toca');
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(800);
    igual(await pg.ev(`novatab.datos.grupos.map(g => g.nombre)`), ['GrupoCasa'], 'Ctrl+Z devuelve lo de antes');

    // (d) Una copia antigua (clave sin perfil) de antes de la migración aparece en principal.
    pg = await abrir({ chrome: {}, datos: { ...estructura(DATOS_PRUEBA.grupos) }, guardados: { ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])), 'chrome.local/copia:2020-01-01': copia(0, 'DeAntes') } });
    await pg.esperar(900);
    await pg.clic('#btn-tema');
    afirmar((await lista(pg)).some(t => t.includes('ene')), 'la copia antigua se lista en principal');
  },
};
