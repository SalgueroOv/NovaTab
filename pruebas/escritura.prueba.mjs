import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const NOTAS = conWidgets([{ id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]);

export default {
  nombre: 'escritura: «/» se puede escribir, Enter guarda y la nota no pierde el foco',
  async ejecutar(abrir) {
    // «/» dentro de una nota se escribe; no salta al buscador.
    let pg = await abrir({ datos: NOTAS });
    await pg.ev(`document.querySelector('.notas-texto').focus()`);
    for (const type of ['keyDown', 'keyUp']) {
      await pg.p.send('Input.dispatchKeyEvent', { type, key: '/', code: 'Slash', text: type === 'keyDown' ? '/' : undefined, windowsVirtualKeyCode: 191 });
    }
    await pg.esperar(150);
    igual(await pg.ev(`[document.activeElement.className, document.activeElement.value]`), ['notas-texto', '/'], '[foco, texto] tras pulsar «/» en la nota');

    // La nota que estás escribiendo sigue igual aunque la página se repinte.
    await pg.ev(`(() => { const t = document.querySelector('.notas-texto'); t.value = 'a medias'; t.dispatchEvent(new Event('input')); })()`);
    await pg.ev(`novatab.pintar()`);
    igual(await pg.ev(`[document.activeElement.className, document.activeElement.value]`), ['notas-texto', 'a medias'], '[foco, texto] tras repintar');

    // Entrar y salir de una nota sin cambiarla no gasta una escritura.
    await pg.esperar(800);
    await pg.ev(`(() => { window.__escrituras = 0; const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k.startsWith('nota:')) window.__escrituras++; return set.call(this, k, v); }; })()`);
    await pg.ev(`(() => { const t = document.querySelector('.notas-texto'); t.blur(); t.focus(); t.blur(); })()`);
    igual(await pg.ev(`window.__escrituras`), 0, 'escrituras de nota sin cambios');

    // Enter en el diálogo de enlace guarda (antes cancelaba).
    pg = await abrir();
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('.fila').click()`);
    await pg.esperar(200);
    await pg.ev(`(() => { const i = document.querySelector('#dlg-enlace input[name="nombre"]'); i.value = 'Proxmox Renombrado'; i.focus(); })()`);
    await pg.tecla('Enter');
    afirmar(!(await pg.ev(`document.getElementById('dlg-enlace').open`)), 'el diálogo debería cerrarse al pulsar Enter');
    igual((await pg.datos()).grupos[0].enlaces[0].nombre, 'Proxmox Renombrado', 'nombre guardado con Enter');
  },
};
