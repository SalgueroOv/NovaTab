// Servidor estático mínimo para las pruebas: los módulos ES no cargan desde file://.
// Sirve la raíz del repositorio en 127.0.0.1 con un puerto libre.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname, sep } from 'node:path';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
};

export function iniciarServidor(raiz) {
  const servidor = createServer(async (pet, res) => {
    const ruta = normalize(join(raiz, decodeURIComponent(new URL(pet.url, 'http://x').pathname)));
    if (ruta !== raiz && !ruta.startsWith(raiz + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const cuerpo = await readFile(ruta);
      res.writeHead(200, { 'Content-Type': TIPOS[extname(ruta)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(cuerpo);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise(resolve => {
    servidor.listen(0, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${servidor.address().port}`,
      cerrar: () => new Promise(r => servidor.close(() => r())),
    }));
  });
}
