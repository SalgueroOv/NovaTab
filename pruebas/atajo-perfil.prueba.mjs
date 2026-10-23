import { igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const guardables = enlaces => enlaces.map(e => ({ ...e, icono: null }));
const GRUPO_C = { id: 'g-casa', nombre: 'GrupoCasa', zona: 'local', color: '#8a8c92', pos: { x: 1, y: 1, w: 6 }, plegado: false, privado: false, enlaces: [{ id: 'ec', nombre: 'Router casa', url: 'http://192.168.0.1/' }] };
const estructura = (grupos, widgets = []) => ({ version: 4, titulos: {}, grupos: grupos.map(({ enlaces, ...g }) => g), widgets });
const SEMILLA = {
  'chrome.sync/perfiles': { version: 5, lista: [{ id: 'principal', nombre: 'Principal' }, { id: 'casa', nombre: 'Casa' }, { id: 'trabajo', nombre: 'Trabajo' }] },
  'chrome.sync/perfil:principal:datos': estructura(DATOS_PRUEBA.grupos),
  'chrome.sync/perfil:casa:datos': estructura([GRUPO_C]),
  'chrome.sync/perfil:trabajo:datos': estructura([]),
  ...Object.fromEntries(DATOS_PRUEBA.grupos.map(g => [`chrome.sync/enlaces:${g.id}`, guardables(g.enlaces)])),
  'chrome.sync/enlaces:g-casa': guardables(GRUPO_C.enlaces),
  'chrome.local/perfil-activo': 'principal',
};
const activo = pg => pg.ev(`document.getElementById('btn-perfil').textContent.trim()`);

export default {
  nombre: 'perfiles: Alt+P pasa al siguiente y Alt+Mayús+P al anterior',
  async ejecutar(abrir) {
    const pg = await abrir({ chrome: {}, datos: null, guardados: SEMILLA });
    await pg.esperar(800);
    igual(await activo(pg), 'Principal', 'empieza en Principal');
    await pg.ev(`document.getElementById('buscar').blur()`);

    await pg.tecla('p', 'alt');
    await pg.esperar(900);
    igual(await activo(pg), 'Casa', 'Alt+P pasa al siguiente');
    await pg.tecla('p', 'alt');
    await pg.esperar(900);
    igual(await activo(pg), 'Trabajo', 'y al siguiente');
    await pg.tecla('p', 'alt');
    await pg.esperar(900);
    igual(await activo(pg), 'Principal', 'tras el último vuelve al primero');
    await pg.tecla('p', 'alt', 'shift');
    await pg.esperar(900);
    igual(await activo(pg), 'Trabajo', 'Alt+Mayús+P pasa al anterior (desde el primero, al último)');

    // Con el buscador vacío y enfocado (como al abrir la pestaña) funciona; con texto escrito, o con un diálogo abierto, no.
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.tecla('p', 'alt');
    await pg.esperar(900);
    igual(await activo(pg), 'Principal', 'con el buscador vacío enfocado sí cambia');
    await pg.ev(`(() => { const b = document.getElementById('buscar'); b.value = 'hola'; b.focus(); })()`);
    await pg.tecla('p', 'alt');
    await pg.esperar(600);
    igual(await activo(pg), 'Principal', 'con texto escrito en el buscador no cambia');
    await pg.ev(`document.getElementById('buscar').value = ''`);
    await pg.ev(`document.activeElement.blur(); document.getElementById('dlg-perfil').showModal()`);
    await pg.tecla('p', 'alt');
    await pg.esperar(600);
    igual(await activo(pg), 'Principal', 'con un diálogo abierto no cambia');
  },
};
