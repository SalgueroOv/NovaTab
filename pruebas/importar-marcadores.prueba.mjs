import { afirmar, igual } from './lib/util.mjs';
import { ARBOL_PRUEBA } from './lib/marcadores-prueba.mjs';

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
  },
};
