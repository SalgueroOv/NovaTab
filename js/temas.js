// Temas: cada uno son tres colores (fondo, tinta y acento) y un modo; el resto de colores (superficies,
// líneas, textos secundarios) se deriva de ellos en style.css. Los temas propios del usuario (fondo y
// acento) se guardan en «temas-propios», comunes a todos los perfiles.
import { escribir, leer, recordar } from './almacen.js';

export const CLAVE_TEMAS_PROPIOS = 'temas-propios';
export const MAX_TEMAS_PROPIOS = 12;
export const MAX_NOMBRE_TEMA = 20;

export const TEMAS = [
  { id: 'bosque', nombre: 'Bosque', modo: 'oscuro', bg: '#18221d', ink: '#e3ece5', acento: '#a8d672' },
  { id: 'noche', nombre: 'Noche', modo: 'oscuro', bg: '#111316', ink: '#e6eaf0', acento: '#f2b35b' },
  { id: 'medianoche', nombre: 'Medianoche', modo: 'oscuro', bg: '#14171c', ink: '#e4e9f1', acento: '#7fb0e8' },
  { id: 'grafito', nombre: 'Grafito', modo: 'oscuro', bg: '#1b1b1d', ink: '#ebebed', acento: '#d6b25e' },
  { id: 'carbon', nombre: 'Carbón', modo: 'oscuro', bg: '#18181b', ink: '#ececec', acento: '#ff7a45' },
  { id: 'abismo', nombre: 'Abismo', modo: 'oscuro', bg: '#0b191d', ink: '#dcecef', acento: '#4fd1c5' },
  { id: 'papel', nombre: 'Papel', modo: 'claro', bg: '#f5f0e6', ink: '#1d1c19', acento: '#2a4fb0' },
  { id: 'glaciar', nombre: 'Glaciar', modo: 'claro', bg: '#eaf2f6', ink: '#0f2029', acento: '#0a7099' },
  { id: 'niebla', nombre: 'Niebla', modo: 'claro', bg: '#eef1f5', ink: '#18202b', acento: '#3d6a9e' },
  { id: 'menta', nombre: 'Menta', modo: 'claro', bg: '#eef6f2', ink: '#122219', acento: '#1b7d4c' },
  { id: 'rosa', nombre: 'Rosa', modo: 'claro', bg: '#fbf1f2', ink: '#2a1418', acento: '#bd2d57' },
];

// Luminosidad relativa de un color #rrggbb (0 negro, 1 blanco).
export function luminosidad(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Texto oscuro o claro, el que dé más contraste con el acento (luminosidad del #1f1f1f: 0,0137).
export function sobreAcento(hex) {
  const l = luminosidad(hex);
  return (l + 0.05) / 0.0637 > 1.05 / (l + 0.05) ? '#1f1f1f' : '#ffffff';
}

// Mezcla dos colores #rrggbb canal a canal (k = 0 da a, k = 1 da b).
function mezclar(a, b, k) {
  const canal = (hex, i) => parseInt(hex.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map(i => Math.round(canal(a, i) * (1 - k) + canal(b, i) * k).toString(16).padStart(2, '0')).join('');
}

// Por encima de esta luminosidad el texto oscuro contrasta más que el claro (el mismo cruce que sobreAcento).
export const CRUCE_LUMINOSIDAD = 0.18;

// Un tema completo a partir de su fondo y su acento: el modo y la tinta salen del fondo.
export function temaDesde(nombre, bg, acento, id) {
  const modo = luminosidad(bg) > CRUCE_LUMINOSIDAD ? 'claro' : 'oscuro';
  const ink = modo === 'claro' ? mezclar(bg, '#000000', 0.88) : mezclar(bg, '#ffffff', 0.9);
  return { id, nombre, modo, bg, ink, acento, propio: true };
}

const HEX = /^#[0-9a-f]{6}$/i;
const ID_PROPIO = /^propio-[a-z0-9]{4,12}$/;

// La lista guardada, sin nada inválido: ids bien formados y sin repetir, nombre de 1 a 20 caracteres,
// colores #rrggbb, como mucho doce. Lo que no es una lista da una lista vacía.
export function normalizarTemasPropios(lista) {
  if (!Array.isArray(lista)) return [];
  const vistos = new Set();
  const temas = [];
  for (const t of lista) {
    if (!t || typeof t !== 'object' || typeof t.id !== 'string' || !ID_PROPIO.test(t.id) || vistos.has(t.id)) continue;
    const nombre = typeof t.nombre === 'string' ? t.nombre.trim() : '';
    const color = c => typeof c === 'string' && HEX.test(c);
    if (!nombre || nombre.length > MAX_NOMBRE_TEMA || !color(t.bg) || !color(t.acento)) continue;
    vistos.add(t.id);
    temas.push(temaDesde(nombre, t.bg.toLowerCase(), t.acento.toLowerCase(), t.id));
    if (temas.length === MAX_TEMAS_PROPIOS) break;
  }
  return temas;
}

let propios = [];
export const temasPropios = () => propios;
export const ponerTemasPropios = lista => { propios = lista; };

export async function leerTemasPropios() {
  ponerTemasPropios(normalizarTemasPropios(await leer(CLAVE_TEMAS_PROPIOS)));
  return propios;
}

// Se guardan solo los datos (lo derivado se rehace al leer); se recuerda antes para reconocer su eco.
export async function guardarTemasPropios(lista) {
  const valor = lista.map(({ id, nombre, bg, acento }) => ({ id, nombre, bg, acento }));
  recordar(CLAVE_TEMAS_PROPIOS, valor);
  await escribir(CLAVE_TEMAS_PROPIOS, valor);
}

// Un fondo de tono medio no deja buen contraste ni con texto claro ni con oscuro (sobre todo el secundario).
export const fondoDeTonoMedio = bg => { const l = luminosidad(bg); return l > 0.08 && l < 0.35; };

export const nuevoIdTema = () => `propio-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

export const todosLosTemas = () => [...TEMAS, ...propios];

// El tema con ese id, incluido o propio; si no existe (un tema propio borrado en otro equipo), Bosque.
export const buscarTema = id => todosLosTemas().find(t => t.id === id) || TEMAS[0];
