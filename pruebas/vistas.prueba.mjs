import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const enlaces = n => Array.from({ length: n }, (_, i) => ({ id: `e${i}`, nombre: `Enlace ${i}`, url: `http://192.168.1.${i + 10}/` }));
// Un grupo «Grande» arriba y otro «Debajo» por debajo (a partir de la fila indicada).
const conGrupos = ({ n = 8, vista, w = 6, filaDebajo = 10 }) => ({
  ...structuredClone(DATOS_PRUEBA),
  grupos: [
    { id: 'g-grande', nombre: 'Grande', zona: 'local', color: '#6aa7e0', pos: { x: 1, y: 1, w }, ...(vista ? { vista } : {}), enlaces: enlaces(n) },
    { id: 'g-debajo', nombre: 'Debajo', zona: 'local', color: '#d685b0', pos: { x: 1, y: filaDebajo, w: 6 }, enlaces: enlaces(2).map(e => ({ ...e, id: `d${e.id}` })) },
  ],
});
const grupoEn = (d, nombre) => d.grupos.find(g => g.nombre === nombre);
const modulo = `import('/js/rejilla.js')`;
const editarGrande = async (pg, vista) => {
  await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Grande').querySelector('[data-accion="editar-grupo"]').click()`);
  await pg.esperar(200);
  await pg.ev(`document.querySelector('#dlg-grupo select[name="vista"]').value = '${vista}'`);
  await pg.clic('#dlg-grupo button[value="ok"]');
  await pg.esperar(400);
};

export default {
  nombre: 'vistas: modelo, alto por vista, selector y vecinos',
  async ejecutar(abrir) {
    // (a) Normalizar: sin vista o con basura es «lista».
    const sucio = conGrupos({ vista: undefined });
    sucio.grupos[1].vista = 'nada';
    sucio.grupos.push({ ...structuredClone(sucio.grupos[1]), id: 'g-5', nombre: 'Cinco', vista: 5, pos: { x: 7, y: 1, w: 6 } });
    sucio.grupos.push({ ...structuredClone(sucio.grupos[1]), id: 'g-i', nombre: 'Iconos', vista: 'iconos', pos: { x: 7, y: 20, w: 6 } });
    sucio.grupos.push({ ...structuredClone(sucio.grupos[1]), id: 'g-c', nombre: 'Compacta', vista: 'compacta', pos: { x: 7, y: 30, w: 6 } });
    let pg = await abrir({ datos: sucio });
    await pg.esperar(300);
    const d0 = await pg.datos();
    igual(d0.grupos.map(g => g.vista), ['lista', 'lista', 'lista', 'iconos', 'compacta'], 'vista normalizada');

    // (b) filasDe y alto.
    const filas = (n, vista, w) => pg.ev(`${modulo}.then(m => m.filasDe({ vista: '${vista}', pos: { w: ${w} }, enlaces: new Array(${n}).fill({}) }))`);
    igual([await filas(8, 'lista', 6), await filas(8, 'compacta', 6), await filas(8, 'iconos', 6), await filas(8, 'iconos', 4), await filas(8, 'iconos', 12)], [8, 4, 6, 8, 4], 'filas con 8 enlaces');
    igual([await filas(0, 'lista', 6), await filas(0, 'compacta', 6), await filas(0, 'iconos', 6)], [1, 1, 2], 'filas con 0 enlaces');
    igual(await pg.ev(`${modulo}.then(m => m.alto({ plegado: true, vista: 'iconos', pos: { w: 6 }, enlaces: new Array(8).fill({}) }))`), 1, 'plegado ocupa una fila');
    igual(await pg.ev(`${modulo}.then(m => m.alto({ vista: 'iconos', enlaces: new Array(8).fill({}) }))`), 7, 'sin posición se supone w = 6');

    // (c) El selector de «Editar grupo»: valores, guardado y filas ocupadas.
    pg = await abrir({ datos: conGrupos({}) });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Grande').querySelector('[data-accion="editar-grupo"]').click()`);
    await pg.esperar(200);
    igual(await pg.ev(`[...document.querySelectorAll('#dlg-grupo select[name="vista"] option')].map(o => [o.value, o.textContent])`), [['lista', 'Lista'], ['iconos', 'Iconos'], ['compacta', 'Compacta']], 'opciones del selector');
    igual(await pg.ev(`document.querySelector('#dlg-grupo select[name="vista"]').value`), 'lista', 'vista actual marcada');
    await pg.ev(`document.querySelector('#dlg-grupo select[name="vista"]').value = 'compacta'`);
    await pg.clic('#dlg-grupo button[value="ok"]');
    await pg.esperar(400);
    igual(grupoEn(await pg.datos(), 'Grande').vista, 'compacta', 'vista guardada');
    igual(await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Grande').style.gridRow`), '1 / span 5', 'filas ocupadas por la vista compacta');
    await pg.recargar();
    await pg.esperar(300);
    igual(grupoEn(await pg.datos(), 'Grande').vista, 'compacta', 'vista tras recargar');

    // (d) Cambiar la vista aparta a los vecinos solo cuando hace falta.
    for (const [n, vista, w, esperadaY, texto] of [[8, 'iconos', 6, 10, 'iconos w6: el de abajo no se mueve'], [8, 'iconos', 4, 10, 'iconos w4 (alto 9): sigue en la fila 10'], [14, 'iconos', 4, 16, 'iconos w4 con 14 enlaces (alto 15): baja a la fila 16']]) {
      pg = await abrir({ datos: conGrupos({ n, w }) });
      await pg.esperar(300);
      await pg.clic('#btn-editar');
      await editarGrande(pg, vista);
      igual(grupoEn(await pg.datos(), 'Debajo').pos.y, esperadaY, texto);
    }

    // (e) Estrechar con el asa un grupo en iconos aparta al vecino sin solapar.
    pg = await abrir({ datos: conGrupos({ vista: 'iconos', w: 6, filaDebajo: 8 }) });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    const col = await pg.ev(`(() => { const r = document.querySelector('#rejilla'); const e = getComputedStyle(r); return (r.getBoundingClientRect().width + parseFloat(e.columnGap)) / 12; })()`);
    const asa = await pg.ev(`(() => { const r = [...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Grande').querySelector('.asa-ancho').getBoundingClientRect(); return [r.left + 6, r.top + r.height / 2]; })()`);
    await pg.arrastrar(asa, [asa[0] - 2 * col, asa[1]], 6);
    const d = await pg.datos();
    igual(grupoEn(d, 'Grande').pos.w, 4, 'ancho tras estrechar');
    igual(grupoEn(d, 'Debajo').pos.y, 10, 'el vecino baja a la fila 10 (alto 9 de Grande)');

    // (f) Grupos sin vista: importados, creados a mano y de «Importar marcadores» quedan en lista.
    pg = await abrir();
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.ev(`(() => {
      window.confirm = () => true;
      const dt = new DataTransfer();
      dt.items.add(new File([${JSON.stringify(JSON.stringify(DATOS_PRUEBA))}], 'copia.json', { type: 'application/json' }));
      const i = document.getElementById('archivo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await pg.esperar(500);
    afirmar((await pg.datos()).grupos.every(g => g.vista === 'lista'), 'importados sin vista quedan en lista');
    await pg.ev(`document.querySelector('[data-nuevo-grupo]').click()`);
    await pg.esperar(200);
    await pg.ev(`document.querySelector('#dlg-grupo input[name="nombre"]').value = 'Nuevo'`);
    await pg.clic('#dlg-grupo button[value="ok"]');
    await pg.esperar(400);
    igual(grupoEn(await pg.datos(), 'Nuevo').vista, 'lista', 'grupo creado a mano');
    const importados = await pg.ev(`import('/js/importar.js').then(m => m.gruposDeCarpetas([{ id: 'c', nombre: 'Casa', enlaces: [{ nombre: 'a', url: 'http://192.168.9.9/' }] }], new Set(['c']), new Set()).grupos.map(g => g.vista))`);
    igual(importados, ['lista'], 'grupos de Importar marcadores');
  },
};
