import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const modulo = `import('/js/widgets/cuenta-atras.js')`;
// «AAAA-MM-DDThh:mm» en hora local (como un <input type="datetime-local">).
const local = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const enMin = min => local(new Date(Date.now() + min * 60000 + 30000));
const conCuenta = config => conWidgets([{ id: 'w-cuenta', tipo: 'cuentaAtras', panel: 'izq', pos: { x: 1, y: 1, w: 4, h: 4 }, config }]);
const texto = pg => pg.ev(`document.querySelector('.widget-cuentaAtras .cuenta-atras .tiempo')?.textContent ?? null`);
const nombre = pg => pg.ev(`document.querySelector('.widget-cuentaAtras .cuenta-atras .nombre')?.textContent ?? null`);

export default {
  nombre: 'cuenta atrás: cálculo, formato y ciclo completo',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) restante.
    const r = (fecha, ahora) => pg.ev(`${modulo}.then(m => m.restante(${JSON.stringify(fecha)}, ${ahora}))`);
    igual(await r('2026-12-15T08:00', 'new Date(2026, 11, 3, 3, 57)'), { hecho: false, dias: 12, horas: 4, minutos: 3, segundos: 0 }, 'restante normal');
    const casi = await r('2026-12-15T08:00', 'new Date(2026, 11, 15, 7, 59, 59)');
    igual([casi.hecho, casi.minutos, casi.segundos], [false, 0, 1], 'a un segundo del final');
    igual((await r('2026-12-15T08:00', 'new Date(2026, 11, 15, 8, 0, 0)')).hecho, true, 'en el instante exacto');
    igual((await r('2026-12-15T08:00', 'new Date(2027, 0, 1)')).hecho, true, 'después');
    for (const mala of ['basura', '', '2026-13-45T99:99']) igual(await r(mala, 'new Date()'), null, `fecha «${mala}» no válida`);
    igual(await pg.ev(`${modulo}.then(m => m.restante(undefined, new Date()))`), null, 'sin fecha');

    // (b) El widget: días, horas y minutos; a menos de una hora, con segundos; pasada, «Hecho».
    pg = await abrir({ datos: conCuenta({ nombre: 'Vacaciones', fecha: enMin(2 * 1440 + 3 * 60 + 5) }) });
    await pg.esperar(400);
    afirmar(/^2 d 3 h 0[45] min$/.test(await texto(pg)), `días, horas y minutos (es «${await texto(pg)}»)`);
    pg = await abrir({ datos: conCuenta({ nombre: 'Casi', fecha: enMin(30) }) });
    await pg.esperar(400);
    const antes = await texto(pg);
    afirmar(/^\d+ min \d+ s$/.test(antes), `a menos de una hora, con segundos (es «${antes}»)`);
    await pg.esperar(2200);
    afirmar((await texto(pg)) !== antes, 'cambia cada segundo');
    pg = await abrir({ datos: conCuenta({ nombre: 'Pasada', fecha: enMin(-60) }) });
    await pg.esperar(400);
    igual(await texto(pg), 'Hecho', 'una fecha pasada muestra Hecho');

    // (c) El nombre es texto y se recorta a 40.
    pg = await abrir({ datos: conCuenta({ nombre: '<b>x</b> & ' + 'n'.repeat(80), fecha: enMin(500) }) });
    await pg.esperar(400);
    const n = await nombre(pg);
    igual(n.length, 40, 'nombre recortado a 40');
    afirmar(n.startsWith('<b>x</b> &'), 'el HTML sale como texto');
    igual(await pg.ev(`document.querySelectorAll('.widget-cuentaAtras b').length`), 0, 'ningún elemento HTML');

    // (d) Ciclo: añadir, configurar, recargar y borrar; datos con basura no rompen nada.
    pg = await abrir();
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-nuevo-widget');
    await pg.esperar(200);
    await pg.ev(`[...document.querySelectorAll('#dlg-widget .tipo-widget')].find(b => b.textContent.startsWith('Cuenta atrás')).click()`);
    await pg.esperar(300);
    await pg.clic('#dlg-widget button[value="ok"]');
    afirmar(await pg.ev(`document.getElementById('dlg-widget').open`), 'sin fecha no se guarda');
    await pg.ev(`document.querySelector('#dlg-widget input[type="text"]').value = 'Examen'`);
    await pg.ev(`document.querySelector('#dlg-widget input[type="datetime-local"]').value = ${JSON.stringify(enMin(3 * 1440))}`);
    await pg.clic('#dlg-widget button[value="ok"]');
    await pg.esperar(400);
    igual(await nombre(pg), 'Examen', 'nombre del widget');
    afirmar(/^2 d 2[34] h \d\d min$/.test(await texto(pg)) || /^3 d 0 h 0\d min$/.test(await texto(pg)) || /^2 d \d+ h \d\d min$/.test(await texto(pg)), `tiempo pintado (es «${await texto(pg)}»)`);
    await pg.recargar();
    await pg.esperar(400);
    igual(await nombre(pg), 'Examen', 'tras recargar');
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('.widget-cuentaAtras [data-accion-widget="configurar"]').click()`);
    await pg.esperar(300);
    await pg.ev(`document.querySelector('#dlg-widget input[type="text"]').value = 'Viaje'`);
    await pg.clic('#dlg-widget button[value="ok"]');
    await pg.esperar(400);
    igual(await nombre(pg), 'Viaje', 'configurar cambia el nombre');
    await pg.ev(`window.confirm = () => true`);
    await pg.ev(`document.querySelector('.widget-cuentaAtras [data-accion-widget="borrar"]').click()`);
    await pg.esperar(300);
    igual(await pg.ev(`document.querySelectorAll('.widget-cuentaAtras').length`), 0, 'borrado');
    pg = await abrir({ datos: conCuenta({ fecha: 5 }) });
    await pg.esperar(400);
    afirmar((await pg.ev(`document.querySelector('.widget-cuentaAtras .widget-vacio')?.textContent ?? ''`)).includes('Elige una fecha y hora'), 'una fecha con basura muestra el aviso de configurar');
  },
};
