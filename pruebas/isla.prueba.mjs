import { afirmar, igual } from './lib/util.mjs';

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

    // (d) A 800 px la isla va arriba del todo y cabe en la ventana.
    pg = await abrir({ ancho: 800, reducirMovimiento: true });
    await pg.esperar(400);
    isla = await pg.ev(caja('#isla'));
    afirmar(isla.top < (await pg.ev(caja('.izquierda'))).top, 'a 800 px la isla va por encima del contenido');
    afirmar(isla.left >= 0 && isla.right <= 800, `y cabe en la ventana (${JSON.stringify(isla)})`);
  },
};
