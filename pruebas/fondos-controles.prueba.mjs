import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const IDS = ['curvas', 'cotas', 'sombreado', 'crestas', 'grafo', 'rayas', 'rombos', 'trama', 'galaxia'];
const opcionesGuardadas = `JSON.parse(localStorage.getItem('perfil:principal:aspecto'))`;
const huellaDe = sel => `(() => { const c = document.querySelector('${sel}'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; })()`;
// Píxeles de un canvas distintos del primero: una miniatura con dibujo no es un color liso.
const distintos = sel => `(() => { const c = document.querySelector('${sel}'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 4; i < d.length; i += 4) if (d[i] !== d[0] || d[i + 1] !== d[1] || d[i + 2] !== d[2]) n++; return n; })()`;
const poner = (id, valor) => `(() => { const e = document.getElementById('${id}'); e.value = '${valor}'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`;
const dibujosEn = ms => `(async () => { const d0 = novatab.terreno.dibujos; await new Promise(r => setTimeout(r, ${ms})); return novatab.terreno.dibujos - d0; })()`;
const abrirFondo = async pg => {
  await pg.clic('#btn-tema');
  await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
  await pg.esperar(150);
};
const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const estructura = d => ({ ...structuredClone(d), version: 4, grupos: d.grupos.map(({ enlaces, ...g }) => g) });

export default {
  nombre: 'fondos: miniaturas, densidad, relieve, movimiento, luz y otro terreno en Personalizar',
  async ejecutar(abrir) {
    let pg = await abrir({ reducirMovimiento: true });
    await pg.esperar(400);
    await abrirFondo(pg);

    // (a) Las nueve muestras dibujadas llevan su miniatura con dibujo.
    for (const id of IDS) afirmar(await pg.ev(distintos(`[data-fondo="${id}"] canvas.mini-fondo`)) > 50, `miniatura de ${id} con dibujo`);
    igual(await pg.ev(`[...document.querySelectorAll('[data-fondo="liso"] canvas, [data-fondo="imagen"] canvas')].length`), 0, 'liso e imagen sin miniatura dibujada');

    // (b) Densidad, relieve, movimiento y luz se guardan en el aspecto y llegan al motor.
    await pg.ev(poner('densidad-fondo', 20));
    await pg.ev(poner('relieve', 80));
    await pg.esperar(450);
    let ap = (await pg.ev(opcionesGuardadas)).apariencia;
    igual([ap.densidadFondo, ap.relieve], [0.2, 0.8], 'densidad y relieve guardados');
    igual(await pg.ev(`[novatab.terreno.op.densidad, novatab.terreno.op.relieve]`), [0.2, 0.8], 'y aplicados al fondo');
    await pg.clic('[data-movimiento="vivo"]');
    igual((await pg.ev(opcionesGuardadas)).apariencia.movimiento, 'vivo', 'movimiento guardado');
    igual(await pg.ev(`document.querySelector('[data-movimiento="vivo"]').getAttribute('aria-pressed')`), 'true', 'movimiento marcado');
    igual(await pg.ev(`novatab.terreno.op.movimiento`), 'vivo', 'movimiento aplicado');
    await pg.ev(`(() => { const c = document.getElementById('opt-brillo'); c.checked = false; c.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    igual((await pg.ev(opcionesGuardadas)).apariencia.brillo, false, 'luz guardada');
    igual(await pg.ev(`novatab.terreno.op.brillo`), false, 'luz aplicada');

    // (c) Otro terreno: semilla nueva del perfil, y cambian el fondo y las miniaturas.
    const fondoAntes = await pg.ev(huellaDe('#terreno'));
    const miniAntes = await pg.ev(huellaDe('[data-fondo="curvas"] canvas'));
    await pg.clic('#otro-terreno');
    await pg.esperar(300);
    afirmar(/^principal-[a-z0-9]{5}$/.test((await pg.ev(opcionesGuardadas)).apariencia.semilla), 'semilla nueva del perfil');
    afirmar(await pg.ev(huellaDe('#terreno')) !== fondoAntes, 'otro relieve en el fondo');
    afirmar(await pg.ev(huellaDe('[data-fondo="curvas"] canvas')) !== miniAntes, 'y en las miniaturas');

    // (d) Con «liso» no hay ajustes del terreno.
    await pg.clic('[data-fondo="liso"]');
    afirmar(await pg.ev(`document.getElementById('ajustes-terreno').hidden`), 'liso oculta los ajustes del terreno');
    await pg.clic('[data-fondo="curvas"]');
    afirmar(!(await pg.ev(`document.getElementById('ajustes-terreno').hidden`)), 'un dibujo los muestra');

    // (d) Con una imagen elegida: la nota se ve, no hay ajustes del terreno y el fondo no se dibuja.
    pg = await abrir({ guardados: { 'fondo-imagen': 'data:image/webp;base64,AAAA', 'perfil:principal:aspecto': { apariencia: { fondo: 'imagen', movimiento: 'vivo' } } } });
    await pg.esperar(500);
    await abrirFondo(pg);
    afirmar(!(await pg.ev(`document.getElementById('nota-imagen').hidden`)), 'la nota de la imagen se ve');
    afirmar(await pg.ev(`document.getElementById('ajustes-terreno').hidden`), 'sin ajustes del terreno con imagen');
    igual(await pg.ev(dibujosEn(1000)), 0, 'con imagen el fondo no se dibuja');

    // (e) Cada perfil tiene su relieve: la semilla por defecto es su id.
    const perfiles = {
      'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'otro', nombre: 'Otro' }] },
      'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA),
      'chrome.sync/perfil:otro:datos': { ...estructura(DATOS_PRUEBA), grupos: [] },
      ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
      'chrome.sync/perfil:principal:aspecto': { tema: 'bosque', apariencia: { fondo: 'curvas', movimiento: 'quieto' } },
      'chrome.sync/perfil:otro:aspecto': { tema: 'bosque', apariencia: { fondo: 'curvas', movimiento: 'quieto' } },
      'chrome.local/perfil-activo': 'principal',
    };
    pg = await abrir({ chrome: {}, datos: null, guardados: perfiles, reducirMovimiento: true });
    await pg.esperar(500);
    const dePrincipal = await pg.ev(huellaDe('#terreno'));
    await pg.ev(`import('/js/perfiles-ops.js').then(m => m.cambiarPerfil('otro'))`);
    await pg.esperar(500);
    afirmar(await pg.ev(huellaDe('#terreno')) !== dePrincipal, 'cada perfil con su relieve');
  },
};
