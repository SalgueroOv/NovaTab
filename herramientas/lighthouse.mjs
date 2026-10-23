// Lighthouse sobre newtab.html servida por HTTP local (no es una prueba de la suite: tarda y necesita Chrome).
//   cd herramientas && npm install && node lighthouse.mjs
// Escribe informe-lighthouse.json (ignorado por git) y sale con código 1 si la accesibilidad baja de 95.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { iniciarServidor } from '../pruebas/lib/servidor.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const servidor = await iniciarServidor(join(aqui, '..'));
const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] });
let salida = 0;
try {
  const r = await lighthouse(`${servidor.url}/newtab.html`, { port: chrome.port, onlyCategories: ['accessibility', 'best-practices'], output: 'json', logLevel: 'error' });
  writeFileSync(join(aqui, 'informe-lighthouse.json'), r.report);
  for (const [id, c] of Object.entries(r.lhr.categories)) console.log(`${id}: ${Math.round(c.score * 100)}`);
  const fallos = Object.values(r.lhr.audits).filter(a => a.score === 0 && a.scoreDisplayMode === 'binary');
  for (const a of fallos) console.log(`  ✘ ${a.id}: ${a.title}`);
  if (r.lhr.categories.accessibility.score < 0.95) salida = 1;
} finally {
  await chrome.kill();
  await servidor.cerrar();
}
process.exit(salida);
