import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afirmar, igual, RAIZ } from './lib/util.mjs';
import { ARBOL_PRUEBA } from './lib/marcadores-prueba.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

// Sin el grupo «Trabajo» de los datos de prueba, que ya trae mail y docs.
const BASE = { ...structuredClone(DATOS_PRUEBA), grupos: DATOS_PRUEBA.grupos.slice(0, 2) };

const modulo = `import('/js/importar.js')`;

export default {
  nombre: 'importar marcadores: carpetas, zona, duplicados y enlaces inseguros',
  async ejecutar(abrir) {
    const pg = await abrir();
    await pg.esperar(300);

    // (a) Qué es «local».
    const locales = ['http://192.168.1.5/', 'http://10.1.2.3/', 'http://172.16.0.1/', 'http://172.31.255.1/', 'http://localhost:8080/'];
    const remotas = ['http://172.32.0.1/', 'https://example.com/', 'http://8.8.8.8/'];
    igual(await pg.ev(`${modulo}.then(m => ${JSON.stringify([...locales, ...remotas])}.map(u => m.esLocal(u)))`),
      [...locales.map(() => true), ...remotas.map(() => false)], 'esLocal');

    // (b) Carpetas aplanadas, solo con http y https.
    const carpetas = await pg.ev(`${modulo}.then(m => m.carpetasDeArbol(${JSON.stringify(ARBOL_PRUEBA)}))`);
    igual(carpetas.map(c => [c.nombre, c.enlaces.length]),
      [['Barra de marcadores', 1], ['Casa', 3], ['Casa / Domótica', 2], ['Trabajo', 4]], 'carpetas y número de enlaces');
    afirmar(carpetas.flatMap(c => c.enlaces).every(e => /^https?:/.test(e.url)), 'solo http y https');

    // (c) Grupos: zona, duplicados dentro de la importación y nombre del enlace sin título.
    const todas = JSON.stringify(carpetas.map(c => c.id));
    const grupar = (elegidas, guardados) => pg.ev(`${modulo}.then(m => {
      const r = m.gruposDeCarpetas(${JSON.stringify(carpetas)}, new Set(${elegidas}), new Set(${JSON.stringify(guardados)}));
      return { omitidos: r.omitidos, grupos: r.grupos.map(g => ({ nombre: g.nombre, zona: g.zona, color: g.color, privado: g.privado, pos: g.pos, enlaces: g.enlaces })) };
    })`);
    let r = await grupar(todas, []);
    igual(r.omitidos, 1, 'repetidos omitidos');
    igual(r.grupos.map(g => [g.nombre, g.zona]),
      [['Barra de marcadores', 'local'], ['Casa', 'local'], ['Casa / Domótica', 'online'], ['Trabajo', 'online']], 'nombre y zona');
    igual(r.grupos.map(g => g.enlaces.length), [1, 3, 2, 3], 'enlaces por grupo');
    igual(r.grupos[3].enlaces.map(e => e.nombre), ['Correo', 'Docs', 'sin-titulo.example.com'], 'nombres de enlace');
    afirmar(r.grupos.every(g => g.color === '#8a8c92' && g.privado === false && g.pos === null), 'valores por defecto del grupo');

    // (d) Lo que ya está guardado se omite; si no queda nada, no hay grupo.
    r = await grupar(todas, ['mail.example.com:443']);
    igual(r.omitidos, 2, 'omitidos con mail guardado');
    igual(r.grupos[3].enlaces.map(e => e.nombre), ['Docs', 'sin-titulo.example.com'], 'Trabajo sin mail');
    r = await grupar(todas, ['mail.example.com:443', 'docs.example.com:443', 'sin-titulo.example.com:443']);
    igual(r.grupos.map(g => g.nombre), ['Barra de marcadores', 'Casa', 'Casa / Domótica'], 'Trabajo desaparece si no queda nada');

    // (e) Nombres vacíos o larguísimos.
    r = await pg.ev(`${modulo}.then(m => m.gruposDeCarpetas([
      { id: 'a', nombre: '', enlaces: [{ nombre: 'x', url: 'https://a.example.com/' }] },
      { id: 'b', nombre: 'n'.repeat(80), enlaces: [{ nombre: 'y', url: 'https://b.example.com/' }] },
    ], new Set(['a', 'b']), new Set()).grupos.map(g => g.nombre))`);
    igual(r, ['Sin nombre', 'n'.repeat(40)], 'nombres de grupo');

    // ---- Botón, permiso y diálogo ----
    const marcar = nombre => `[...document.querySelectorAll('#lista-marcadores li')].find(li => li.querySelector('.nombre').textContent === ${JSON.stringify(nombre)}).querySelector('input').click()`;
    const filas = pagina => pagina.ev(`[...document.querySelectorAll('#lista-marcadores li')].map(li => li.querySelector('.nombre').textContent)`);
    const aviso = pagina => pagina.ev(`[document.getElementById('aviso-accion'), document.getElementById('aviso')].filter(a => !a.hidden).map(a => a.textContent).join('')`);

    // (a) El diálogo lista las 4 carpetas, desmarcadas, y «Importar» espera a que marques alguna.
    let p2 = await abrir({ datos: BASE, chrome: {}, marcadores: ARBOL_PRUEBA, permisoMarcadores: 'pendiente' });
    await p2.esperar(300);
    await p2.ev(`window.confirm = () => true`);
    await p2.clic('#btn-editar');
    await p2.clic('#btn-importar-marcadores');
    await p2.esperar(300);
    afirmar(await p2.ev(`document.getElementById('dlg-marcadores').open`), 'el diálogo se abre al conceder el permiso');
    igual(await filas(p2), ['Barra de marcadores', 'Casa', 'Casa / Domótica', 'Trabajo'], 'carpetas del diálogo');
    igual(await p2.ev(`[...document.querySelectorAll('#lista-marcadores input')].some(i => i.checked)`), false, 'todo desmarcado');
    afirmar(await p2.ev(`document.getElementById('importar-marcadores-ok').disabled`), 'Importar desactivado sin carpetas');
    await p2.ev(marcar('Casa'));
    afirmar(!(await p2.ev(`document.getElementById('importar-marcadores-ok').disabled`)), 'Importar se activa al marcar una carpeta');

    // (b) Importar Casa y Trabajo crea sus grupos sin la URL insegura; Ctrl+Z los quita.
    await p2.ev(marcar('Trabajo'));
    await p2.clic('#importar-marcadores-ok');
    await p2.esperar(500);
    let d = await p2.datos();
    const casa = d.grupos.find(g => g.nombre === 'Casa');
    const trabajo = d.grupos.find(g => g.nombre === 'Trabajo');
    igual([casa.enlaces.length, casa.zona, trabajo.enlaces.length, trabajo.zona], [3, 'local', 3, 'online'], 'grupos importados');
    afirmar(!JSON.stringify(d).includes('javascript:'), 'ningún enlace javascript:');
    igual(await aviso(p2), '2 grupos importados (1 repetido omitido)Deshacer', 'aviso tras importar');
    await p2.ev(`document.activeElement.blur()`);
    await p2.tecla('z', 'ctrl');
    await p2.esperar(500);
    d = await p2.datos();
    afirmar(!d.grupos.some(g => g.nombre === 'Casa' || g.nombre === 'Trabajo'), 'Ctrl+Z quita lo importado');

    // (c) Importar de nuevo todo lo ya importado no añade nada.
    await p2.clic('#btn-importar-marcadores');
    await p2.esperar(300);
    for (const n of ['Barra de marcadores', 'Casa', 'Casa / Domótica', 'Trabajo']) await p2.ev(marcar(n));
    await p2.clic('#importar-marcadores-ok');
    await p2.esperar(500);
    const tras = (await p2.datos()).grupos.length;
    await p2.clic('#btn-importar-marcadores');
    await p2.esperar(300);
    for (const n of ['Barra de marcadores', 'Casa', 'Casa / Domótica', 'Trabajo']) await p2.ev(marcar(n));
    await p2.clic('#importar-marcadores-ok');
    await p2.esperar(500);
    igual((await p2.datos()).grupos.length, tras, 'la segunda importación no crea grupos');
    igual(await aviso(p2), 'No hay nada nuevo que importar: todos los enlaces ya están en tus grupos', 'aviso sin novedades');

    // (d) Permiso denegado: no se abre el diálogo y no cambia nada.
    p2 = await abrir({ datos: BASE, chrome: {}, marcadores: ARBOL_PRUEBA, permisoMarcadores: 'denegado' });
    await p2.esperar(300);
    const antes = JSON.stringify(await p2.datos());
    await p2.clic('#btn-editar');
    await p2.clic('#btn-importar-marcadores');
    await p2.esperar(300);
    igual(await p2.ev(`document.getElementById('dlg-marcadores').open`), false, 'diálogo cerrado sin permiso');
    igual(JSON.stringify(await p2.datos()), antes, 'datos intactos sin permiso');
    igual(await aviso(p2), 'Sin permiso para leer tus marcadores', 'aviso de permiso');

    // (e) Cancelar con casillas marcadas no crea nada.
    p2 = await abrir({ datos: BASE, chrome: {}, marcadores: ARBOL_PRUEBA, permisoMarcadores: 'concedido' });
    await p2.esperar(300);
    const antes2 = JSON.stringify(await p2.datos());
    await p2.clic('#btn-editar');
    await p2.clic('#btn-importar-marcadores');
    await p2.esperar(300);
    await p2.ev(marcar('Casa'));
    await p2.clic('#dlg-marcadores button[data-cerrar]');
    await p2.esperar(300);
    igual(JSON.stringify(await p2.datos()), antes2, 'datos intactos al cancelar');

    // (f) El permiso es opcional: no está entre los obligatorios.
    const manifest = JSON.parse(readFileSync(join(RAIZ, 'manifest.json'), 'utf8'));
    afirmar(manifest.optional_permissions?.includes('bookmarks'), 'bookmarks en optional_permissions');
    afirmar(!manifest.permissions.includes('bookmarks'), 'bookmarks no en permissions');
  },
};
