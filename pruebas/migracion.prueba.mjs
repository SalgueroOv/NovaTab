import { afirmar, igual } from './lib/util.mjs';
import { DATOS_V3, NOTAS_V3, resumen } from './lib/datos-v3.mjs';

const enArea = (area, clave) => `chrome.storage.${area}.get('${clave}').then(r => r['${clave}'] ?? null)`;
const leer = clave => `import('/js/almacen.js').then(m => m.leer('${clave}'))`;
const clavesSync = `chrome.storage.sync.get(null).then(t => Object.keys(t).sort())`;

const conMuchosEnlaces = () => {
  const d = structuredClone(DATOS_V3);
  d.grupos = d.grupos.slice(0, 4).map((g, i) => ({
    ...g,
    enlaces: Array.from({ length: 50 }, (_, j) => ({ id: `m${i}-${j}`, nombre: `Servicio ${i}-${j}`, url: `http://192.168.${i}.${j + 1}:8080/` })),
  }));
  return d;
};

export default {
  nombre: 'migración a v4: un grupo por clave, sin perder nada',
  async ejecutar(abrir) {
    // (a) Al abrir con datos v3: respaldo, estructura sin enlaces y un grupo por clave; nada se pierde.
    let pg = await abrir({ chrome: {}, datos: DATOS_V3, guardados: NOTAS_V3 });
    await pg.esperar(300);
    igual(await pg.ev(enArea('local', 'respaldo-v3')), DATOS_V3, 'respaldo de los datos v3');
    const estructura = await pg.ev(enArea('sync', 'perfil:principal:datos'));
    igual(estructura.version, 4, 'versión guardada');
    afirmar(estructura.grupos.every(g => !('enlaces' in g)), 'la estructura no debe llevar los enlaces');
    for (const g of DATOS_V3.grupos) {
      igual((await pg.ev(enArea('sync', `enlaces:${g.id}`))).map(e => e.nombre), g.enlaces.map(e => e.nombre), `enlaces guardados de ${g.nombre}`);
    }
    igual(resumen(await pg.datos()), resumen(DATOS_V3), 'datos en memoria tras migrar');
    igual(await pg.ev(`[...document.querySelectorAll('.notas-texto')].map(t => t.value)`), ['nota uno', 'nota dos'], 'notas tras migrar');

    // (b) Mover/plegar un grupo escribe solo la estructura; editar un enlace, solo su grupo.
    await pg.ev(`__chromeFalso.escritas()`);
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Servidores').querySelector('[data-plegar]').click()`);
    await pg.esperar(300);
    igual(await pg.ev(`__chromeFalso.escritas()`), ['perfil:principal:datos'], 'claves escritas al plegar');
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Privado local').querySelector('.fila').click()`);
    await pg.esperar(200);
    await pg.ev(`document.querySelector('#dlg-enlace input[name="nombre"]').value = 'Copias nuevas'`);
    await pg.clic('#dlg-enlace button[value="ok"]');
    await pg.esperar(300);
    igual(await pg.ev(`__chromeFalso.escritas()`), ['enlaces:g3'], 'claves escritas al editar un enlace');

    // (c) 200 enlaces en 4 grupos se guardan y se recargan iguales.
    pg = await abrir({ chrome: {}, datos: conMuchosEnlaces() });
    await pg.esperar(300);
    await pg.recargar();
    igual((await pg.datos()).grupos.slice(0, 4).map(g => g.enlaces.length), [50, 50, 50, 50], 'enlaces por grupo tras recargar');
    // Las posiciones pueden cambiar (la rejilla baja lo que pisan grupos de 51 filas); los enlaces, no.
    const enlaces = d => d.grupos.slice(0, 4).map(g => g.enlaces.map(e => [e.id, e.nombre, e.url]));
    igual(enlaces(await pg.datos()), enlaces(conMuchosEnlaces()), 'los 200 enlaces tras recargar');

    // (d) Si escribir falla de verdad, los datos siguen en v3 y la siguiente apertura vuelve a migrar.
    pg = await abrir({ chrome: { cuotaPorClave: 50 }, datos: null });
    // Con la cuota tan baja, la primera apertura dejó los datos por defecto en local: fuera, para que
    // la página lea los datos v3 de sync.
    await pg.ev(`Object.keys(localStorage).filter(k => k.startsWith('chrome.local/')).forEach(k => localStorage.removeItem(k));
      localStorage.setItem('chrome.sync/perfiles', ${JSON.stringify(JSON.stringify({ version: 5, lista: [{ id: 'principal', nombre: 'Principal' }] }))});
      localStorage.setItem('chrome.sync/perfil:principal:datos', ${JSON.stringify(JSON.stringify(DATOS_V3))});
      localStorage.setItem('chrome-falso/localFalla', '1')`);
    await pg.recargar();
    await pg.esperar(300);
    igual(await pg.ev(`${enArea('sync', 'perfil:principal:datos')}.then(d => d.version)`), 3, 'versión en sync tras un fallo al migrar');
    igual(resumen(await pg.datos()), resumen(DATOS_V3), 'la página sigue mostrando los datos aunque no pueda guardarlos');
    await pg.ev(`localStorage.removeItem('chrome-falso/localFalla')`);
    await pg.recargar();
    await pg.esperar(300);
    igual(await pg.ev(`${leer('perfil:principal:datos')}.then(d => d.version)`), 4, 'versión tras volver a abrir sin fallos');

    // (e) Importar una copia v3 deja el formato v4 y no deja grupos huérfanos.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.ev(`(() => {
      window.confirm = () => true;
      const dt = new DataTransfer();
      dt.items.add(new File([${JSON.stringify(JSON.stringify(DATOS_V3))}], 'copia.json', { type: 'application/json' }));
      const i = document.getElementById('archivo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change'));
    })()`);
    await pg.esperar(500);
    const claves = await pg.ev(clavesSync);
    igual(claves.filter(k => k.startsWith('enlaces:')), ['enlaces:g1', 'enlaces:g2', 'enlaces:g3', 'enlaces:g4', 'enlaces:g5'], 'claves de grupo tras importar');
    igual(await pg.ev(`${enArea('sync', 'perfil:principal:datos')}.then(d => d.version)`), 4, 'versión tras importar');
  },
};
