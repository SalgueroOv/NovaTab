// Ejecuta las pruebas de NovaTab en Chrome sin ventana.
//
//   node pruebas/ejecutar.mjs              todas
//   node pruebas/ejecutar.mjs rejilla      solo las que contienen «rejilla» en el nombre del archivo
//   node pruebas/ejecutar.mjs --sin-red    salta las que necesitan Internet
//
// Cada pruebas/*.prueba.mjs exporta { nombre, red?, ejecutar(abrir) } y lanza un Error si algo falla.
// Una prueba también falla si la página lanza excepciones. Sale con código 1 si alguna falla.
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Browser } from './lib/cdp.mjs';
import { crearAbrir, RAIZ } from './lib/util.mjs';
import { iniciarServidor } from './lib/servidor.mjs';

const dir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const sinRed = args.includes('--sin-red');
const filtro = args.find(a => !a.startsWith('--'));
const archivos = readdirSync(dir)
  .filter(f => f.endsWith('.prueba.mjs') && (!filtro || f.includes(filtro)))
  .sort();

const servidor = await iniciarServidor(RAIZ);
const navegador = await Browser.launch();
const abrirEn = crearAbrir(navegador, servidor.url);
let fallos = 0;
let pasadas = 0;
let saltadas = 0;

try {
  for (const archivo of archivos) {
    const { default: prueba } = await import(pathToFileURL(join(dir, archivo)).href);
    if (prueba.red && sinRed) {
      saltadas++;
      console.log(`- ${prueba.nombre} (saltada: necesita Internet)`);
      continue;
    }
    const abiertas = [];
    const abrir = async opciones => {
      const pagina = await abrirEn(opciones);
      abiertas.push(pagina);
      return pagina;
    };
    try {
      await prueba.ejecutar(abrir);
      const errores = abiertas.flatMap(a => a.errores);
      if (errores.length) throw new Error(`errores en la consola de la página: ${errores.join(' | ')}`);
      pasadas++;
      console.log(`✔ ${prueba.nombre}`);
    } catch (err) {
      fallos++;
      console.log(`✘ ${prueba.nombre}\n    ${err.message}`);
    } finally {
      for (const a of abiertas) await a.cerrar().catch(() => {});
    }
  }
} finally {
  await navegador.close();
  await servidor.cerrar();
}

console.log(`\n${pasadas} pasadas, ${fallos} fallidas${saltadas ? `, ${saltadas} saltadas` : ''}`);
process.exit(fallos ? 1 : 0);
