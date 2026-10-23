import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const widget = (id, tipo, panel, pos) => ({ id, tipo, panel, pos, config: {} });
const DATOS = conWidgets([widget('w-notas', 'notas', 'izq', { x: 1, y: 1, w: 6, h: 4 }), widget('w-tareas', 'tareas', 'izq', { x: 1, y: 6, w: 4, h: 39 })]);
const cabDe = id => `document.querySelector('.bloque[data-id="${id}"] .grupo-cab, .bloque[data-id="${id}"] .widget-cab')`;
const pos = (pg, id) => pg.ev(`(() => { const b = novatab.datos.grupos.find(g => g.id === '${id}') || novatab.datos.widgets.find(w => w.id === '${id}'); return { ...b.pos, panel: b.panel ?? 'der' }; })()`);
const anuncio = pg => pg.ev(`document.getElementById('anuncios').textContent`);
const enfocar = (pg, id) => pg.ev(`${cabDe(id)}.focus()`);
const foco = pg => pg.ev(`document.activeElement.closest('.bloque')?.dataset.id ?? null`);

export default {
  nombre: 'teclado: mover y redimensionar grupos y widgets con las flechas',
  async ejecutar(abrir) {
    let pg = await abrir({ datos: DATOS });
    await pg.esperar(400);

    // (g) Fuera del modo edición las cabeceras no son alcanzables; en edición sí.
    igual(await pg.ev(`${cabDe('g-alfa')}.hasAttribute('tabindex')`), false, 'sin tabindex fuera del modo edición');
    await pg.clic('#btn-editar');
    igual(await pg.ev(`[${cabDe('g-alfa')}.getAttribute('tabindex'), ${cabDe('w-notas')}.getAttribute('tabindex')]`), ['0', '0'], 'tabindex 0 en edición');
    afirmar((await pg.ev(`${cabDe('g-alfa')}.getAttribute('aria-label')`)).includes('Alfa'), 'la cabecera tiene un nombre accesible con el nombre del grupo');

    // (a) Mover con las flechas; el foco se queda en la cabecera; en el borde se anuncia que no se puede.
    await enfocar(pg, 'g-alfa');
    await pg.tecla('ArrowRight');
    await pg.esperar(300);
    igual((await pos(pg, 'g-alfa')).x, 2, 'ArrowRight mueve una columna');
    igual(await foco(pg), 'g-alfa', 'el foco sigue en el grupo tras repintar');
    afirmar((await anuncio(pg)).startsWith('Alfa: columna 2, fila 1, ancho 6'), `anuncio tras mover (es «${await anuncio(pg)}»)`);
    await pg.tecla('ArrowLeft');
    await pg.esperar(300);
    await pg.tecla('ArrowLeft');
    await pg.esperar(300);
    igual((await pos(pg, 'g-alfa')).x, 1, 'ArrowLeft en el borde no se sale');
    afirmar((await anuncio(pg)).includes('no se puede mover más a la izquierda'), 'y lo anuncia');
    await pg.tecla('ArrowUp');
    afirmar((await anuncio(pg)).includes('no se puede mover más arriba'), 'lo mismo hacia arriba en la fila 1');
    await pg.tecla('ArrowDown');
    await pg.esperar(300);
    igual((await pos(pg, 'g-alfa')).y, 2, 'ArrowDown baja una fila');
    await pg.tecla('ArrowUp');
    await pg.esperar(300);

    // (b) Mayús + flechas: ancho (grupos y widgets) y alto (widgets), dentro de sus límites.
    for (let i = 0; i < 9; i++) await pg.tecla('ArrowRight', 'shift');
    await pg.esperar(300);
    igual((await pos(pg, 'g-alfa')).w, 12, 'el ancho de un grupo no pasa de 12 columnas');
    for (let i = 0; i < 12; i++) await pg.tecla('ArrowLeft', 'shift');
    await pg.esperar(300);
    igual((await pos(pg, 'g-alfa')).w, 4, 'ni baja de su mínimo (4)');
    await enfocar(pg, 'w-notas');
    for (let i = 0; i < 3; i++) await pg.tecla('ArrowUp', 'shift');
    await pg.esperar(300);
    igual((await pos(pg, 'w-notas')).h, 3, 'el alto de un widget no baja de 3');
    await enfocar(pg, 'w-tareas');
    await pg.tecla('ArrowDown', 'shift');
    await pg.esperar(300);
    afirmar((await anuncio(pg)).includes('alto 40'), 'el anuncio de un widget incluye el alto');
    for (let i = 0; i < 2; i++) await pg.tecla('ArrowDown', 'shift');
    await pg.esperar(300);
    igual((await pos(pg, 'w-tareas')).h, 40, 'ni pasa de 40');

    // (c) Mover un grupo sobre otro aparta al otro sin solapar; un grupo plegado se mueve igual.
    pg = await abrir({ datos: DATOS });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    await enfocar(pg, 'g-alfa');
    for (let i = 0; i < 6; i++) await pg.tecla('ArrowRight');
    await pg.esperar(400);
    igual((await pos(pg, 'g-alfa')).x, 7, 'Alfa llega a la columna de Beta');
    igual(await pg.ev(`import('/js/rejilla.js').then(m => novatab.datos.grupos.filter(g => g.zona === 'local').some((a, i, l) => l.slice(i + 1).some(b => m.solapan(a, b))))`), false, 'nada se solapa');
    await pg.ev(`document.querySelector('.bloque[data-id="g-alfa"] [data-plegar]').click()`);
    await pg.esperar(300);
    await enfocar(pg, 'g-alfa');
    await pg.tecla('ArrowDown');
    await pg.esperar(300);
    afirmar((await pos(pg, 'g-alfa')).y >= 2, 'un grupo plegado también se mueve');

    // (d) Alt + ←/→ pasa un widget al otro panel, con una posición válida.
    pg = await abrir({ datos: DATOS });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    await enfocar(pg, 'w-notas');
    await pg.tecla('ArrowRight', 'alt');
    await pg.esperar(400);
    let p = await pos(pg, 'w-notas');
    igual(p.panel, 'der', 'Alt+→ pasa el widget al panel derecho');
    afirmar(p.x >= 1 && p.x + p.w - 1 <= 12, 'con una posición válida en ese panel');
    igual(await foco(pg), 'w-notas', 'y el foco lo sigue');
    await pg.tecla('ArrowLeft', 'alt');
    await pg.esperar(400);
    p = await pos(pg, 'w-notas');
    igual(p.panel, 'izq', 'Alt+← lo devuelve');
    afirmar(p.x + p.w - 1 <= 6, 'dentro de las 6 columnas del izquierdo');

    // (e) Cada pulsación es un paso de deshacer.
    pg = await abrir({ datos: DATOS });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    await enfocar(pg, 'g-alfa');
    for (let i = 0; i < 5; i++) await pg.tecla('ArrowRight');
    await pg.esperar(400);
    igual((await pos(pg, 'g-alfa')).x, 6, 'cinco pasos a la derecha');
    await pg.ev(`document.activeElement.blur()`);
    for (let i = 0; i < 5; i++) await pg.tecla('z', 'ctrl');
    await pg.esperar(500);
    igual((await pos(pg, 'g-alfa')).x, 1, 'cinco Ctrl+Z devuelven la posición original');
    await pg.tecla('y', 'ctrl');
    await pg.esperar(400);
    igual((await pos(pg, 'g-alfa')).x, 2, 'Ctrl+Y rehace un paso');

    // (f) Con el foco en un campo o en el separador, las flechas no mueven ningún bloque.
    pg = await abrir({ datos: DATOS });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    const antes = JSON.stringify(await pg.datos());
    await pg.ev(`document.querySelector('.notas-texto').focus()`);
    await pg.tecla('ArrowRight');
    await pg.tecla('ArrowDown');
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.tecla('ArrowLeft');
    await pg.ev(`document.getElementById('separador-paneles').focus()`);
    await pg.tecla('ArrowRight');
    await pg.esperar(300);
    igual(JSON.stringify(await pg.datos()), antes, 'ningún bloque se movió');

    // (h) Tras repintar el foco vuelve de inmediato: una segunda flecha seguida (repetición de tecla) no se pierde.
    pg = await abrir({ datos: DATOS });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    await enfocar(pg, 'g-alfa');
    igual(await pg.ev(`(() => { ${cabDe('g-alfa')}.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); return document.activeElement.closest('.bloque')?.dataset.id ?? null; })()`), 'g-alfa', 'el foco ya está en la cabecera justo después de repintar');
    await pg.esperar(300);

    // (i) Ctrl+Z con el foco en la cabecera no lo pierde.
    await pg.tecla('z', 'ctrl');
    await pg.esperar(500);
    igual((await pos(pg, 'g-alfa')).x, 1, 'Ctrl+Z deshace el paso');
    igual(await foco(pg), 'g-alfa', 'y el foco sigue en la cabecera');

    // (j) Con la ventana estrecha (rejilla apilada) el teclado no cambia posiciones ni tamaños a ciegas.
    pg = await abrir({ ancho: 800, alto: 800, datos: DATOS });
    await pg.esperar(400);
    await pg.clic('#btn-editar');
    await enfocar(pg, 'g-alfa');
    await pg.tecla('ArrowRight', 'shift');
    await pg.tecla('ArrowRight');
    await pg.esperar(300);
    igual(await pos(pg, 'g-alfa'), { x: 1, y: 1, w: 6, panel: 'der' }, 'a 800 px nada cambia');

    // (k) La flecha del botón de perfil es decoración: no entra en su nombre accesible.
    afirmar((await pg.ev(`getComputedStyle(document.getElementById('btn-perfil'), '::after').content`)).includes('/ ""'), 'la flecha del selector de perfiles tiene texto alternativo vacío');
  },
};
