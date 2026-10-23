import { afirmar, igual } from './lib/util.mjs';

const modulo = `import('/js/apariencia.js')`;
const acentoActual = `getComputedStyle(document.documentElement).getPropertyValue('--acento').trim()`;
const opcionesGuardadas = `JSON.parse(localStorage.getItem('opciones'))`;
const poner = (id, valor) => `(() => { const e = document.getElementById('${id}'); e.value = '${valor}'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`;

const DEFECTO = {
  acento: null, fondo: 'curvas', intensidad: 100, intensidadImagen: 40, densidad: 'comoda',
  esquinas: 'medio', hora24: true, segundos: false, fecha: true,
};

export default {
  nombre: 'apariencia: ajustes con valores seguros, pestañas y acento libre',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) Normalizar: lo inválido vuelve a su valor por defecto, uno a uno.
    for (const malo of [undefined, null, 'x', 7]) {
      igual(await pg.ev(`${modulo}.then(m => m.normalizarApariencia(${malo === undefined ? 'undefined' : JSON.stringify(malo)}))`), DEFECTO, `normalizar(${malo})`);
    }
    igual(await pg.ev(`${modulo}.then(m => m.normalizarApariencia({ acento: 'rojo', fondo: 'nada', intensidad: 500, densidad: 'x', esquinas: 3, hora24: 'sí' }))`),
      DEFECTO, 'normalizar con basura');
    igual(await pg.ev(`${modulo}.then(m => m.normalizarApariencia({ acento: '#E0245E', fondo: 'rayas', intensidad: 30, segundos: true, esquinas: 'recto' }))`),
      { ...DEFECTO, acento: '#e0245e', fondo: 'rayas', intensidad: 30, segundos: true, esquinas: 'recto' }, 'normalizar conserva lo válido');

    // (b) Opciones de antes de esta fase: la página arranca igual.
    pg = await abrir({ guardados: { opciones: { sobrio: true } } });
    await pg.esperar(300);
    igual(await pg.ev(acentoActual), '#8ab4f8', 'acento del tema sin apariencia guardada');
    afirmar(await pg.ev(`document.body.classList.contains('sobrio')`), 'el modo sobrio sigue activo');

    // (c) Tres pestañas.
    await pg.clic('#btn-tema');
    igual(await pg.ev(`[...document.querySelectorAll('#panel-tema [role="tab"]')].map(t => t.textContent)`), ['Tema', 'Fondo', 'Diseño'], 'pestañas');
    afirmar(await pg.ev(`document.getElementById('pestana-fondo').hidden`), 'Fondo oculto al principio');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    afirmar(!(await pg.ev(`document.getElementById('pestana-fondo').hidden`)), 'Fondo visible tras pulsar su pestaña');
    afirmar(await pg.ev(`document.getElementById('pestana-tema').hidden`), 'Tema oculto tras pulsar Fondo');
    igual(await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').getAttribute('aria-selected')`), 'true', 'aria-selected');
    await pg.tecla('Escape');
    afirmar(await pg.ev(`document.getElementById('panel-tema').hidden`), 'Escape cierra el panel');

    // (d) Acento libre: se mantiene al cambiar de tema y «Restaurar» lo quita.
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="tema"]').click()`);
    await pg.ev(poner('acento-libre', '#e0245e'));
    await pg.esperar(200);
    igual(await pg.ev(acentoActual), '#e0245e', 'acento libre aplicado');
    igual((await pg.ev(opcionesGuardadas)).apariencia.acento, '#e0245e', 'acento guardado');
    await pg.ev(`document.querySelector('.muestra[data-tema="papel"]').click()`);
    await pg.esperar(200);
    igual(await pg.ev(acentoActual), '#e0245e', 'el acento sobrevive al cambio de tema');
    await pg.clic('#acento-restaurar');
    await pg.esperar(200);
    igual(await pg.ev(acentoActual), '#1a73e8', 'Restaurar vuelve al acento del tema Papel');
    igual((await pg.ev(opcionesGuardadas)).apariencia.acento, null, 'acento guardado como null');

    // (e) Texto sobre el acento: oscuro con un acento claro, claro con uno oscuro.
    const sobre = `getComputedStyle(document.documentElement).getPropertyValue('--sobre-acento').trim()`;
    await pg.ev(poner('acento-libre', '#ffeb3b'));
    await pg.esperar(150);
    igual(await pg.ev(sobre), '#1f1f1f', 'texto sobre amarillo');
    await pg.ev(poner('acento-libre', '#1a237e'));
    await pg.esperar(150);
    igual(await pg.ev(sobre), '#ffffff', 'texto sobre azul oscuro');
  },
};
