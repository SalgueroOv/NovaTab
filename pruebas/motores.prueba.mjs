import { afirmar, igual } from './lib/util.mjs';

const modulo = `import('/js/motores.js')`;
const ATAJOS = [
  { clave: 'y', nombre: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
  { clave: 'gh', nombre: 'GitHub', url: 'https://github.com/search?q=%s' },
  { clave: 'w', nombre: 'Wikipedia', url: 'https://es.wikipedia.org/w/index.php?search=%s' },
  { clave: 'm', nombre: 'Maps', url: 'https://www.google.com/maps/search/%s' },
];
const DEFECTO = { motor: 'google', atajos: ATAJOS, sugerencias: false };
const normalizar = valor => `${modulo}.then(m => m.normalizarBuscador(${valor}))`;
const resolver = (texto, buscador = 'null') => `${modulo}.then(m => m.resolverConsulta(${JSON.stringify(texto)}, ${buscador === 'null' ? 'm.BUSCADOR' : buscador}))`;
const filas = pg => pg.ev(`[...document.querySelectorAll('#sugerencias .sugerencia')].map(s => [s.querySelector('.s-titulo').textContent, s.querySelector('.s-etiqueta').textContent, s.href])`);

export default {
  nombre: 'motores: motor configurable, atajos con ! y desplegable del buscador',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) Normalizar.
    for (const malo of ['undefined', 'null', "'x'"]) igual(await pg.ev(normalizar(malo)), DEFECTO, `normalizar(${malo})`);
    igual((await pg.ev(normalizar(`{ motor: 'altavista' }`))).motor, 'google', 'motor desconocido vuelve a google');
    const raros = [
      { clave: '', nombre: 'a', url: 'https://a.example.com/?q=%s' },
      { clave: 'A B', nombre: 'b', url: 'https://b.example.com/?q=%s' },
      { clave: 'sinpct', nombre: 'c', url: 'https://c.example.com/' },
      { clave: 'dos', nombre: 'd', url: 'https://d.example.com/?q=%s&r=%s' },
      { clave: 'js', nombre: 'e', url: 'javascript:alert(1)%s' },
      { clave: 'Y', nombre: 'Primero', url: 'https://uno.example.com/?q=%s' },
      { clave: 'y', nombre: 'Repetido', url: 'https://dos.example.com/?q=%s' },
    ];
    const r = await pg.ev(normalizar(`{ atajos: ${JSON.stringify(raros)} }`));
    igual(r.atajos, [{ clave: 'y', nombre: 'Primero', url: 'https://uno.example.com/?q=%s' }], 'atajos inválidos o repetidos se descartan y la clave va en minúsculas');
    const muchos = Array.from({ length: 25 }, (_, i) => ({ clave: `k${i}`, nombre: `K${i}`, url: `https://k${i}.example.com/?q=%s` }));
    igual((await pg.ev(normalizar(`{ atajos: ${JSON.stringify(muchos)} }`))).atajos.length, 20, 'como mucho 20 atajos');

    // (b) Resolver una consulta.
    let q = await pg.ev(resolver('!y gatos'));
    igual([q.q, q.destino.etiqueta, q.destino.url], ['gatos', 'YouTube', 'https://www.youtube.com/results?search_query=gatos'], '!y gatos');
    q = await pg.ev(resolver('!y gatos y perros & más #1'));
    igual(q.destino.url, 'https://www.youtube.com/results?search_query=gatos%20y%20perros%20%26%20m%C3%A1s%20%231', 'el texto va codificado');
    for (const texto of ['!hola mundo', '!', '!y', '!y ']) {
      q = await pg.ev(resolver(texto));
      igual([q.destino.etiqueta, q.q], ['Google', texto.trim()], `«${texto}» va al motor`);
    }
    q = await pg.ev(resolver('cómo hacer pan', `{ ...m.BUSCADOR, motor: 'duckduckgo' }`));
    igual(q.destino.url, 'https://duckduckgo.com/?q=c%C3%B3mo%20hacer%20pan', 'DuckDuckGo');

    // (c) El desplegable: !y gatos primero, Google detrás; con tus enlaces, siguen primero.
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('!y gatos');
    let f = await filas(pg);
    igual(f[0], ['Buscar «gatos» en YouTube', 'YouTube', 'https://www.youtube.com/results?search_query=gatos'], 'primera fila con !y');
    igual(f.slice(1).map(x => x[1]), ['Google', 'Google', 'Google', 'Google', 'Google'], 'las filas de Google siguen detrás');
    await pg.tecla('Escape');
    await pg.escribir('NAS Beta');
    f = await filas(pg);
    igual(f[0][0], 'NAS Beta', 'tus enlaces primero');
    igual(f.find(x => x[0].startsWith('Buscar')), ['Buscar «NAS Beta» en Google', 'Google', 'https://www.google.com/search?q=NAS%20Beta'], 'fila del motor');

    // (d) Con otro motor, su fila va primero y Modo IA sigue siendo de Google.
    pg = await abrir({ guardados: { opciones: { buscador: { motor: 'bing' } } } });
    await pg.esperar(300);
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pg.escribir('hola');
    f = await filas(pg);
    igual(f[0], ['Buscar «hola» en Bing', 'Bing', 'https://www.bing.com/search?q=hola'], 'fila de Bing');
    afirmar(f.some(x => x[0] === 'Preguntar al Modo IA' && x[1] === 'Google' && x[2].startsWith('https://www.google.com/search?udm=50')), 'Modo IA sigue siendo de Google');
    afirmar((await pg.ev(`document.getElementById('modo-ia').href`)).startsWith('https://www.google.com/search?udm=50'), '#modo-ia apunta a Google');
  },
};
