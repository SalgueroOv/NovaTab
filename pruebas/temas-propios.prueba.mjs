import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });
const DOS_PERFILES = (extra = {}) => ({
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'otro', nombre: 'Otro' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA),
  'chrome.sync/perfil:otro:datos': { ...estructura(DATOS_PRUEBA), grupos: [] },
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/perfil:principal:aspecto': { tema: 'bosque' },
  'chrome.sync/perfil:otro:aspecto': { tema: 'noche' },
  'chrome.local/perfil-activo': 'principal',
  ...extra,
});
const guardados = pg => pg.ev(`JSON.parse(localStorage.getItem('chrome.sync/temas-propios'))`);
const aspectoDe = (pg, id) => pg.ev(`JSON.parse(localStorage.getItem('chrome.sync/perfil:${id}:aspecto'))`);
const colores = `(() => { const e = getComputedStyle(document.documentElement); return [e.getPropertyValue('--bg').trim(), e.getPropertyValue('--acento').trim(), document.documentElement.dataset.modo]; })()`;
const propias = `[...document.querySelectorAll('#muestras .muestra')].map(m => m.dataset.tema).filter(id => id.startsWith('propio-'))`;
// Rellena un campo del diálogo de tema como lo haría el usuario (cada cambio pinta la vista previa).
const campo = (nombre, valor) => `(() => { const c = document.querySelector('#dlg-tema form').elements['${nombre}']; c.value = '${valor}'; c.dispatchEvent(new Event('input', { bubbles: true })); })()`;
const cambiarA = id => `import('/js/perfiles-ops.js').then(m => m.cambiarPerfil('${id}'))`;
const TEMA = (id, nombre, bg, acento) => ({ id, nombre, bg, acento });

export default {
  nombre: 'temas propios: crear, editar con vista previa, borrar, comunes a los perfiles y a salvo de datos raros',
  async ejecutar(abrir) {
    // (a) Crear «Arena»: se aplica, se marca y se guarda en la clave común.
    let pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES(), reducirMovimiento: true });
    await pg.esperar(500);
    await pg.clic('#btn-tema');
    await pg.clic('.crear-tema');
    afirmar(await pg.ev(`document.getElementById('dlg-tema').open`), 'el editor de temas se abre');
    await pg.ev(campo('nombre', 'Arena'));
    await pg.ev(campo('bg', '#2b2a26'));
    await pg.ev(campo('acento', '#e8c547'));
    await pg.clic('#dlg-tema [value="ok"]');
    await pg.esperar(300);
    const ids = await pg.ev(propias);
    igual(ids.length, 1, 'una muestra propia');
    afirmar(/^propio-[a-z0-9]{4,12}$/.test(ids[0]), 'con un id de tema propio');
    const arena = ids[0];
    igual(await pg.ev(colores), ['rgb(43, 42, 38)', '#e8c547', 'oscuro'], 'el tema nuevo se aplica');
    igual(await pg.ev(`getComputedStyle(document.documentElement).getPropertyValue('--sobre-acento').trim()`), '#1f1f1f', 'texto oscuro sobre un acento claro');
    igual(await guardados(pg), [TEMA(arena, 'Arena', '#2b2a26', '#e8c547')], 'guardado en temas-propios');
    igual((await aspectoDe(pg, 'principal')).tema, arena, 'y elegido en el perfil');

    // (b) Tras recargar sigue aplicado y su muestra está marcada.
    await pg.recargar();
    await pg.esperar(500);
    igual(await pg.ev(colores), ['rgb(43, 42, 38)', '#e8c547', 'oscuro'], 'tema propio tras recargar');
    igual(await pg.ev(`document.querySelector('.muestra[data-tema="${arena}"]').getAttribute('aria-pressed')`), 'true', 'muestra propia marcada');

    // (c) Editar con vista previa y cancelar: todo vuelve a como estaba.
    await pg.clic('#btn-tema');
    await pg.clic(`.muestra-propia:has([data-tema="${arena}"]) .editar-tema`);
    await pg.ev(campo('bg', '#f4f1ea'));
    igual(await pg.ev(`document.documentElement.dataset.modo`), 'claro', 'vista previa en vivo');
    await pg.clic('#dlg-tema [data-cerrar]');
    await pg.esperar(200);
    igual(await pg.ev(colores), ['rgb(43, 42, 38)', '#e8c547', 'oscuro'], 'cancelar devuelve el tema de antes');
    igual(await guardados(pg), [TEMA(arena, 'Arena', '#2b2a26', '#e8c547')], 'cancelar no guarda nada');

    // (d) El otro perfil ve el tema y puede elegirlo.
    await pg.ev(cambiarA('otro'));
    await pg.esperar(500);
    igual(await pg.ev(propias), [arena], 'el otro perfil ve el tema propio');
    await pg.ev(`document.querySelector('.muestra[data-tema="${arena}"]').click()`);
    await pg.esperar(300);
    igual((await aspectoDe(pg, 'otro')).tema, arena, 'el otro perfil lo elige');

    // (e) Borrar el tema en uso: este perfil pasa a Bosque; el otro guarda su elección y se ve en Bosque.
    await pg.ev(cambiarA('principal'));
    await pg.esperar(500);
    await pg.ev(`window.confirm = () => true`);
    await pg.clic('#btn-tema');
    await pg.clic(`.muestra-propia:has([data-tema="${arena}"]) .editar-tema`);
    await pg.clic('#borrar-tema');
    await pg.esperar(300);
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'bosque', 'el perfil activo pasa a Bosque');
    igual(await guardados(pg), [], 'la lista queda vacía');
    igual((await aspectoDe(pg, 'otro')).tema, arena, 'el aspecto del otro perfil no se reescribe');
    await pg.ev(cambiarA('otro'));
    await pg.esperar(500);
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'bosque', 'y al abrirlo se ve Bosque');
    igual((await aspectoDe(pg, 'otro')).tema, arena, 'sin reescribirlo al abrirlo');

    // (f) Datos raros en temas-propios: la página abre y solo queda lo válido.
    for (const raro of ['hola', [
      TEMA('propio-bueno1', 'Bueno', '#203040', '#ffcc00'),
      TEMA('propio-malo01', 'Malo', 'rojo', '#ffcc00'),
      TEMA('propio-bueno1', 'Repetido', '#101010', '#00ffcc'),
      TEMA('propio-vacio1', '   ', '#101010', '#00ffcc'),
      TEMA('propio-largo1', 'x'.repeat(500), '#101010', '#00ffcc'),
    ]]) {
      pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES({ 'chrome.sync/temas-propios': raro }), reducirMovimiento: true });
      await pg.esperar(500);
      igual(pg.errores, [], 'sin errores con datos raros');
      igual(await pg.ev(propias), raro === 'hola' ? [] : ['propio-bueno1'], 'solo los temas válidos');
    }

    // (g) Con doce temas no se pueden crear más.
    const doce = Array.from({ length: 12 }, (_, i) => TEMA(`propio-doce${String(i).padStart(2, '0')}`, `T${i}`, '#202020', '#ffaa00'));
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES({ 'chrome.sync/temas-propios': doce }), reducirMovimiento: true });
    await pg.esperar(500);
    igual((await pg.ev(propias)).length, 12, 'doce temas propios');
    afirmar(await pg.ev(`document.querySelector('.crear-tema').disabled`), 'crear tema desactivado con doce');

    // (h) Un tema creado en otra pestaña aparece sin recargar.
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES(), reducirMovimiento: true });
    await pg.esperar(500);
    await pg.ev(`__chromeFalso.remoto('sync', 'temas-propios', [${JSON.stringify(TEMA('propio-fuera1', 'De fuera', '#304050', '#ff8800'))}])`);
    await pg.esperar(300);
    igual(await pg.ev(propias), ['propio-fuera1'], 'el tema de otra pestaña aparece');
  },
};
