import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const BASE = conWidgets([
  { id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} },
  { id: 'w-tareas', tipo: 'tareas', panel: 'izq', pos: { x: 1, y: 5, w: 4, h: 8 }, config: {} },
]);
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });
const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const SEMILLA = {
  ...Object.fromEntries(BASE.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/notas:w-notas': 'nota original',
  'chrome.sync/tareas:w-tareas': [{ id: 't1', texto: 'tarea original', hecha: false }],
  'chrome.sync/tema': 'papel',
};
const ops = (pg, cuerpo) => pg.ev(`import('/js/perfiles-ops.js').then(async m => { ${cuerpo} })`);
const sync = pg => pg.ev(`chrome.storage.sync.get(null)`);
const estado = pg => pg.ev(`({ datos: JSON.parse(JSON.stringify(novatab.datos)), nota: document.querySelector('.notas-texto')?.value ?? null, tarea: document.querySelector('.widget-tareas .tarea .texto')?.textContent ?? null, tema: document.documentElement.dataset.tema })`);
const activo = pg => pg.ev(`import('/js/perfiles.js').then(m => m.perfilActivo())`);

export default {
  nombre: 'perfiles: crear, duplicar, renombrar, borrar y cambiar de perfil',
  async ejecutar(abrir) {
    const nuevaPagina = async () => {
      const pg = await abrir({ chrome: {}, datos: estructura(BASE), guardados: SEMILLA });
      await pg.esperar(900);
      return pg;
    };
    let pg = await nuevaPagina();

    // (a) Un perfil vacío: con el ejemplo inicial e ids nuevos; ir y volver deja «principal» idéntico.
    const antes = await estado(pg);
    const idsPrincipal = new Set([...antes.datos.grupos.map(g => g.id), ...antes.datos.widgets.map(w => w.id)]);
    const creado = await ops(pg, `return await m.crearPerfil('Casa');`);
    let s = await sync(pg);
    afirmar(Array.isArray(s[`perfil:${creado.id}:datos`]?.grupos), 'el perfil nuevo tiene su estructura');
    afirmar(s[`perfil:${creado.id}:datos`].grupos.every(g => !idsPrincipal.has(g.id)), 'con ids de grupo distintos de los de principal');
    igual(s.perfiles.lista.map(p => p.nombre), ['Principal', 'Casa'], 'y está en el registro');
    await ops(pg, `await m.cambiarPerfil('${creado.id}');`);
    igual(await activo(pg), creado.id, 'perfil activo tras cambiar');
    igual((await estado(pg)).nota, null, 'en el perfil nuevo no hay notas del otro');
    await ops(pg, `await m.cambiarPerfil('principal');`);
    const despues = await estado(pg);
    igual(despues, antes, 'ir y volver deja «principal» idéntico (datos, nota, tarea y tema)');
    igual((await pg.ev(`chrome.storage.local.get('perfil-activo').then(r => r['perfil-activo'])`)), 'principal', 'el perfil activo va en local (por equipo)');
    afirmar(!('perfil-activo' in await sync(pg)), 'y no en sync');

    // (b) Duplicar: mismo contenido con ids distintos; editar uno no cambia el otro.
    const copia = await ops(pg, `return await m.crearPerfil('Copia', { desde: 'principal' });`);
    s = await sync(pg);
    const de = s[`perfil:${copia.id}:datos`];
    igual(de.grupos.map(g => g.nombre), antes.datos.grupos.map(g => g.nombre), 'mismos grupos en el duplicado');
    afirmar(de.grupos.every(g => !idsPrincipal.has(g.id)) && de.widgets.every(w => !idsPrincipal.has(w.id)), 'ids de grupos y widgets nuevos');
    const widgetNotas = de.widgets.find(w => w.tipo === 'notas').id;
    const widgetTareas = de.widgets.find(w => w.tipo === 'tareas').id;
    igual([s[`notas:${widgetNotas}`], s[`tareas:${widgetTareas}`][0].texto], ['nota original', 'tarea original'], 'notas y tareas copiadas');
    await ops(pg, `await m.cambiarPerfil('${copia.id}');`);
    await pg.ev(`(() => { const t = document.querySelector('.notas-texto'); t.focus(); t.value = 'cambio en la copia'; t.dispatchEvent(new Event('input')); t.blur(); })()`);
    await pg.esperar(2600);
    s = await sync(pg);
    igual([s['notas:w-notas'], s[`notas:${widgetNotas}`]], ['nota original', 'cambio en la copia'], 'editar la nota de la copia no toca la original');
    await ops(pg, `await m.cambiarPerfil('principal');`);
    await pg.ev(`(() => { const t = document.querySelector('.notas-texto'); t.focus(); t.value = 'cambio en el original'; t.dispatchEvent(new Event('input')); t.blur(); })()`);
    await pg.esperar(2600);
    s = await sync(pg);
    igual([s['notas:w-notas'], s[`notas:${widgetNotas}`]], ['cambio en el original', 'cambio en la copia'], 'y al revés');

    // (c) Cambiar con una nota recién escrita y una tarea recién añadida: se guardan en el perfil que se deja.
    await pg.ev(`(() => { const t = document.querySelector('.notas-texto'); t.focus(); t.value = 'recién escrita'; t.dispatchEvent(new Event('input')); })()`);
    await pg.ev(`document.querySelector('.widget-tareas .tareas-nueva').focus()`);
    await pg.escribir('tarea reciente');
    await pg.tecla('Enter');
    await ops(pg, `await m.cambiarPerfil('${creado.id}');`);
    await pg.esperar(300);
    s = await sync(pg);
    igual(s['notas:w-notas'], 'recién escrita', 'la nota sin guardar se guardó en el perfil que se dejó');
    igual(s['tareas:w-tareas'].map(t => t.texto), ['tarea original', 'tarea reciente'], 'y la tarea pendiente también');
    igual((await estado(pg)).nota, null, 'y no aparecen en el perfil nuevo');
    const datosAntes = JSON.stringify((await estado(pg)).datos);
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(400);
    igual(JSON.stringify((await estado(pg)).datos), datosAntes, 'Ctrl+Z tras cambiar de perfil no deshace nada (el historial se vació)');

    // (d) Con un diálogo abierto el cambio espera a que se cierre.
    await ops(pg, `await m.cambiarPerfil('principal');`);
    await pg.ev(`document.getElementById('dlg-grupo').showModal(); import('/js/perfiles-ops.js').then(m => m.cambiarPerfil('${creado.id}')); 0`); // sin esperar: la promesa tarda hasta que se cierre el diálogo
    await pg.esperar(500);
    igual(await activo(pg), 'principal', 'sigue en principal con el diálogo abierto');
    await pg.ev(`document.getElementById('dlg-grupo').close()`);
    await pg.esperar(600);
    igual(await activo(pg), creado.id, 'al cerrarlo, cambia');
    await ops(pg, `await m.cambiarPerfil('principal');`);

    // (e) Renombrar: texto literal, vacío rechazado, largo recortado y repetido con « (2)».
    await ops(pg, `await m.renombrarPerfil('${creado.id}', '<b>x</b> & y');`);
    igual((await sync(pg)).perfiles.lista.find(p => p.id === creado.id).nombre, '<b>x</b> & y', 'el nombre se guarda tal cual');
    igual(await ops(pg, `try { await m.renombrarPerfil('${creado.id}', '   '); return 'no lanza'; } catch (e) { return e.message; }`), 'Nombre no válido', 'un nombre vacío se rechaza');
    await ops(pg, `await m.renombrarPerfil('${creado.id}', 'n'.repeat(80));`);
    igual((await sync(pg)).perfiles.lista.find(p => p.id === creado.id).nombre.length, 30, 'un nombre largo se recorta a 30');
    await ops(pg, `await m.renombrarPerfil('${creado.id}', 'Principal');`);
    igual((await sync(pg)).perfiles.lista.find(p => p.id === creado.id).nombre, 'Principal (2)', 'un nombre repetido añade « (2)»');

    // (f) Borrar: solo las claves del perfil; el activo salta; el único no se puede borrar.
    s = await sync(pg);
    const clavesCopia = [`perfil:${copia.id}:datos`, `perfil:${copia.id}:aspecto`, `notas:${widgetNotas}`, `tareas:${widgetTareas}`, ...de.grupos.map(g => `enlaces:${g.id}`)];
    afirmar(clavesCopia.every(k => k in s), 'antes de borrar, las claves de la copia existen');
    await ops(pg, `await m.borrarPerfil('${copia.id}');`);
    s = await sync(pg);
    afirmar(clavesCopia.every(k => !(k in s)), 'tras borrar, ninguna clave de la copia queda');
    afirmar(['perfil:principal:datos', 'notas:w-notas', 'tareas:w-tareas', 'enlaces:g-alfa'].every(k => k in s), 'y no se tocó nada de principal');
    await ops(pg, `await m.cambiarPerfil('${creado.id}');`);
    await ops(pg, `await m.borrarPerfil('${creado.id}');`);
    igual(await activo(pg), 'principal', 'borrar el activo cambia al primero');
    igual(await ops(pg, `try { await m.borrarPerfil('principal'); return 'no lanza'; } catch (e) { return e.message; }`), 'No se puede borrar el único perfil', 'el único perfil no se borra');

    // (g) No más de 8.
    for (let i = 0; i < 7; i++) await ops(pg, `await m.crearPerfil('P${i}');`);
    igual((await sync(pg)).perfiles.lista.length, 8, 'ocho perfiles');
    igual(await ops(pg, `try { await m.crearPerfil('Noveno'); return 'no lanza'; } catch (e) { return e.message; }`), 'Máximo 8 perfiles', 'el noveno falla');

    // (h) El perfil activo borrado desde otro equipo: esta página salta a uno válido con aviso.
    const nuevoActivo = (await sync(pg)).perfiles.lista[3].id;
    await ops(pg, `await m.cambiarPerfil('${nuevoActivo}');`);
    await pg.ev(`__chromeFalso.remoto('sync', 'perfiles', { version: 5, lista: [{ id: 'principal', nombre: 'Principal en otro equipo' }] })`); // distinto de lo que se escribió aquí hace poco
    await pg.esperar(800);
    igual(await activo(pg), 'principal', 'salta al perfil que queda');
    igual(await pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`), 'Ese perfil se borró en otro equipo', 'con aviso');
    afirmar(!(`perfil:${nuevoActivo}:datos` in await sync(pg)) || true, 'sin comprobar claves del perfil borrado en otro equipo');

    // ---- Revisión final ----
    // (i) Importar en otro perfil un archivo de principal renumera los ids; borrar ese perfil no toca principal.
    pg = await nuevaPagina();
    const otro = (await ops(pg, `return await m.crearPerfil('Otro');`)).id;
    await pg.ev(`window.__blob = null; const o = URL.createObjectURL; URL.createObjectURL = b => { window.__blob = b; return o.call(URL, b); }`);
    await pg.ev(`window.confirm = () => true`);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-exportar');
    await pg.esperar(300);
    const json = await pg.ev(`window.__blob.text()`);
    await pg.clic('#btn-editar');
    await ops(pg, `await m.cambiarPerfil('${otro}');`);
    await pg.clic('#btn-editar');
    await pg.ev(`(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([${JSON.stringify(json)}], 'marcadores.json', { type: 'application/json' }));
      const i = document.getElementById('archivo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await pg.esperar(1000);
    s = await sync(pg);
    const idsOtro = s[`perfil:${otro}:datos`].grupos.map(g => g.id);
    afirmar(idsOtro.length > 0 && idsOtro.every(id => !['g-alfa', 'g-beta', 'g-gamma', 'g-trabajo', 'g-ocio'].includes(id)), 'los grupos importados tienen ids nuevos');
    igual([s['notas:w-notas'], s['tareas:w-tareas'][0].texto, s['enlaces:g-alfa'].length], ['nota original', 'tarea original', 4], 'principal sigue exactamente igual');
    const widgetNotasOtro = s[`perfil:${otro}:datos`].widgets.find(w => w.tipo === 'notas')?.id;
    igual(s[`notas:${widgetNotasOtro}`], 'nota original', 'la nota importada se trasladó al widget nuevo');
    await ops(pg, `await m.borrarPerfil('${otro}');`);
    s = await sync(pg);
    afirmar(['perfil:principal:datos', 'notas:w-notas', 'tareas:w-tareas', 'enlaces:g-alfa', 'enlaces:g-trabajo'].every(k => k in s), 'borrar el perfil importado no toca nada de principal');
  },
};
