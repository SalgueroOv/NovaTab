import { afirmar, igual } from './lib/util.mjs';
import { conWidgets, DATOS_PRUEBA } from './lib/datos-prueba.mjs';
import { DATOS_V3, resumen } from './lib/datos-v3.mjs';

// El formato v4 de antes de los perfiles: estructura en «datos» y los enlaces en «enlaces:<id>».
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });
// Los enlaces tal como los guarda la aplicación (normalizados, con «icono»).
const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
// Los enlaces de la versión 4 («grupo:<id>») y los de la versión 5 («enlaces:<id>»).
const clavesDeGrupos = d => Object.fromEntries(d.grupos.map(g => [`chrome.sync/grupo:${g.id}`, guardables(g.enlaces)]));
const clavesNuevas = d => Object.fromEntries(d.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)]));
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
    igual(s['enlaces:g-alfa'].length, 4, 'los enlaces pasan a su clave nueva');
    igual([s['notas:w-notas'], s['tareas:w-tareas'].length], ['mi nota', 1], 'notas y tareas copiadas a las claves nuevas');
    afirmar(!('grupo:g-alfa' in s) && !('nota:w-notas' in s), 'y las claves antiguas se borran (una versión 4 que siga en otro equipo no puede tocar lo nuevo)');
    igual([Object.keys(l['respaldo-v4'].grupos).length, l['respaldo-v4'].notas['w-notas']], [BASE.grupos.length, 'mi nota'], 'la copia de seguridad lleva también los enlaces y las notas');
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
        ...clavesNuevas(BASE),
        'chrome.sync/enlaces:g-otro': guardables([{ id: 'eo', nombre: 'Uno', url: 'http://192.168.9.9/' }]),
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
    afirmar(!('enlaces:g-alfa' in s), 'el grupo borrado de este perfil se limpia');
    afirmar('enlaces:g-otro' in s && s['perfil:otro:datos'].grupos[0].id === 'g-otro', 'los del otro perfil siguen ahí');

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

    // ---- Revisión final ----
    // (g) Un equipo con la versión 4 que vuelva a escribir «datos» o «tema» provoca un aviso claro.
    pg = await abrir({ chrome: {}, datos: estructura(BASE), guardados: ANTIGUOS });
    await pg.esperar(900);
    await pg.ev(`__chromeFalso.remoto('sync', 'datos', { version: 4, titulos: {}, grupos: [], widgets: [] })`);
    await pg.esperar(300);
    afirmar((await pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`)).includes('versión anterior'), 'aviso al detectar un equipo con la versión 4');
    s = await sync(pg);
    igual(s['perfil:principal:datos'].grupos.length, NOMBRES.length, 'y lo migrado no se toca');

    // (h) Dos migraciones a la vez (dos pestañas): una migra y la otra espera; la copia de seguridad y el aspecto quedan bien.
    await pg.ev(`(() => {
      for (const k of ['perfiles', 'perfil:principal:datos', 'perfil:principal:aspecto']) localStorage.removeItem('chrome.sync/' + k);
      localStorage.setItem('chrome.sync/datos', ${JSON.stringify(JSON.stringify(estructura(BASE)))});
      localStorage.setItem('chrome.sync/tema', JSON.stringify('papel'));
      localStorage.setItem('chrome.sync/opciones', JSON.stringify({ apariencia: { acento: '#e0245e' }, buscador: { motor: 'bing' } }));
      for (const [k, v] of Object.entries(${JSON.stringify(Object.fromEntries(Object.entries(ANTIGUOS).filter(([k]) => k.startsWith('chrome.sync/grupo:') || k.startsWith('chrome.sync/nota:'))))})) localStorage.setItem(k, JSON.stringify(v));
    })()`);
    const resultados = await pg.ev(`import('/js/perfiles.js').then(m => Promise.all([m.migrar(), m.migrar()]))`);
    igual([...resultados].sort(), ['migrado', 'ya-estaba'], 'una migra y la otra ve que ya está hecho');
    s = await sync(pg);
    igual([s['perfil:principal:aspecto'].tema, s['perfil:principal:aspecto'].apariencia.acento], ['papel', '#e0245e'], 'el aspecto no se pierde');
    igual((await local(pg))['respaldo-v4'].tema, 'papel', 'y la copia de seguridad conserva lo antiguo');

    // (i) Un perfil que se cae del registro se vuelve a añadir (si no, otro equipo podría borrar sus claves).
    pg = await abrir({
      chrome: {},
      datos: null,
      guardados: {
        'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }] },
        'chrome.sync/perfil:principal:datos': estructura(BASE),
        'chrome.sync/perfil:otro:datos': estructura({ ...BASE, grupos: [] }),
        ...clavesNuevas(BASE),
      },
    });
    await pg.esperar(900);
    s = await sync(pg);
    igual(s.perfiles.lista.map(p => p.id), ['principal', 'otro'], 'el perfil que tenía datos y no estaba en el registro vuelve a él');
    // Y sin registro pero con perfiles ya migrados por otro equipo, se reconstruye en vez de empezar de cero.
    pg = await abrir({
      chrome: {},
      datos: null,
      guardados: { 'chrome.sync/perfil:principal:datos': estructura(BASE), 'chrome.sync/perfil:casa:datos': estructura({ ...BASE, grupos: [] }), ...clavesNuevas(BASE) },
    });
    await pg.esperar(900);
    s = await sync(pg);
    igual(s.perfiles.lista.map(p => p.id).sort(), ['casa', 'principal'], 'sin registro, se reconstruye desde los perfiles que hay');
    igual((await pg.datos()).grupos.map(g => g.nombre), NOMBRES, 'y principal no se pierde');

    // (j) Con la migración fallida no se puede cambiar de perfil, ni se escribe el aspecto ni se hacen copias.
    pg = await abrir({ chrome: {}, datos: estructura(BASE), guardados: { ...ANTIGUOS, 'chrome-falso/localFalla': 1 } });
    await pg.esperar(900);
    igual(await pg.ev(`document.getElementById('btn-reunion').disabled`), true, 'el ojo está desactivado');
    igual(await pg.ev(`document.getElementById('btn-perfil').hidden`), true, 'y el selector de perfiles oculto');
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('.muestra[data-tema="rosa"]').click()`);
    await pg.esperar(400);
    s = await sync(pg);
    igual(s.opciones, ANTIGUOS['chrome.sync/opciones'], '«opciones» antiguo intacto (el aspecto no se destruye)');
    igual(s.tema, 'papel', 'y «tema» también');
    afirmar(!Object.keys(await local(pg)).some(k => k.startsWith('copia:principal:')), 'sin copias diarias mientras no se migre');
    igual((await pg.datos()).grupos[0].enlaces.length, 4, 'lo antiguo se enseña con sus enlaces');
  },
};
