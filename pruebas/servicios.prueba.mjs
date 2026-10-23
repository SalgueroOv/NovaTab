import { afirmar, igual } from './lib/util.mjs';
import { conWidgets, DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const modulo = `import('/js/widgets/servicios.js')`;
const WIDGET = (extra = {}) => ({ id: 'w-serv', tipo: 'servicios', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 10 }, config: { grupos: null }, ...extra });
const datosCon = (extra, config) => conWidgets([WIDGET({ ...extra, ...(config ? { config } : {}) })]);
// Los orígenes de DATOS_PRUEBA: Alfa (4), Beta (3) y Gamma (2, privado).
const ORIGENES = ['http://192.168.1.11', 'http://192.168.1.12:9000', 'http://192.168.1.13:8096', 'http://192.168.1.14:3000', 'http://192.168.1.1', 'https://192.168.1.30:5001', 'http://192.168.1.2', 'http://192.168.1.40', 'http://192.168.1.41'];
const todos = estado => Object.fromEntries(ORIGENES.map(o => [o, estado]));
const leds = pg => pg.ev(`[...document.querySelectorAll('.widget-servicios .servicio')].map(s => [s.querySelector('.nombre').textContent, s.querySelector('.led').dataset.estado])`);
const resumen = pg => pg.ev(`document.querySelector('.widget-servicios .servicios-resumen')?.textContent ?? ''`);
const sondeos = pg => pg.ev(`window.__sondeos.length`);
const cada = (pg, ms) => pg.p.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__cadaServicios = ${ms}` });

export default {
  nombre: 'servicios: orígenes, sondeo, LEDs, permiso y ciclo del widget',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) origenesVigilados y patronesDe.
    const orig = (config, datos = 'novatab.datos') => pg.ev(`${modulo}.then(m => m.origenesVigilados(${JSON.stringify(config)}, ${datos}).map(o => o.origen))`);
    igual(await orig({ grupos: null }), ORIGENES, 'todos los grupos locales: nueve orígenes');
    igual((await orig({ grupos: ['g-alfa'] })).length, 4, 'solo Alfa');
    const muchos = { grupos: [{ id: 'g', nombre: 'Muchos', zona: 'local', privado: false, enlaces: Array.from({ length: 60 }, (_, i) => ({ id: `e${i}`, nombre: `S${i}`, url: `http://10.0.${i}.1/` })) }] };
    igual((await orig({ grupos: null }, JSON.stringify(muchos))).length, 40, 'como mucho 40 orígenes');
    igual(await pg.ev(`${modulo}.then(m => m.patronesDe(['http://192.168.1.11', 'http://192.168.1.11:8080', 'https://192.168.1.11', 'http://192.168.1.12']))`), ['http://192.168.1.11/*', 'https://192.168.1.11/*', 'http://192.168.1.12/*'], 'patrones sin repetir hosts');

    // (b) sondear: vivo, caído, desconocido y tiempo agotado.
    const SERV = { 'http://vivo.test': 'vivo', 'http://cae.test': 'cae', 'https://cert.test': 'cert', 'http://cuelga.test': 'cuelga' };
    pg = await abrir({ chrome: {}, servicios: SERV });
    await pg.esperar(300);
    const s = (origen, espera = 300) => pg.ev(`${modulo}.then(m => m.sondear('${origen}', { espera: ${espera} }))`);
    igual([await s('http://vivo.test'), await s('http://cae.test'), await s('https://cert.test'), await s('http://cuelga.test')], ['vivo', 'caido', 'desconocido', 'caido'], 'estados de sondear');

    // (c) Como mucho 6 a la vez.
    const veinte = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`http://l${i}.test`, 'lento']));
    pg = await abrir({ chrome: {}, servicios: veinte });
    await pg.esperar(300);
    const res = await pg.ev(`${modulo}.then(m => m.sondearTodos(${JSON.stringify(Object.keys(veinte))}))`);
    igual(Object.keys(res).length, 20, 'veinte resultados');
    igual(await pg.ev(`window.__maxVuelo`), 6, 'como mucho 6 sondeos a la vez');

    // (d) El widget: LEDs, resumen, título del ámbar y «Comprobar ahora».
    const mezcla = { ...todos('vivo'), 'http://192.168.1.12:9000': 'cae', 'https://192.168.1.30:5001': 'cert' };
    pg = await abrir({ chrome: {}, datos: datosCon(), servicios: mezcla });
    await pg.esperar(700);
    const l = await leds(pg);
    igual(l.length, 9, 'un LED por servicio');
    igual(l.find(x => x[0] === 'Portainer Alfa')[1], 'caido', 'caído');
    igual(l.find(x => x[0] === 'NAS Beta')[1], 'desconocido', 'sin verificar');
    igual(l.find(x => x[0] === 'Proxmox Alfa')[1], 'vivo', 'vivo');
    afirmar(/^7 de 9 responden · comprobado \d\d:\d\d$/.test(await resumen(pg)), `resumen (es «${await resumen(pg)}»)`);
    afirmar((await pg.ev(`document.querySelector('.widget-servicios .led[data-estado="desconocido"]').title`)).includes('Sin verificar'), 'título del LED ámbar');
    const antes = await sondeos(pg);
    await pg.ev(`document.querySelector('.widget-servicios .servicios-comprobar').click()`);
    await pg.esperar(600);
    afirmar(await sondeos(pg) >= antes + 9, 'Comprobar ahora repite los sondeos');

    // (e) Sin permiso no hay sondeos y se ofrece pedirlo.
    for (const permiso of ['denegado', 'pendiente']) {
      pg = await abrir({ chrome: {}, datos: datosCon(), servicios: todos('vivo'), permisoServicios: permiso });
      await pg.esperar(700);
      igual(await sondeos(pg), 0, `sin sondeos con el permiso ${permiso}`);
      afirmar((await pg.ev(`document.querySelector('.widget-servicios').textContent`)).includes('Falta el permiso'), 'lo dice');
    }
    await pg.ev(`document.querySelector('.widget-servicios .servicios-permiso').click()`);
    await pg.esperar(800);
    afirmar(await sondeos(pg) >= 9, 'al dar el permiso empiezan los sondeos');

    // (f) Pestaña oculta y widget plegado: sin sondeos; al volver a verse, comprueba.
    pg = await abrir({ chrome: {}, datos: datosCon(), servicios: todos('vivo') });
    await cada(pg, 400);
    await pg.recargar();
    await pg.esperar(900);
    const n0 = await sondeos(pg);
    afirmar(n0 >= 9, 'comprueba al abrir');
    await pg.esperar(1600);
    afirmar(await sondeos(pg) > n0, 'y repite cada intervalo mientras está visible');
    await pg.ev(`Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'))`);
    await pg.esperar(500);
    const n1 = await sondeos(pg);
    await pg.esperar(1600);
    igual(await sondeos(pg), n1, 'con la pestaña oculta no hay sondeos nuevos');
    await pg.ev(`Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'))`);
    await pg.esperar(1600);
    afirmar(await sondeos(pg) > n1, 'al volver a verse comprueba');
    pg = await abrir({ chrome: {}, datos: datosCon({ plegado: true }), servicios: todos('vivo') });
    await cada(pg, 400);
    await pg.recargar();
    await pg.esperar(1800);
    igual(await sondeos(pg), 0, 'plegado no sondea');

    // (g) Borrar el widget detiene los sondeos; en modo reunión no se vigilan los grupos privados.
    pg = await abrir({ chrome: {}, datos: datosCon(), servicios: todos('vivo') });
    await cada(pg, 400);
    await pg.recargar();
    await pg.esperar(900);
    await pg.ev(`window.confirm = () => true`);
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('.widget-servicios [data-accion-widget="borrar"]').click()`);
    await pg.esperar(500);
    const n2 = await sondeos(pg);
    await pg.esperar(1500);
    igual(await sondeos(pg), n2, 'borrado el widget no hay más sondeos');
    pg = await abrir({ chrome: {}, datos: datosCon(), servicios: todos('vivo'), guardados: { 'chrome.sync/opciones': { reunion: true } } });
    await pg.esperar(800);
    igual((await leds(pg)).length, 7, 'en modo reunión, siete servicios (sin los privados)');
    afirmar(!(await pg.ev(`window.__sondeos`)).some(o => o.endsWith('.40') || o.endsWith('.41')), 'no se sondean los privados');

    // (h) Añadir (con permiso), configurar (desmarcar un grupo), recargar y borrar.
    pg = await abrir({ chrome: {}, servicios: todos('vivo'), permisoServicios: 'pendiente' });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-nuevo-widget');
    await pg.esperar(200);
    await pg.ev(`[...document.querySelectorAll('#dlg-widget .tipo-widget')].find(b => b.textContent.startsWith('Estado de servicios')).click()`);
    await pg.esperar(300);
    const casillas = `[...document.querySelectorAll('#dlg-widget input[type="checkbox"]')]`;
    igual(await pg.ev(`${casillas}.map(c => c.checked)`), [true, true, true], 'los tres grupos locales marcados');
    await pg.ev(`${casillas}.find(c => c.value === 'g-gamma').click()`);
    await pg.clic('#dlg-widget button[value="ok"]');
    await pg.esperar(900);
    igual(await pg.ev(`window.__permisos`), 1, 'se pide el permiso al guardar');
    igual(await pg.ev(`novatab.datos.widgets[0].config.grupos`), ['g-alfa', 'g-beta'], 'grupos elegidos');
    igual((await leds(pg)).length, 7, 'siete servicios vigilados');
    await pg.recargar();
    await pg.esperar(900);
    igual(await pg.ev(`novatab.datos.widgets[0].config.grupos`), ['g-alfa', 'g-beta'], 'la configuración sobrevive a recargar');
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('.widget-servicios [data-accion-widget="configurar"]').click()`);
    await pg.esperar(300);
    await pg.ev(`${casillas}.find(c => c.value === 'g-beta').click()`);
    await pg.clic('#dlg-widget button[value="ok"]');
    await pg.esperar(900);
    igual((await leds(pg)).length, 4, 'configurar cambia los grupos');
    await pg.ev(`window.confirm = () => true`);
    await pg.ev(`document.querySelector('.widget-servicios [data-accion-widget="borrar"]').click()`);
    await pg.esperar(300);
    igual(await pg.ev(`document.querySelectorAll('.widget-servicios').length`), 0, 'borrado');
  },
};
