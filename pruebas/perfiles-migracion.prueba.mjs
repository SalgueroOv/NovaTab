import { afirmar, igual } from './lib/util.mjs';
import { conWidgets, DATOS_PRUEBA } from './lib/datos-prueba.mjs';
import { DATOS_V3, resumen } from './lib/datos-v3.mjs';

// El formato v4 de antes de los perfiles: estructura en «datos» y los enlaces en «grupo:<id>».
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });
// Los enlaces tal como los guarda la aplicación (normalizados, con «icono»).
const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const clavesDeGrupos = d => Object.fromEntries(d.grupos.map(g => [`chrome.sync/grupo:${g.id}`, guardables(g.enlaces)]));
const BASE = conWidgets([
  { id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} },
  { id: 'w-tareas', tipo: 'tareas', panel: 'izq', pos: { x: 1, y: 5, w: 4, h: 8 }, config: {} },
]);
const NOMBRES = BASE.grupos.map(g => g.nombre);
const sync = pg => pg.ev(`chrome.storage.sync.get(null)`);
const local = pg => pg.ev(`chrome.storage.local.get(null)`);
const COPIA_ANTIGUA = { fecha: '2026-10-20', datos: { version: 4, titulos: {}, widgets: [], grupos: [{ id: 'g-v', nombre: 'Viejo', zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [] }] }, notas: {}, tareas: {} };
const ANTIGUOS = {
  ...clavesDeGrupos(BASE),
  'chrome.sync/nota:w-notas': 'mi nota',
  'chrome.sync/tareas:w-tareas': [{ id: 't1', texto: 'Una tarea', hecha: false }],
  'chrome.sync/tema': 'papel',
  'chrome.sync/opciones': { sobrio: true, ocultos: { izq: true, der: false }, buscador: { motor: 'bing' }, apariencia: { acento: '#e0245e' }, reunion: true },
  'chrome.local/copia:2026-10-20': COPIA_ANTIGUA,
};

export default {
  nombre: 'perfiles: registro, claves por perfil y migración desde la versión 4',
  async ejecutar(abrir) {
    // (a) Migración de datos v4 reales.
    let pg = await abrir({ chrome: {}, datos: estructura(BASE), guardados: ANTIGUOS });
    await pg.esperar(900);
    let s = await sync(pg);
    let l = await local(pg);
    igual(s.perfiles, { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }] }, 'registro con un solo perfil');
    igual([s['perfil:principal:datos'].version, s['perfil:principal:datos'].grupos.map(g => g.nombre)], [4, NOMBRES], 'estructura del perfil principal');
    const a = s['perfil:principal:aspecto'];
    igual([a.tema, a.sobrio, a.ocultos.izq, a.apariencia.acento, 'reunion' in a], ['papel', true, true, '#e0245e', false], 'aspecto del perfil principal');
    igual(Object.keys(s.opciones), ['buscador'], '«opciones» queda solo con lo común');
    igual(s.opciones.buscador.motor, 'bing', 'el buscador se conserva');
    afirmar(!('datos' in s) && !('tema' in s), 'las claves antiguas se borran');
    igual(s['grupo:g-alfa'].length, 4, 'los enlaces siguen en su clave');
    igual([s['nota:w-notas'], s['tareas:w-tareas'].length], ['mi nota', 1], 'notas y tareas intactas');
    igual([l['respaldo-v4'].tema, l['respaldo-v4'].datos.version, l['respaldo-v4'].opciones.reunion], ['papel', 4, true], 'copia de seguridad de lo antiguo');
    afirmar('copia:principal:2026-10-20' in l && !('copia:2026-10-20' in l), 'la copia antigua pasa a principal');
    igual((await pg.datos()).grupos.map(g => g.nombre), NOMBRES, 'la página muestra los mismos grupos');
    igual(await pg.ev(`document.querySelector('.notas-texto').value`), 'mi nota', 'y la nota');
    igual(await pg.ev(`document.querySelector('.widget-tareas .tarea .texto').textContent`), 'Una tarea', 'y la tarea');
    igual(await pg.ev(`[document.documentElement.dataset.tema, getComputedStyle(document.documentElement).getPropertyValue('--acento').trim()]`), ['papel', '#e0245e'], 'tema y acento');

    // (b) Una segunda apertura no migra otra vez, y unas claves antiguas que reaparecen se ignoran.
    igual(await pg.ev(`import('/js/perfiles.js').then(m => m.migrar())`), 'ya-estaba', 'migrar con el registro ya creado');
    await pg.ev(`localStorage.setItem('chrome.sync/datos', JSON.stringify({ version: 4, titulos: {}, grupos: [], widgets: [] })); localStorage.setItem('chrome.sync/tema', JSON.stringify('noche'))`);
    await pg.recargar();
    await pg.esperar(700);
    s = await sync(pg);
    igual(s['perfil:principal:datos'].grupos.length, NOMBRES.length, 'el perfil no se pisa con unas claves antiguas');
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'papel', 'ni el tema');
    igual(s.perfiles.lista.length, 1, 'ni se crea otro perfil');

    // (c) Sin ningún dato guardado se crea «principal» con el ejemplo inicial.
    pg = await abrir({ chrome: {}, datos: null });
    await pg.esperar(900);
    s = await sync(pg);
    igual(s.perfiles.lista.map(p => p.id), ['principal'], 'registro nuevo');
    afirmar(Array.isArray(s['perfil:principal:datos']?.grupos) && s['perfil:principal:datos'].grupos.length > 0, 'con los datos de ejemplo');

    // (d) Si no se puede escribir la copia de seguridad, lo antiguo queda intacto, no se guarda nada y la siguiente apertura migra.
    pg = await abrir({ chrome: {}, datos: estructura(BASE), guardados: { ...ANTIGUOS, 'chrome-falso/localFalla': 1 } });
    await pg.esperar(900);
    s = await sync(pg);
    afirmar(!('perfiles' in s) && 'datos' in s && 'tema' in s, 'sin registro y con las claves antiguas');
    igual((await pg.datos()).grupos.map(g => g.nombre), NOMBRES, 'la página sigue mostrando los datos');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')][0].querySelector('[data-plegar]').click()`);
    await pg.esperar(500);
    s = await sync(pg);
    afirmar(!('perfil:principal:datos' in s), 'mientras la migración falla no se guarda nada en claves nuevas');
    await pg.ev(`localStorage.removeItem('chrome-falso/localFalla')`);
    await pg.recargar();
    await pg.esperar(900);
    s = await sync(pg);
    afirmar('perfiles' in s && !('datos' in s), 'la siguiente apertura migra');

    // (e) Con dos perfiles, guardar uno no borra ni toca los grupos del otro.
    const otro = estructura({ ...BASE, grupos: [{ id: 'g-otro', nombre: 'Otro', zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [{ id: 'eo', nombre: 'Uno', url: 'http://192.168.9.9/' }] }], widgets: [] });
    pg = await abrir({
      chrome: {},
      datos: null,
      guardados: {
        'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'otro', nombre: 'Otro' }] },
        'chrome.sync/perfil:principal:datos': estructura(BASE),
        'chrome.sync/perfil:otro:datos': otro,
        ...clavesDeGrupos(BASE),
        'chrome.sync/grupo:g-otro': guardables([{ id: 'eo', nombre: 'Uno', url: 'http://192.168.9.9/' }]),
      },
    });
    await pg.esperar(700);
    await pg.ev(`__chromeFalso.escritas()`);
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')][0].querySelector('[data-plegar]').click()`);
    await pg.esperar(500);
    igual(await pg.ev(`__chromeFalso.escritas()`), ['perfil:principal:datos'], 'plegar escribe solo la estructura del perfil activo');
    await pg.ev(`window.confirm = () => true`);
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('[data-accion="borrar-grupo"]').click()`);
    await pg.esperar(600);
    s = await sync(pg);
    afirmar(!('grupo:g-alfa' in s), 'el grupo borrado de este perfil se limpia');
    afirmar('grupo:g-otro' in s && s['perfil:otro:datos'].grupos[0].id === 'g-otro', 'los del otro perfil siguen ahí');

    // (f) Datos v1 y v3 llegan a «principal» ya en formato v4.
    pg = await abrir({ chrome: {}, datos: DATOS_V3 });
    await pg.esperar(900);
    s = await sync(pg);
    igual(s['perfil:principal:datos'].version, 4, 'v3 migrado a v4 dentro del perfil');
    igual(resumen(await pg.datos()), resumen(DATOS_V3), 'la página muestra lo mismo que antes');
    pg = await abrir({ chrome: {}, datos: { grupos: [{ id: 'a', nombre: 'Viejo', color: '#8a8c92', enlaces: [{ id: 'e', nombre: 'x', url: 'http://192.168.1.2/' }] }] } });
    await pg.esperar(900);
    s = await sync(pg);
    igual(s['perfil:principal:datos'].version, 4, 'v1 migrado a v4 dentro del perfil');
    afirmar((await pg.datos()).grupos.some(g => g.nombre === 'Viejo'), 'con su grupo');
  },
};
