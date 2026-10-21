import { afirmar, igual } from './lib/util.mjs';

export default {
  nombre: 'buscador: tus enlaces primero y Google después',
  async ejecutar(abrir) {
    const pg = await abrir();
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('NAS Beta');
    igual(await pg.ev(`document.querySelector('.sugerencia.sel .s-titulo').textContent`), 'NAS Beta', 'primera sugerencia marcada');
    // Shift+Enter abre la primera sugerencia de Google.
    const google = await pg.ev(`[...document.querySelectorAll('.sugerencia')].find(s => s.querySelector('.s-etiqueta').textContent === 'Google').href`);
    afirmar(google.startsWith('https://www.google.com/search?q='), `la primera sugerencia de Google debería buscar en Google y es ${google}`);
    await pg.tecla('Escape');
    igual(await pg.ev(`document.getElementById('buscar').value`), '', 'Esc vacía el buscador');
  },
};
