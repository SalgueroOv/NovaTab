// Motores de búsqueda y atajos con «!» (por ejemplo «!y gatos» busca en YouTube). Solo lógica: sin DOM.
import { urlSegura } from './util.js';

// «%s» es el sitio del texto buscado.
export const MOTORES = {
  google: { nombre: 'Google', url: 'https://www.google.com/search?q=%s' },
  duckduckgo: { nombre: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=%s' },
  bing: { nombre: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  perplexity: { nombre: 'Perplexity', url: 'https://www.perplexity.ai/search?q=%s' },
  chatgpt: { nombre: 'ChatGPT', url: 'https://chatgpt.com/?q=%s' },
};

export const ATAJOS = [
  { clave: 'y', nombre: 'YouTube', url: 'https://www.youtube.com/results?search_query=%s' },
  { clave: 'gh', nombre: 'GitHub', url: 'https://github.com/search?q=%s' },
  { clave: 'w', nombre: 'Wikipedia', url: 'https://es.wikipedia.org/w/index.php?search=%s' },
  { clave: 'm', nombre: 'Maps', url: 'https://www.google.com/maps/search/%s' },
];

// Sugerencias de Google: el permiso del sitio es opcional (se pide al activarlas).
export const ORIGEN_SUGERENCIAS = 'https://suggestqueries.google.com/*';
export const URL_SUGERENCIAS = 'https://suggestqueries.google.com/complete/search?client=firefox&q=';

export const BUSCADOR = { motor: 'google', atajos: ATAJOS, sugerencias: false };
export const MAX_ATAJOS = 20;
export const MAX_URL = 300;

const cuenta = (texto, parte) => texto.split(parte).length - 1;

// Un atajo bien formado, o null: clave de 1 a 10 caracteres a-z0-9, nombre y dirección http(s) de hasta 300 caracteres
// con un solo «%s» (que no esté en el sitio).
export function atajoValido(a) {
  if (!a || typeof a !== 'object') return null;
  const clave = typeof a.clave === 'string' ? a.clave.toLowerCase() : '';
  const nombre = typeof a.nombre === 'string' ? a.nombre.trim().slice(0, 30) : '';
  const url = typeof a.url === 'string' ? a.url.trim() : '';
  if (!/^[a-z0-9]{1,10}$/.test(clave) || !nombre) return null;
  if (url.length > MAX_URL || cuenta(url, '%s') !== 1 || !urlSegura(url.replace('%s', 'x'))) return null;
  // El texto buscado solo puede ir después del sitio: «https://banco.com%s» dejaría cambiar el dominio.
  if (new URL(url.replace('%s', 'x')).host !== new URL(url.replace('%s', 'y')).host) return null;
  return { clave, nombre, url };
}

// Lo que se lee de las opciones guardadas: lo inválido se sustituye o se descarta, nunca lanza.
export function normalizarBuscador(b) {
  const x = b && typeof b === 'object' ? b : {};
  const atajos = [];
  if (Array.isArray(x.atajos)) {
    for (const a of x.atajos) {
      const bueno = atajoValido(a);
      if (bueno && !atajos.some(o => o.clave === bueno.clave) && atajos.length < MAX_ATAJOS) atajos.push(bueno);
    }
  } else {
    atajos.push(...ATAJOS.map(a => ({ ...a })));
  }
  return {
    motor: MOTORES[x.motor] && Object.hasOwn(MOTORES, x.motor) ? x.motor : BUSCADOR.motor,
    atajos,
    sugerencias: typeof x.sugerencias === 'boolean' ? x.sugerencias : BUSCADOR.sugerencias,
  };
}

const rellenar = (plantilla, texto) => plantilla.replace('%s', () => encodeURIComponent(texto));

// Adónde va lo escrito: «!clave texto» con una clave que existe va a ese atajo; todo lo demás, al motor.
export function resolverConsulta(texto, buscador) {
  const t = String(texto).trim();
  const m = /^!(\S+)\s+(\S[\s\S]*)$/.exec(t);
  const atajo = m && buscador.atajos.find(a => a.clave === m[1].toLowerCase());
  if (atajo) {
    const resto = m[2].trim();
    return { q: resto, destino: { etiqueta: atajo.nombre, url: rellenar(atajo.url, resto) } };
  }
  const motor = MOTORES[buscador.motor] || MOTORES.google;
  return { q: t, destino: { etiqueta: motor.nombre, url: rellenar(motor.url, t) } };
}
