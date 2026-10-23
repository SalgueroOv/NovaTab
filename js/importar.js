// Importar los marcadores de Chrome como grupos.
import { nuevoId, partes, dominio, urlSegura } from './util.js';
import { claveSitio } from './widgets.js';

const RAICES = ['Barra de marcadores', 'Otros marcadores', 'Marcadores móviles'];
const MAX_NOMBRE = 40;

// Localhost o una IPv4 de red privada: 10/8, 172.16/12, 192.168/16.
export function esLocal(url) {
  const { host } = partes(url);
  if (host === 'localhost') return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

// Aplana el árbol de getTree() en carpetas con sus enlaces propios (solo http y https). Las raíces
// son, por posición, la barra, «Otros marcadores» y los móviles; una carpeta sin enlaces no aparece.
export function carpetasDeArbol(arbol) {
  const carpetas = [];
  const recorrer = (nodo, nombre, esRaiz) => {
    const enlaces = (nodo.children || [])
      .filter(h => h.url && urlSegura(h.url))
      .map(h => ({ nombre: h.title || '', url: h.url }));
    if (enlaces.length) carpetas.push({ id: nodo.id, nombre, enlaces });
    for (const hijo of nodo.children || []) {
      if (!hijo.url) recorrer(hijo, esRaiz ? hijo.title : `${nombre} / ${hijo.title}`, false);
    }
  };
  (arbol[0]?.children || []).slice(0, RAICES.length).forEach((raiz, i) => recorrer(raiz, RAICES[i], true));
  return carpetas;
}

// Los grupos nuevos de las carpetas elegidas, sin los enlaces cuyo sitio (dominio y puerto) ya está
// en «guardados» o ya salió antes en esta importación. «omitidos» cuenta esos repetidos.
export function gruposDeCarpetas(carpetas, elegidas, guardados) {
  const vistos = new Set(guardados);
  let omitidos = 0;
  const grupos = [];
  for (const carpeta of carpetas.filter(c => elegidas.has(c.id))) {
    const enlaces = [];
    for (const e of carpeta.enlaces) {
      const clave = claveSitio(e.url);
      if (!clave || vistos.has(clave)) {
        omitidos++;
        continue;
      }
      vistos.add(clave);
      enlaces.push({ id: nuevoId(), nombre: e.nombre.trim() || dominio(e.url), url: e.url });
    }
    if (!enlaces.length) continue;
    const locales = carpeta.enlaces.filter(e => esLocal(e.url)).length;
    grupos.push({
      id: nuevoId(),
      nombre: carpeta.nombre.trim().slice(0, MAX_NOMBRE) || 'Sin nombre',
      zona: locales * 2 > carpeta.enlaces.length ? 'local' : 'online',
      color: '#8a8c92',
      privado: false,
      pos: null,
      enlaces,
    });
  }
  return { grupos, omitidos };
}
