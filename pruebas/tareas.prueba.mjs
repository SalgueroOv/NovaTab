import { afirmar, igual } from './lib/util.mjs';
import { conWidgets, DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const WIDGET = { id: 'w-tareas', tipo: 'tareas', panel: 'izq', pos: { x: 1, y: 1, w: 4, h: 8 }, config: {} };
const CON_TAREAS = conWidgets([WIDGET]);
const modulo = `import('/js/widgets/tareas-datos.js')`;
const enSync = `chrome.storage.sync.get('tareas:w-tareas').then(r => r['tareas:w-tareas'] ?? null)`;
const clavesSync = `chrome.storage.sync.get(null).then(t => Object.keys(t).filter(k => k.startsWith('tareas:')))`;
const textos = pg => pg.ev(`[...document.querySelectorAll('.widget-tareas .tarea .texto')].map(t => t.textContent)`);
const anadir = async (pg, texto) => {
  // Con las pruebas en paralelo el widget puede tardar en pintarse: se espera a su campo.
  await pg.ev(`new Promise(ok => { const t0 = Date.now(); (function mira() { const i = document.querySelector('.widget-tareas .tareas-nueva'); if (i || Date.now() - t0 > 3000) ok(i?.focus()); else setTimeout(mira, 50); })(); })`);
  await pg.escribir(texto);
  await pg.tecla('Enter');
  await pg.esperar(100);
};
const conf = pg => pg.ev(`window.confirm = () => true`);

export default {
  nombre: 'tareas: normalizar, ciclo, deshacer, exportar, copias y otras pestañas',
  async ejecutar(abrir) {
    let pg = await abrir({ chrome: {}, datos: CON_TAREAS });
    await pg.esperar(400);

    // (a) normalizarTareas.
    const norm = v => pg.ev(`${modulo}.then(m => m.normalizarTareas(${v}))`);
    for (const v of ['undefined', "'x'", '[1, null, {}, { texto: "" }]']) igual(await norm(v), [], `normalizarTareas(${v})`);
    igual((await norm(`[{ texto: 'a'.repeat(300) }]`))[0].texto.length, 120, 'texto recortado a 120');
    igual((await norm(`Array.from({ length: 60 }, (_, i) => ({ texto: 't' + i }))`)).length, 40, 'como mucho 40');
    igual((await norm(`[{ texto: 'x', hecha: 'sí' }]`))[0].hecha, false, 'hecha no booleana pasa a false');
    afirmar(!!(await norm(`[{ texto: 'x' }]`))[0].id, 'se asigna un id');

    // (b) Añadir, marcar, borrar hechas y recargar.
    await anadir(pg, 'Comprar pan');
    await anadir(pg, 'Llamar');
    igual(await textos(pg), ['Comprar pan', 'Llamar'], 'dos tareas añadidas');
    await pg.ev(`document.querySelector('.widget-tareas .tarea input[type="checkbox"]').click()`);
    await pg.esperar(700);
    igual(await textos(pg), ['Llamar', 'Comprar pan'], 'las hechas van al final');
    igual((await pg.ev(enSync)).map(t => [t.texto, t.hecha]), [['Llamar', false], ['Comprar pan', true]], 'guardado en sync');
    await pg.recargar();
    await pg.esperar(500);
    igual(await textos(pg), ['Llamar', 'Comprar pan'], 'tras recargar');
    await pg.ev(`document.querySelector('.widget-tareas .borrar-hechas').click()`);
    await pg.esperar(700);
    igual(await textos(pg), ['Llamar'], 'borrar hechas');
    await anadir(pg, 'Otra');
    await pg.ev(`document.querySelector('.widget-tareas .tarea .borrar-tarea').click()`);
    await pg.esperar(700);
    igual((await pg.ev(enSync)).map(t => t.texto), ['Otra'], 'borrar una tarea');

    // (c) El texto se muestra literal.
    await anadir(pg, '<img src=x onerror=1> & "comillas"');
    igual((await textos(pg)).at(-1), '<img src=x onerror=1> & "comillas"', 'texto literal');
    igual(await pg.ev(`document.querySelectorAll('.widget-tareas img').length`), 0, 'ningún elemento HTML');

    // (d) Borrar el widget borra su clave; deshacer lo recupera con sus tareas (incluso las no guardadas en datos).
    await pg.esperar(700);
    await conf(pg);
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('.widget-tareas [data-accion-widget="borrar"]').click()`);
    await pg.esperar(500);
    igual(await pg.ev(clavesSync), [], 'la clave del widget borrado desaparece');
    await pg.clic('#btn-editar');
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(600);
    igual((await textos(pg)).length, 2, 'deshacer recupera las tareas');
    igual((await pg.ev(enSync)).map(t => t.texto), ['Otra', '<img src=x onerror=1> & "comillas"'], 'y su clave');

    // (e) Exportar, importar en otra página y «Restablecer todo».
    await pg.ev(`window.__blob = null; const o = URL.createObjectURL; URL.createObjectURL = b => { window.__blob = b; return o.call(URL, b); }`);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-exportar');
    await pg.esperar(300);
    const json = await pg.ev(`window.__blob.text()`);
    igual(Object.keys(JSON.parse(json).tareas), ['w-tareas'], 'el JSON exportado lleva las tareas por widget');
    pg = await abrir({ chrome: {}, datos: conWidgets([]) });
    await pg.esperar(400);
    await pg.ev(`localStorage.setItem('chrome.sync/tareas:huerfana', JSON.stringify([{ id: 'h', texto: 'huérfana', hecha: false }]))`);
    await conf(pg);
    await pg.clic('#btn-editar');
    await pg.ev(`(() => {
      const dt = new DataTransfer();
      dt.items.add(new File([${JSON.stringify(json)}], 'copia.json', { type: 'application/json' }));
      const i = document.getElementById('archivo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await pg.esperar(700);
    igual(await pg.ev(clavesSync), ['tareas:w-tareas'], 'importar restaura las tareas y no deja claves de widgets que no existen');
    igual((await textos(pg)).length, 2, 'las tareas importadas se ven');
    await pg.clic('#btn-editar');
    await pg.clic('#btn-tema');
    await pg.clic('#btn-restablecer');
    await pg.ev(`document.getElementById('texto-restablecer').value = 'BORRAR'; document.getElementById('texto-restablecer').dispatchEvent(new Event('input'))`);
    await pg.clic('#confirmar-restablecer');
    await pg.esperar(700);
    igual(await pg.ev(clavesSync), [], '«Restablecer todo» borra las tareas');

    // (f) Copias: recuperar una con widget y tareas restaura la lista; una sin widget no deja claves huérfanas.
    const hoy = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
    pg = await abrir({ chrome: {}, datos: CON_TAREAS, guardados: { 'chrome.sync/tareas:w-tareas': [{ id: 'a', texto: 'De la copia', hecha: false }] } });
    await pg.esperar(600);
    igual(JSON.parse(await pg.ev(`localStorage.getItem('chrome.local/copia:principal:${hoy}')`)).tareas['w-tareas'].map(t => t.texto), ['De la copia'], 'la copia de hoy lleva las tareas');
    await pg.ev(`document.querySelector('.widget-tareas .borrar-tarea').click()`);
    await pg.esperar(700);
    igual(await textos(pg), [], 'lista vaciada');
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#lista-copias li button').click()`);
    await pg.esperar(700);
    igual(await textos(pg), ['De la copia'], 'recuperar la copia restaura las tareas');
    const antigua = { fecha: '2020-01-01', datos: { version: 4, titulos: {}, widgets: [], grupos: [{ id: 'g', nombre: 'Solo', zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [{ id: 'e', nombre: 'Uno', url: 'http://192.168.1.2/' }] }] }, notas: {}, tareas: {} };
    await pg.ev(`localStorage.setItem('chrome.local/copia:principal:2020-01-01', ${JSON.stringify(JSON.stringify(antigua))})`);
    await pg.clic('#btn-tema');
    await pg.clic('#btn-tema');
    await pg.ev(`[...document.querySelectorAll('#lista-copias li')].find(li => li.textContent.includes('1 ene')).querySelector('button').click()`);
    await pg.esperar(700);
    igual(await pg.ev(clavesSync), [], 'una copia sin widget no deja claves tareas:*');

    // (g) Un cambio remoto se ve al momento, o al terminar si se está escribiendo.
    pg = await abrir({ chrome: {}, datos: CON_TAREAS });
    await pg.esperar(500);
    await pg.ev(`__chromeFalso.remoto('sync', 'tareas:w-tareas', [{ id: 'r1', texto: 'Remota', hecha: false }])`);
    await pg.esperar(300);
    igual(await textos(pg), ['Remota'], 'cambio remoto visible');
    await pg.ev(`(() => { const i = document.querySelector('.widget-tareas .tareas-nueva'); i.focus(); i.value = 'escribiendo'; i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await pg.ev(`__chromeFalso.remoto('sync', 'tareas:w-tareas', [{ id: 'r2', texto: 'Segunda remota', hecha: false }])`);
    await pg.esperar(300);
    igual(await textos(pg), ['Remota'], 'con texto escrito en el campo, el cambio espera');
    await pg.ev(`document.querySelector('.widget-tareas .tareas-nueva').blur()`);
    await pg.esperar(300);
    igual(await textos(pg), ['Segunda remota'], 'al terminar de escribir se aplica');

    // (h) Con 40 tareas no se puede añadir otra.
    const cuarenta = Array.from({ length: 40 }, (_, i) => ({ id: `t${i}`, texto: `Tarea ${i}`, hecha: false }));
    pg = await abrir({ chrome: {}, datos: CON_TAREAS, guardados: { 'chrome.sync/tareas:w-tareas': cuarenta } });
    await pg.esperar(500);
    await anadir(pg, 'Una más');
    igual((await textos(pg)).length, 40, 'siguen siendo 40');
    igual(await pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`), 'Máximo 40 tareas', 'aviso del máximo');

    // ---- Revisión final ----
    // (i) Un cambio remoto igual a lo último que escribí aquí se aplica (no es un eco).
    pg = await abrir({ chrome: {}, datos: CON_TAREAS });
    await pg.esperar(500);
    await anadir(pg, 'Mia');
    await pg.esperar(700);
    const L1 = await pg.ev(enSync);
    await pg.ev(`__chromeFalso.remoto('sync', 'tareas:w-tareas', [{ id: 'r1', texto: 'Otra pestaña', hecha: false }])`);
    await pg.esperar(300);
    igual(await textos(pg), ['Otra pestaña'], 'se aplica el cambio remoto');
    await pg.ev(`__chromeFalso.remoto('sync', 'tareas:w-tareas', ${JSON.stringify(L1)})`);
    await pg.esperar(300);
    igual(await textos(pg), ['Mia'], 'una lista remota igual a mi última escritura también se aplica');

    // (j) Un cambio remoto llegado mientras se escribe se suma a la tarea nueva (no se pierde ni se revierte).
    pg = await abrir({ chrome: {}, datos: CON_TAREAS, guardados: { 'chrome.sync/tareas:w-tareas': [{ id: 'v1', texto: 'Vieja', hecha: false }] } });
    await pg.esperar(500);
    await pg.ev(`(() => { const i = document.querySelector('.widget-tareas .tareas-nueva'); i.focus(); })()`);
    await pg.escribir('Nueva');
    await pg.ev(`__chromeFalso.remoto('sync', 'tareas:w-tareas', [{ id: 'r1', texto: 'Remota', hecha: false }])`);
    await pg.esperar(300);
    await pg.tecla('Enter');
    await pg.esperar(700);
    igual(await textos(pg), ['Remota', 'Nueva'], 'la tarea nueva se suma a lo remoto');
    igual((await pg.ev(enSync)).map(t => t.texto), ['Remota', 'Nueva'], 'y lo guardado es lo mismo que se ve');

    // (k) Con texto multibyte la lista no pasa de 7 KB y avisa «Lista llena».
    pg = await abrir({ chrome: {}, datos: CON_TAREAS });
    await pg.esperar(500);
    const cjk = 'あ'.repeat(120);
    for (let i = 0; i < 25; i++) await anadir(pg, `${cjk}`);
    await pg.esperar(700);
    const guardada = await pg.ev(enSync);
    afirmar(new TextEncoder().encode(JSON.stringify(guardada)).length <= 7000, 'lo guardado cabe en 7000 bytes');
    afirmar(guardada.length < 25 && guardada.length >= 10, `se cortó antes de las 25 (hay ${guardada.length})`);
    igual(await pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`), 'Lista llena', 'aviso de lista llena');
    const gran = await pg.ev(`${modulo}.then(m => m.normalizarTareas(Array.from({ length: 40 }, (_, i) => ({ id: 'i' + i, texto: ${JSON.stringify(cjk)} }))).length)`);
    afirmar(gran < 40, 'normalizarTareas también corta por tamaño');

    // (l) Ids repetidos se corrigen; ids de widget numéricos se leen como texto.
    const ids = await pg.ev(`${modulo}.then(m => m.normalizarTareas([{ id: 'a', texto: 'x' }, { id: 'a', texto: 'y' }]).map(t => t.id))`);
    igual(new Set(ids).size, 2, 'ids de tarea únicos');
    pg = await abrir({ datos: { ...structuredClone(CON_TAREAS), widgets: [{ ...WIDGET, id: 5 }] } });
    await pg.esperar(400);
    igual(await pg.ev(`novatab.datos.widgets[0].id`), '5', 'el id numérico de un widget pasa a texto');

    // (m) Un guardado pendiente no escribe la clave de un widget que ya no existe (deshacer tras añadirlo).
    pg = await abrir({ chrome: {}, datos: conWidgets([]) });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-nuevo-widget');
    await pg.esperar(200);
    await pg.ev(`[...document.querySelectorAll('#dlg-widget .tipo-widget')].find(b => b.textContent.startsWith('Tareas')).click()`);
    await pg.esperar(500);
    await pg.clic('#btn-editar');
    await anadir(pg, 'Efímera');
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(900);
    igual(await pg.ev(`novatab.datos.widgets.length`), 0, 'el widget se deshizo');
    igual(await pg.ev(clavesSync), [], 'sin claves tareas:* huérfanas');
  },
};
