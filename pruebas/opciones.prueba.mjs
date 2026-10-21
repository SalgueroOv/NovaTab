import { afirmar, igual } from './lib/util.mjs';

export default {
  nombre: 'opciones: tema, modo sobrio y paneles se guardan',
  async ejecutar(abrir) {
    const pg = await abrir();
    await pg.clic('#btn-tema');
    await pg.clic('.muestra[data-tema="papel"]');
    await pg.clic('#opt-sobrio');
    await pg.clic('#btn-panel-der');
    afirmar(await pg.ev(`document.body.classList.contains('sin-der')`), 'el panel derecho debería ocultarse');
    // Ocultar también el izquierdo vuelve a mostrar el derecho: nunca quedan los dos ocultos.
    await pg.clic('#btn-panel-izq');
    igual(await pg.ev(`[document.body.classList.contains('sin-izq'), document.body.classList.contains('sin-der')]`), [true, false], '[sin-izq, sin-der]');

    await pg.recargar();
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'papel', 'tema tras recargar');
    igual(await pg.ev(`[document.body.classList.contains('sobrio'), document.body.classList.contains('sin-izq')]`), [true, true], '[sobrio, sin-izq] tras recargar');
  },
};
