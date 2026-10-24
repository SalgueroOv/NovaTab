// Ejecuta las pruebas de NovaTab en Chrome sin ventana.
//
//   node pruebas/ejecutar.mjs              todas
//   node pruebas/ejecutar.mjs rejilla      solo las que contienen «rejilla» en el nombre del archivo
//   node pruebas/ejecutar.mjs --sin-red    salta las que necesitan Internet
//   node pruebas/ejecutar.mjs --hilos=1    una a una (por defecto, 4 a la vez, cada una en su propio Chrome)
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
const hilos = Math.max(1, Number(args.find(a => a.startsWith('--hilos='))?.slice(8)) || 4);
const archivos = readdirSync(dir)
  .filter(f => f.endsWith('.prueba.mjs') && (!filtro || f.includes(filtro)))
  .sort();

const servidor = await iniciarServidor(RAIZ);
let fallos = 0;
let pasadas = 0;
let saltadas = 0;
const cola = [...archivos];
const fallidas = []; // [archivo, nombre, mensaje]: con varios hilos se repiten solas al final

// Cada hilo tiene su Chrome (el foco y los tiempos de una prueba no dependen de las demás) y va tomando pruebas
// de la cola. Cada resultado se escribe entero de una vez para que no se mezcle con los de otro hilo.
async function hilo(lista = cola, alFallar = (archivo, nombre, mensaje) => fallidas.push([archivo, nombre, mensaje])) {
  const navegador = await Browser.launch();
  const abrirEn = crearAbrir(navegador, servidor.url);
  try {
    let archivo;
    while ((archivo = lista.shift())) {
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
        const resultado = await prueba.ejecutar(abrir);
        // Una prueba puede devolver «saltada: motivo» (por ejemplo, si faltan herramientas que no son obligatorias).
        if (typeof resultado === 'string' && resultado.startsWith('saltada')) {
          saltadas++;
          console.log(`- ${prueba.nombre} (${resultado})`);
          continue;
        }
        const errores = abiertas.flatMap(a => a.errores);
        if (errores.length) throw new Error(`errores en la consola de la página: ${errores.join(' | ')}`);
        pasadas++;
        console.log(`✔ ${prueba.nombre}`);
      } catch (err) {
        alFallar(archivo, prueba.nombre, err.message);
      } finally {
        for (const a of abiertas) await a.cerrar().catch(() => {});
      }
    }
  } finally {
    await navegador.close();
  }
}

try {
  await Promise.all(Array.from({ length: Math.min(hilos, archivos.length) }, () => hilo()));
  // Con varias a la vez, una prueba que mide tiempos puede fallar por la carga: cada fallida se repite sola. Si
  // pasa, cuenta como pasada pero se dice; si vuelve a fallar, es un fallo de verdad.
  const fallo = (archivo, nombre, mensaje) => {
    fallos++;
    console.log(`✘ ${nombre}  [${archivo}]\n    ${mensaje}`);
  };
  for (const [archivo, , mensaje] of hilos > 1 ? fallidas.splice(0) : []) {
    const antes = pasadas;
    await hilo([archivo], fallo);
    if (pasadas > antes) console.log(`  (falló con otras a la vez: «${mensaje}»; sola pasa)`);
  }
  for (const f of fallidas) fallo(...f);
} finally {
  await servidor.cerrar();
}

console.log(`\n${pasadas} pasadas, ${fallos} fallidas${saltadas ? `, ${saltadas} saltadas` : ''}`);
process.exit(fallos ? 1 : 0);
