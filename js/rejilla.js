// La rejilla: bloques (grupos locales y widgets), alturas, huecos y colisiones.
import { $ } from './util.js';
import { ANCHO_NUEVO, COLUMNAS, datos, grupo, gruposDe } from './datos.js';
import { opciones } from './apariencia.js';
import { WIDGETS } from './widgets.js';

export const REJILLAS = { der: $('#rejilla'), izq: $('#rejilla-izq') };

// En la rejilla hay bloques: los grupos locales y los widgets.
// Un grupo ocupa tantas filas como enlaces más una para el título; un widget, las que se le den.

export const bloques = (d = datos) => [...gruposDe('local', d), ...d.widgets];
export const bloque = id => grupo(id) || datos.widgets.find(w => w.id === id);
export const panelDe = b => b.panel || 'der';
// En modo reunión los grupos privados no se pintan ni salen en el buscador (siguen ocupando su sitio).
export const visible = b => !(opciones.reunion && b.privado);
export const bloquesDe = (panel, d = datos) => bloques(d).filter(b => panelDe(b) === panel);
// Plegado, un bloque ocupa solo la fila del título.
// Las filas de contenido de un grupo según su vista (sin la fila del título): lista, una por enlace; compacta,
// dos enlaces por fila; iconos, un icono por cada 2 columnas de ancho y dos filas por fila de iconos.
export function filasDe(g) {
  const n = g.enlaces.length;
  if (g.vista === 'compacta') return Math.max(1, Math.ceil(n / 2));
  if (g.vista === 'iconos') return Math.max(1, Math.ceil(n / iconosPorFila(g.pos?.w ?? 6))) * 2;
  return Math.max(1, n);
}
export const iconosPorFila = w => Math.max(1, Math.floor(w / 2));
export const alto = b => b.plegado ? 1 : b.tipo ? b.pos.h : 1 + filasDe(b);

export const solapan = (a, b) =>
  a.pos.x < b.pos.x + b.pos.w && b.pos.x < a.pos.x + a.pos.w &&
  a.pos.y < b.pos.y + alto(b) && b.pos.y < a.pos.y + alto(a);

// Busca el primer hueco libre (de arriba abajo, de izquierda a derecha).
export function colocarSinPosicion(d) {
  for (const panel of Object.keys(COLUMNAS)) {
    const columnas = COLUMNAS[panel];
    const colocados = bloquesDe(panel, d).filter(b => b.pos);
    for (const g of bloquesDe(panel, d).filter(b => !b.pos)) {
      // En la izquierda un widget nuevo ocupa todo el ancho.
      const w = !g.tipo ? ANCHO_NUEVO : panel === 'izq' ? columnas : WIDGETS[g.tipo].w;
      buscarHueco:
      for (let y = 1; ; y++) {
        for (let x = 1; x <= columnas - w + 1; x++) {
          g.pos = g.tipo ? { x, y, w, h: WIDGETS[g.tipo].h } : { x, y, w };
          if (!colocados.some(o => solapan(o, g))) break buscarHueco;
        }
      }
      colocados.push(g);
    }
  }
}

// El grupo recién movido manda; los que pisa bajan justo por debajo de él (y así en cascada).
export function resolver(fijo) {
  for (const panel of Object.keys(COLUMNAS)) {
    const orden = bloquesDe(panel).sort((a, b) =>
      (b === fijo) - (a === fijo) || a.pos.y - b.pos.y || a.pos.x - b.pos.x);
    const colocados = [];
    for (const g of orden) {
      let pisa;
      while ((pisa = colocados.filter(o => solapan(o, g))).length) {
        g.pos.y = Math.max(...pisa.map(o => o.pos.y + alto(o)));
      }
      colocados.push(g);
    }
  }
}

export const rejillaActiva = () => matchMedia('(min-width: 1001px)').matches;
