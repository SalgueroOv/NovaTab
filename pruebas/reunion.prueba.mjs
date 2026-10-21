import { afirmar, igual } from './lib/util.mjs';

const visibles = `[...document.querySelectorAll('.grupo')].map(g => g.querySelector('h3, .grupo-online-cab span')?.textContent || [...g.querySelectorAll('.nombre')].map(n => n.textContent).join('+'))`;

export default {
  nombre: 'modo reunión: los grupos privados desaparecen y no se buscan',
  async ejecutar(abrir) {
    const pg = await abrir();
    await pg.clic('#btn-reunion');
    const texto = await pg.ev(`document.querySelector('.pagina').innerText`);
    for (const oculto of ['Gamma', 'Secreto Uno', 'Videos', 'Juegos']) {
      afirmar(!texto.includes(oculto), `«${oculto}» no debería verse en modo reunión (visibles: ${await pg.ev(visibles)})`);
    }
    afirmar(texto.includes('Correo'), 'los enlaces de Trabajo deberían seguir visibles');

    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('Videos');
    const propios = await pg.ev(`[...document.querySelectorAll('.sugerencia')].filter(s => s.querySelector('.s-etiqueta').textContent !== 'Google').length`);
    igual(propios, 0, 'sugerencias propias al buscar un enlace privado en modo reunión');

    await pg.recargar();
    igual(await pg.ev(`document.getElementById('btn-reunion').getAttribute('aria-pressed')`), 'true', 'modo reunión tras recargar');
  },
};
