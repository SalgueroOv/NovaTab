import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const escribirEn = (selector, texto) => `(() => { const i = document.querySelector('${selector}'); i.value = '${texto}'; i.dispatchEvent(new Event('input')); })()`;

export default {
  nombre: 'restablecer todo: desde Opciones, con confirmación escrita y sin notas huérfanas',
  async ejecutar(abrir) {
    const pg = await abrir({ datos: conWidgets([{ id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]) });
    await pg.ev(`localStorage.setItem('nota:w-notas', JSON.stringify('Texto de prueba'))`);
    afirmar(!(await pg.ev(`!!document.getElementById('btn-restaurar')`)), 'Restaurar ya no debe estar en la barra de edición');

    await pg.clic('#btn-tema');
    await pg.clic('#btn-restablecer');
    afirmar(await pg.ev(`document.getElementById('dlg-restablecer').open`), 'debería abrirse el diálogo de restablecer');
    afirmar(await pg.ev(`document.getElementById('confirmar-restablecer').disabled`), 'confirmar debe empezar desactivado');
    await pg.ev(escribirEn('#texto-restablecer', 'borrar'));
    afirmar(await pg.ev(`document.getElementById('confirmar-restablecer').disabled`), 'con «borrar» en minúsculas sigue desactivado');
    await pg.ev(escribirEn('#texto-restablecer', 'BORRAR'));
    afirmar(!(await pg.ev(`document.getElementById('confirmar-restablecer').disabled`)), 'con «BORRAR» se activa');

    await pg.clic('#confirmar-restablecer');
    await pg.esperar(300);
    igual((await pg.datos()).grupos.map(g => g.nombre), await pg.ev(`DATOS_DEFECTO.grupos.map(g => g.nombre)`), 'grupos tras restablecer');
    igual(await pg.ev(`Object.keys(localStorage).filter(k => k.startsWith('nota:'))`), [], 'claves de notas que quedan');
  },
};
