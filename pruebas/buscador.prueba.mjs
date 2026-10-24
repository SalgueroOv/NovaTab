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

    // Empezar a escribir con el foco fuera de un campo lleva al buscador, y la letra entra en él.
    const letra = async (key, modifiers = 0) => {
      for (const type of ['keyDown', 'keyUp']) {
        await pg.p.send('Input.dispatchKeyEvent', { type, key, code: `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), modifiers, text: type === 'keyDown' && !modifiers ? key : undefined });
      }
      await pg.esperar(100);
    };
    await pg.ev(`document.getElementById('buscar').blur(); document.body.focus()`);
    await letra('g');
    igual(await pg.ev(`[document.activeElement.id, document.getElementById('buscar').value]`), ['buscar', 'g'], 'una letra lleva al buscador y se escribe');
    // Con Ctrl (Ctrl+K y demás) no: la paleta se abre y el buscador no recibe nada.
    await pg.ev(`(() => { const b = document.getElementById('buscar'); b.value = ''; b.blur(); document.body.focus(); })()`);
    await letra('k', 2);
    await pg.esperar(150);
    afirmar(await pg.ev(`document.getElementById('paleta').open && document.getElementById('buscar').value === ''`), 'Ctrl+K sigue abriendo la paleta');
  },
};
