// Temas: cada uno son tres colores (fondo, tinta y acento) y un modo; el resto de colores (superficies,
// líneas, textos secundarios) se deriva de ellos en style.css.

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

let propios = [];

export const todosLosTemas = () => [...TEMAS, ...propios];

// El tema con ese id, incluido o propio; si no existe (un tema propio borrado en otro equipo), Bosque.
export const buscarTema = id => todosLosTemas().find(t => t.id === id) || TEMAS[0];
