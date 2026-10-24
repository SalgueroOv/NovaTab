import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });
const DOS_PERFILES = {
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'otro', nombre: 'Otro' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA),
  'chrome.sync/perfil:otro:datos': { ...estructura(DATOS_PRUEBA), grupos: [] },
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/perfil:principal:aspecto': { tema: 'bosque', apariencia: { fondo: 'curvas' } },
  'chrome.sync/perfil:otro:aspecto': { tema: 'papel', apariencia: { fondo: 'rayas' } },
  'chrome.local/perfil-activo': 'principal',
};
// Píxeles de un canvas distintos del primero: una miniatura con dibujo no es un color liso.
const distintos = el => `(() => { const c = ${el}; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) n++; return n; })()`;
const alto = `Math.round(document.getElementById('isla').getBoundingClientRect().height)`;

// Posición y ancho de un elemento, redondeados.
const caja = sel => `(() => { const r = document.querySelector('${sel}').getBoundingClientRect(); return { left: Math.round(r.left), width: Math.round(r.width), top: Math.round(r.top), right: Math.round(r.right) }; })()`;
const cerca = (a, b, margen = 1) => Math.abs(a - b) <= margen;
const fondoDe = sel => `getComputedStyle(document.querySelector('${sel}')).backgroundColor`;

export default {
  nombre: 'isla: un solo mando encima del panel derecho, con su color y su ancho',
  async ejecutar(abrir) {
    let pg = await abrir({ reducirMovimiento: true });
    await pg.esperar(400);

    // (a) Encima del panel derecho, con su mismo ancho y su mismo color.
    let isla = await pg.ev(caja('#isla'));
    let derecha = await pg.ev(caja('.derecha'));
    afirmar(cerca(isla.left, derecha.left) && cerca(isla.width, derecha.width), `la isla tiene el ancho del panel (isla ${JSON.stringify(isla)}, panel ${JSON.stringify(derecha)})`);
    afirmar(isla.top < derecha.top, 'y va encima de él');
    igual(await pg.ev(fondoDe('#isla')), await pg.ev(fondoDe('.derecha')), 'con el mismo color');

    // (b) Sigue al panel cuando cambia el reparto de anchos.
    await pg.ev(`import('/js/apariencia.js').then(m => m.cambiarAnchoIzq(30))`);
    await pg.esperar(300);
    isla = await pg.ev(caja('#isla'));
    derecha = await pg.ev(caja('.derecha'));
    afirmar(cerca(isla.left, derecha.left) && cerca(isla.width, derecha.width), 'sigue al panel tras mover el separador');

    // (c) Con el panel derecho oculto, la isla va encima del izquierdo.
    await pg.clic('#btn-panel-der');
    await pg.esperar(300);
    isla = await pg.ev(caja('#isla'));
    const izquierda = await pg.ev(caja('.izquierda'));
    afirmar(cerca(isla.left, izquierda.left) && cerca(isla.width, izquierda.width), `sin panel derecho, la isla tiene el ancho del izquierdo (isla ${JSON.stringify(isla)}, izquierda ${JSON.stringify(izquierda)})`);
    afirmar(isla.top < izquierda.top, 'y va encima de él');
    await pg.clic('#btn-panel-der');

    // (e) Lo que desaparece y lo que cambia de sitio.
    igual(await pg.ev(`['.esquina', '.barra-edicion', '.selector-perfil'].filter(s => document.querySelector(s))`), [], 'sin esquina, barra de edición ni selector antiguo');
    await pg.clic('#btn-editar');
    igual(await pg.ev(`!!document.querySelector('p.ayuda')`), false, 'sin el párrafo de ayuda en edición');
    await pg.clic('#btn-listo');
    igual(await pg.ev(`['#btn-exportar', '#btn-importar', '#btn-importar-marcadores', '#btn-panel-izq', '#btn-panel-der'].filter(s => !document.querySelector('#panel-tema ' + s))`), [], 'datos y paneles dentro de Personalizar');

    // (f) «Buscar o mandar» abre la paleta.
    await pg.clic('#btn-paleta');
    afirmar(await pg.ev(`document.getElementById('paleta').open`), 'la paleta se abre desde la isla');
    await pg.ev(`document.getElementById('paleta').close()`);

    // (g) Nombres accesibles en la barra, y el chip con el nombre del perfil.
    igual(await pg.ev(`[...document.querySelectorAll('#isla .capa-barra button')].filter(b => !(b.getAttribute('aria-label') || b.textContent.trim())).map(b => b.id)`), [], 'todos los botones con nombre accesible');
    igual(await pg.ev(`document.getElementById('btn-perfil').textContent.trim()`), 'Principal', 'el chip lleva el nombre del perfil');

    // (h) El menú de perfiles: una carta por perfil con su terreno, la isla crece y aparece el velo.
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES, reducirMovimiento: true });
    await pg.esperar(600);
    afirmar(await pg.ev(distintos(`document.querySelector('#btn-perfil canvas.mini-perfil')`)) > 20, 'el chip lleva el terreno del perfil');
    await pg.clic('#btn-perfil');
    await pg.esperar(400);
    afirmar(!(await pg.ev(`document.getElementById('menu-perfiles').hidden`)), 'el menú se ve');
    igual(await pg.ev(`document.querySelectorAll('#menu-perfiles .carta-perfil').length`), 2, 'una carta por perfil');
    for (const i of [0, 1]) afirmar(await pg.ev(distintos(`document.querySelectorAll('#menu-perfiles canvas.mini-terreno')[${i}]`)) > 50, `la carta ${i} lleva su terreno`);
    afirmar(await pg.ev(alto) > 120, 'la isla crece');
    afirmar(await pg.ev(`document.body.classList.contains('con-velo')`), 'con velo detrás');
    const fondoAbierta = await pg.ev(fondoDe('#isla'));
    afirmar(!/rgba|\/\s*0?\.\d/.test(fondoAbierta), `abierta es opaca: no se ve el contenido de detrás (${fondoAbierta})`);

    // (i) Esc cierra, la isla vuelve a su alto y el foco al chip.
    await pg.ev(`document.querySelector('#menu-perfiles [aria-checked="true"]').focus()`);
    await pg.ev(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await pg.esperar(300);
    afirmar(await pg.ev(`document.getElementById('menu-perfiles').hidden`), 'Esc cierra el menú');
    afirmar(Math.abs(await pg.ev(alto) - 56) <= 2, 'la isla vuelve a 56 px');
    igual(await pg.ev(`document.activeElement.id`), 'btn-perfil', 'el foco vuelve al chip');
    afirmar(!(await pg.ev(`document.body.classList.contains('con-velo')`)), 'sin velo');

    // (j) Con el menú abierto, un cambio de perfil por fuera lo repinta con la marca en el activo.
    await pg.clic('#btn-perfil');
    await pg.esperar(300);
    await pg.ev(`import('/js/perfiles-ops.js').then(m => m.cambiarPerfil('otro'))`);
    await pg.esperar(600);
    igual(await pg.ev(`document.querySelector('#menu-perfiles [aria-checked="true"]')?.textContent.trim()`), 'Otro', 'la marca pasa al perfil activo');
    igual(pg.errores, [], 'sin errores');

    // (k) Un nombre larguísimo cabe en el chip.
    await pg.ev(`import('/js/perfiles-ops.js').then(async m => { const { id } = await m.crearPerfil('${'x'.repeat(30)}', {}); await m.cambiarPerfil(id); })`);
    await pg.esperar(700);
    afirmar(await pg.ev(`document.getElementById('btn-perfil').getBoundingClientRect().right <= document.getElementById('isla').getBoundingClientRect().right`), 'el chip no se sale de la isla');

    // (l) Editar: la isla pasa a la barra de edición, con deshacer desactivado mientras no haya nada.
    pg = await abrir({ reducirMovimiento: true });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    await pg.esperar(200);
    afirmar(!(await pg.ev(`document.querySelector('#isla .capa-edicion').hidden`)) && await pg.ev(`document.querySelector('#isla .capa-barra').hidden`), 'en edición se ve la barra de edición y no la normal');
    igual(await pg.ev(`['[data-nuevo-grupo="local"]', '#btn-nuevo-widget', '#btn-deshacer', '#btn-listo'].filter(s => !document.querySelector('#isla .capa-edicion ' + s))`), [], 'con sus cuatro botones');
    afirmar(await pg.ev(`document.getElementById('btn-deshacer').disabled`), 'deshacer desactivado sin historial');
    igual(await pg.ev(`document.getElementById('editando-txt').textContent`), 'Editando Principal', 'dice qué perfil se edita');

    // (m) Borrar un grupo activa deshacer, y deshacer lo devuelve.
    await pg.ev(`window.confirm = () => true`);
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('[data-accion="borrar-grupo"]').click()`);
    await pg.esperar(400);
    afirmar(!(await pg.ev(`document.getElementById('btn-deshacer').disabled`)), 'tras borrar, deshacer se activa');
    await pg.clic('#btn-deshacer');
    await pg.esperar(400);
    afirmar((await pg.datos()).grupos.some(g => g.nombre === 'Alfa'), 'deshacer devuelve el grupo');
    afirmar(await pg.ev(`document.getElementById('btn-deshacer').disabled`), 'y deshacer vuelve a desactivarse');

    // (n) Listo vuelve a la barra normal y sale del modo edición.
    await pg.clic('#btn-listo');
    await pg.esperar(200);
    afirmar(!(await pg.ev(`document.querySelector('#isla .capa-barra').hidden`)), 'Listo vuelve a la barra');
    afirmar(!(await pg.ev(`document.body.classList.contains('editando')`)), 'y sale de la edición');

    // (d) A 800 px la isla va arriba del todo y cabe en la ventana.
    pg = await abrir({ ancho: 800, reducirMovimiento: true });
    await pg.esperar(400);
    isla = await pg.ev(caja('#isla'));
    afirmar(isla.top < (await pg.ev(caja('.izquierda'))).top, 'a 800 px la isla va por encima del contenido');
    afirmar(isla.left >= 0 && isla.right <= 800, `y cabe en la ventana (${JSON.stringify(isla)})`);
  },
};
