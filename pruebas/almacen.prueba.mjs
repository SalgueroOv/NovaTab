import { afirmar, igual } from './lib/util.mjs';

// Usa el módulo real de la página (misma instancia que la aplicación).
const almacen = cuerpo => `import('/js/almacen.js').then(async m => { ${cuerpo} })`;
const enArea = (area, clave) => `chrome.storage.${area}.get('${clave}').then(r => r['${clave}'] ?? null)`;

export default {
  nombre: 'almacenamiento: cuota por clave y límite de escrituras de Chrome',
  async ejecutar(abrir) {
    // (a) Un valor de más de 8 KB se guarda solo en este equipo y se avisa una vez.
    let pg = await abrir({ chrome: {} });
    const grande = 'x'.repeat(9000);
    await pg.ev(almacen(`await m.escribir('grande', '${grande}');`));
    await pg.esperar(100);
    igual(await pg.ev(`${enArea('sync', 'grande')}.then(v => v === null)`), true, 'el valor grande no debe quedar en sync');
    igual(await pg.ev(`${enArea('local', 'grande')}.then(v => v && v.length)`), 9000, 'longitud del valor grande en local');
    afirmar((await pg.ev(`document.getElementById('aviso').textContent`)).includes('solo en este equipo'), 'debería avisar de que se guarda solo en este equipo');
    await pg.ev(`document.getElementById('aviso').hidden = true`);
    await pg.ev(almacen(`await m.escribir('grande2', '${grande}');`));
    await pg.esperar(100);
    igual(await pg.ev(`document.getElementById('aviso').hidden`), true, 'el aviso de cuota solo aparece una vez');

    // (b) Al pasar el límite de escrituras, lo nuevo se guarda en local, se lee bien y luego se reintenta.
    // Datos ya en v4 y vacíos: al abrir no se escribe nada y no se gasta el límite de la prueba.
    pg = await abrir({ chrome: {}, datos: { version: 4, grupos: [], widgets: [] } });
    await pg.ev(`__chromeFalso.ponerRitmo(2); __chromeFalso.reiniciarRitmo()`);
    await pg.ev(almacen(`await m.escribir('a', 1); await m.escribir('b', 2); await m.escribir('c', 3);`));
    igual(await pg.ev(`${enArea('local', 'c')}`), 3, 'la tercera escritura queda en local');
    igual(await pg.ev(almacen(`return m.leer('c');`)), 3, 'leer devuelve el valor nuevo');
    await pg.ev(`__chromeFalso.reiniciarRitmo()`);
    await pg.ev(almacen(`await m.reintentarPendientes();`));
    igual(await pg.ev(`Promise.all([${enArea('sync', 'c')}, ${enArea('local', 'c')}])`), [3, null], '[sync, local] de «c» tras el reintento');
  },
};
