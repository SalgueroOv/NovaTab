import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });
const DOS_PERFILES = (activo = 'principal') => ({
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'otro', nombre: 'Otro' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA),
  'chrome.sync/perfil:otro:datos': { ...estructura(DATOS_PRUEBA), grupos: [] },
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/grupo:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/perfil:principal:aspecto': { tema: 'papel', apariencia: { acento: '#e0245e' }, sobrio: true },
  'chrome.sync/perfil:otro:aspecto': { tema: 'noche', apariencia: { acento: '#00aa66', densidad: 'compacta' }, ocultos: { izq: true, der: false }, anchoIzq: 30 },
  'chrome.sync/opciones': { buscador: { motor: 'duckduckgo' } },
  'chrome.local/perfil-activo': activo,
});
const aspectoDe = (pg, id) => pg.ev(`JSON.parse(localStorage.getItem('chrome.sync/perfil:${id}:aspecto'))`);
const acento = `getComputedStyle(document.documentElement).getPropertyValue('--acento').trim()`;

export default {
  nombre: 'perfiles: el aspecto es de cada perfil y lo común (buscador) es de todos',
  async ejecutar(abrir) {
    // (a) Cambiar tema, acento, fondo, densidad y paneles escribe en el aspecto del perfil; el motor, en «opciones».
    let pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES() });
    await pg.esperar(600);
    await pg.ev(`__chromeFalso.escritas()`);
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('.muestra[data-tema="rosa"]').click()`);
    await pg.esperar(300);
    igual((await pg.ev(`__chromeFalso.escritas()`)).filter(k => k === 'tema' || k === 'datos'), [], 'el tema ya no se escribe en la clave antigua');
    igual((await aspectoDe(pg, 'principal')).tema, 'rosa', 'tema en el aspecto del perfil');
    igual((await aspectoDe(pg, 'principal')).apariencia.acento, '#e0245e', 'y lo demás del aspecto se conserva');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="buscador"]').click()`);
    await pg.ev(`(() => { const e = document.getElementById('motor-buscador'); e.value = 'bing'; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await pg.esperar(450);
    igual(await pg.ev(`JSON.parse(localStorage.getItem('chrome.sync/opciones')).buscador.motor`), 'bing', 'el motor va en «opciones»');
    afirmar(!('buscador' in await aspectoDe(pg, 'principal')), 'y no en el aspecto del perfil');
    igual((await aspectoDe(pg, 'otro')).tema, 'noche', 'el aspecto del otro perfil no se toca');

    // (b) Cada perfil activo muestra su aspecto, con el buscador común.
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES('principal') });
    await pg.esperar(600);
    igual(await pg.ev(`[document.documentElement.dataset.tema, ${acento}, document.body.classList.contains('sobrio')]`), ['papel', '#e0245e', true], 'aspecto de principal');
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES('otro') });
    await pg.esperar(600);
    igual(await pg.ev(`[document.documentElement.dataset.tema, ${acento}, document.body.classList.contains('compacta'), document.body.classList.contains('sin-izq'), document.body.classList.contains('sobrio')]`), ['noche', '#00aa66', true, true, false], 'aspecto de otro');
    igual(await pg.ev(`document.documentElement.style.getPropertyValue('--ancho-izq')`), '30%', 'el ancho del separador también es del perfil');

    // (c) Un cambio remoto del aspecto del perfil activo se aplica; el de otro perfil no.
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES('principal') });
    await pg.esperar(600);
    await pg.ev(`__chromeFalso.remoto('sync', 'perfil:otro:aspecto', { tema: 'carbon' })`);
    await pg.esperar(300);
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'papel', 'el cambio de otro perfil no cambia esta página');
    await pg.ev(`__chromeFalso.remoto('sync', 'perfil:principal:aspecto', { tema: 'menta', apariencia: { acento: '#112233' } })`);
    await pg.esperar(300);
    igual(await pg.ev(`[document.documentElement.dataset.tema, ${acento}]`), ['menta', '#112233'], 'el cambio del perfil activo sí');
    // Y un cambio común (el motor) también llega.
    await pg.ev(`__chromeFalso.remoto('sync', 'opciones', { buscador: { motor: 'bing' } })`);
    await pg.esperar(300);
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('hola');
    igual(await pg.ev(`document.querySelector('#sugerencias .sugerencia .s-etiqueta').textContent`), 'Bing', 'el buscador común llega a todos');

    // (d) Modo sobrio, fondo de grupos y paneles ocultos se guardan en el perfil.
    pg = await abrir({ chrome: {}, datos: null, guardados: DOS_PERFILES('otro') });
    await pg.esperar(600);
    await pg.clic('#btn-tema');
    await pg.clic('#opt-sobrio');
    await pg.clic('#opt-fondo-grupos');
    await pg.esperar(300);
    const o = await aspectoDe(pg, 'otro');
    igual([o.sobrio, o.fondoGrupos, o.ocultos.izq], [true, false, true], 'sobrio, fondo de grupos y ocultos en el aspecto de «otro»');
    igual((await aspectoDe(pg, 'principal')).sobrio, true, 'y el de principal sigue como estaba');
  },
};
