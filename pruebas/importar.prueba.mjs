import { igual } from './lib/util.mjs';
import { conWidgets, DATOS_PRUEBA } from './lib/datos-prueba.mjs';

export default {
  nombre: 'importar: no deja notas huérfanas y no acepta colores con url()',
  async ejecutar(abrir) {
    // Importar una copia sin el widget de notas borra la nota del widget que desaparece.
    let pg = await abrir({ datos: conWidgets([{ id: 'w-viejo', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]) });
    await pg.ev(`localStorage.setItem('nota:w-viejo', JSON.stringify('nota antigua'))`);
    await pg.clic('#btn-editar');
    await pg.ev(`(() => {
      window.confirm = () => true;
      const dt = new DataTransfer();
      dt.items.add(new File([${JSON.stringify(JSON.stringify(DATOS_PRUEBA))}], 'copia.json', { type: 'application/json' }));
      const i = document.getElementById('archivo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change'));
    })()`);
    await pg.esperar(500);
    igual(await pg.ev(`Object.keys(localStorage).filter(k => k.startsWith('nota:'))`), [], 'notas que quedan tras importar');

    // Importar tu propia copia: la nota que ya estaba en pantalla muestra el texto importado.
    const conNota = conWidgets([{ id: 'w-mia', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]);
    pg = await abrir({ datos: conNota });
    await pg.ev(`(() => { const t = document.querySelector('.notas-texto'); t.value = 'texto de ahora'; t.dispatchEvent(new Event('input')); t.blur(); })()`);
    await pg.clic('#btn-editar');
    await pg.ev(`(() => {
      window.confirm = () => true;
      const copia = { ...${JSON.stringify(conNota)}, notas: { 'w-mia': 'texto de la copia' } };
      const dt = new DataTransfer();
      dt.items.add(new File([JSON.stringify(copia)], 'copia.json', { type: 'application/json' }));
      const i = document.getElementById('archivo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change'));
    })()`);
    await pg.esperar(500);
    igual(await pg.ev(`document.querySelector('.notas-texto').value`), 'texto de la copia', 'texto de la nota tras importar la copia');

    // Un color que no es un color (url(), etc.) se sustituye por el gris por defecto.
    const d = structuredClone(DATOS_PRUEBA);
    d.grupos[0].color = 'url(https://rastreo.example/pixel.png)';
    pg = await abrir({ datos: d });
    igual(await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').style.getPropertyValue('--c')`), '#8a8c92', 'color de Alfa');
  },
};
