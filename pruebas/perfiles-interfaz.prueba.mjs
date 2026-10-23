import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const GRUPO_C = { id: 'g-casa', nombre: 'GrupoCasa', zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [{ id: 'ec', nombre: 'Router casa', url: 'http://192.168.0.1/' }] };
const estructura = (grupos, widgets = []) => ({ version: 4, titulos: {}, grupos: grupos.map(({ enlaces, ...g }) => g), widgets });
const semilla = (extra = {}) => ({
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'casa', nombre: 'Casa' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA.grupos),
  'chrome.sync/perfil:casa:datos': estructura([GRUPO_C]),
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/enlaces:g-casa': guardables(GRUPO_C.enlaces),
  'chrome.sync/perfil:principal:aspecto': { tema: 'papel' },
  'chrome.sync/perfil:casa:aspecto': { tema: 'noche' },
  'chrome.local/perfil-activo': 'principal',
  ...extra,
});
const items = pg => pg.ev(`[...document.querySelectorAll('#menu-perfiles [role="menuitemradio"]')].map(b => [b.textContent, b.getAttribute('aria-checked')])`);
const grupos = pg => pg.ev(`novatab.datos.grupos.map(g => g.nombre)`);
const abrirMenu = async pg => {
  await pg.clic('#btn-perfil');
  await pg.esperar(150);
};
const aviso = pg => pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`);
const dialogo = async (pg, nombre, duplicar) => {
  await pg.ev(`(() => { const d = document.getElementById('dlg-perfil'); d.querySelector('input[name="nombre"]').value = ${JSON.stringify(nombre)}; ${duplicar === undefined ? '' : `d.querySelector('input[name="duplicar"]').checked = ${duplicar};`} })()`);
  await pg.clic('#dlg-perfil button[value="ok"]');
  await pg.esperar(900);
};

export default {
  nombre: 'perfiles: selector en la cabecera y entradas en Ctrl+K',
  async ejecutar(abrir) {
    const nueva = (extra, opciones = {}) => abrir({ chrome: {}, datos: null, guardados: semilla(extra), ...opciones });
    let pg = await nueva();
    await pg.esperar(800);

    // (a) El botón muestra el perfil activo; el menú lista los dos; elegir el otro cambia la página.
    igual(await pg.ev(`document.getElementById('btn-perfil').textContent.trim()`), 'Principal ▾', 'botón con el perfil activo');
    await abrirMenu(pg);
    igual(await pg.ev(`document.getElementById('btn-perfil').getAttribute('aria-expanded')`), 'true', 'aria-expanded');
    igual(await items(pg), [['Principal', 'true'], ['Casa', 'false']], 'menú con los dos perfiles');
    await pg.ev(`[...document.querySelectorAll('#menu-perfiles [role="menuitemradio"]')][1].click()`);
    await pg.esperar(600);
    igual(await grupos(pg), ['GrupoCasa'], 'la página muestra los grupos del otro perfil');
    igual(await pg.ev(`[document.documentElement.dataset.tema, document.getElementById('btn-perfil').textContent.trim()]`), ['noche', 'Casa ▾'], 'su tema y el botón');
    afirmar(await pg.ev(`document.getElementById('menu-perfiles').hidden`), 'el menú se cierra al elegir');

    // (b) Nuevo perfil, con y sin duplicar; con 8 avisa.
    await abrirMenu(pg);
    await pg.ev(`document.querySelector('#menu-perfiles [data-accion-perfil="nuevo"]').click()`);
    await pg.esperar(300);
    afirmar(await pg.ev(`document.getElementById('dlg-perfil').open`), 'se abre el diálogo de nuevo perfil');
    await dialogo(pg, 'Vacío', false);
    igual(await pg.ev(`document.getElementById('btn-perfil').textContent.trim()`), 'Vacío ▾', 'se cambia al perfil nuevo');
    afirmar(!(await grupos(pg)).includes('GrupoCasa'), 'el perfil sin duplicar nace con el ejemplo inicial');
    await abrirMenu(pg);
    await pg.ev(`[...document.querySelectorAll('#menu-perfiles [role="menuitemradio"]')][1].click()`);
    await pg.esperar(600);
    await abrirMenu(pg);
    await pg.ev(`document.querySelector('#menu-perfiles [data-accion-perfil="nuevo"]').click()`);
    await pg.esperar(300);
    await dialogo(pg, 'Igual que casa', true);
    igual(await grupos(pg), ['GrupoCasa'], 'duplicando, el perfil nuevo tiene los grupos del actual');
    for (let i = 0; i < 4; i++) await pg.ev(`import('/js/perfiles-ops.js').then(m => m.crearPerfil('Extra${i}'))`);
    await abrirMenu(pg);
    await pg.ev(`document.querySelector('#menu-perfiles [data-accion-perfil="nuevo"]').click()`);
    await pg.esperar(300);
    igual(await aviso(pg), 'Máximo 8 perfiles', 'con 8 perfiles avisa');
    afirmar(!(await pg.ev(`document.getElementById('dlg-perfil').open`)), 'y no abre el diálogo');

    // (c) Renombrar y borrar desde el menú.
    pg = await nueva();
    await pg.esperar(800);
    await abrirMenu(pg);
    await pg.ev(`document.querySelector('#menu-perfiles [data-accion-perfil="renombrar"]').click()`);
    await pg.esperar(300);
    igual(await pg.ev(`document.querySelector('#dlg-perfil input[name="nombre"]').value`), 'Principal', 'el diálogo parte del nombre actual');
    await dialogo(pg, '<b>Trabajo</b> & más');
    igual(await pg.ev(`document.getElementById('btn-perfil').textContent.trim()`), '<b>Trabajo</b> & más ▾', 'el nombre sale como texto');
    igual(await pg.ev(`document.querySelectorAll('#btn-perfil b, #menu-perfiles b').length`), 0, 'sin HTML interpretado');
    await pg.ev(`window.confirm = () => true`);
    await abrirMenu(pg);
    await pg.ev(`[...document.querySelectorAll('#menu-perfiles [role="menuitemradio"]')][1].click()`);
    await pg.esperar(600);
    await abrirMenu(pg);
    await pg.ev(`document.querySelector('#menu-perfiles [data-accion-perfil="borrar"]').click()`);
    await pg.esperar(800);
    afirmar(await pg.ev(`document.getElementById('menu-perfiles').hidden`), 'el menú se cierra tras borrar');
    await abrirMenu(pg);
    igual((await items(pg)).map(x => x[0]), ['<b>Trabajo</b> & más'], 'borrado el activo, queda el otro');
    igual(await pg.ev(`!!document.querySelector('#menu-perfiles [data-accion-perfil="borrar"]')`), false, 'con un solo perfil no hay «Borrar…»');

    // (d) Teclado: ↓ ↓ Enter elige el tercer elemento del menú; Esc cierra y devuelve el foco; clic fuera cierra.
    pg = await nueva();
    await pg.esperar(800);
    await pg.ev(`document.getElementById('btn-perfil').focus()`);
    await pg.tecla('Enter');
    await pg.esperar(150);
    afirmar(!(await pg.ev(`document.getElementById('menu-perfiles').hidden`)), 'Enter abre el menú');
    await pg.tecla('ArrowDown');
    await pg.tecla('ArrowDown');
    await pg.tecla('Enter');
    await pg.esperar(500);
    afirmar(await pg.ev(`document.getElementById('dlg-perfil').open`), '↓ ↓ Enter llega a «Nuevo perfil…» (tercer elemento) y abre su diálogo');
    await pg.ev(`(() => { const d = document.getElementById('dlg-perfil'); if (d.open) d.close(); })()`);
    await abrirMenu(pg);
    await pg.tecla('Escape');
    afirmar(await pg.ev(`document.getElementById('menu-perfiles').hidden`), 'Esc cierra');
    igual(await pg.ev(`document.activeElement.id`), 'btn-perfil', 'y devuelve el foco al botón');
    await abrirMenu(pg);
    await pg.ev(`document.body.click()`);
    afirmar(await pg.ev(`document.getElementById('menu-perfiles').hidden`), 'un clic fuera cierra');

    // (e) Ctrl+K: «Perfil: Casa» cambia; el actual no hace nada; los nombres se ven como texto.
    pg = await nueva({ 'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'casa', nombre: '<i>Casa</i>' }] } });
    await pg.esperar(800);
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.tecla('k', 'ctrl');
    await pg.esperar(150);
    await pg.escribir('perfil casa');
    igual(await pg.ev(`[...document.querySelectorAll('#paleta-lista .p-titulo')].map(t => t.textContent)`), ['Perfil: <i>Casa</i>'], 'el título del perfil sale literal');
    await pg.tecla('Enter');
    await pg.esperar(700);
    igual(await grupos(pg), ['GrupoCasa'], 'Enter cambia al perfil elegido');
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('k', 'ctrl');
    await pg.esperar(150);
    await pg.escribir('perfil');
    igual(await pg.ev(`[...document.querySelectorAll('#paleta-lista .p-titulo')].map(t => t.textContent)`), ['Perfil: Principal', 'Perfil: <i>Casa</i> (actual)'], 'el actual lleva «(actual)»');
    await pg.ev(`[...document.querySelectorAll('#paleta-lista [role="option"]')][1].click()`);
    await pg.esperar(400);
    igual(await grupos(pg), ['GrupoCasa'], 'elegir el actual no hace nada');

    // (f) Un cambio del registro desde otro equipo actualiza el menú sin cerrar un diálogo abierto.
    pg = await nueva();
    await pg.esperar(800);
    await pg.ev(`document.getElementById('dlg-grupo').showModal()`);
    await pg.ev(`__chromeFalso.remoto('sync', 'perfiles', { version: 5, lista: [{ id: 'principal', nombre: 'Renombrado fuera' }, { id: 'casa', nombre: 'Casa' }, { id: 'nuevo', nombre: 'Nuevo fuera' }] })`);
    await pg.esperar(400);
    afirmar(await pg.ev(`document.getElementById('dlg-grupo').open`), 'el diálogo abierto sigue abierto');
    await pg.ev(`document.getElementById('dlg-grupo').close()`);
    igual(await pg.ev(`document.getElementById('btn-perfil').textContent.trim()`), 'Renombrado fuera ▾', 'el botón se actualiza');
    await abrirMenu(pg);
    igual((await items(pg)).map(x => x[0]), ['Renombrado fuera', 'Casa', 'Nuevo fuera'], 'y el menú');

    // (g) Con 900 px de ancho el botón es visible y el menú cabe.
    pg = await nueva({}, { ancho: 900 });
    await pg.esperar(800);
    await abrirMenu(pg);
    const cabe = await pg.ev(`(() => { const b = document.getElementById('btn-perfil').getBoundingClientRect(); const m = document.getElementById('menu-perfiles').getBoundingClientRect(); return [b.width > 0 && b.right <= innerWidth, m.left >= 0 && m.right <= innerWidth, document.documentElement.scrollWidth <= innerWidth]; })()`);
    igual(cabe, [true, true, true], 'botón visible, menú dentro de la ventana y sin desplazamiento horizontal');
  },
};
