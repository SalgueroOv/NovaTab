// El modelo de datos: constantes, el estado `datos` y su normalización.
import { $, limitar, nuevoId, urlSegura } from './util.js';
import { colocarSinPosicion } from './rejilla.js';
import { WIDGETS } from './widgets.js';
import { iconoValido } from './iconos.js';

export const CLAVE = 'datos';
export const VERSION = 4;
// Dos rejillas: la derecha (red local: grupos y widgets) y la izquierda (solo widgets).
export const COLUMNAS = { der: 12, izq: 6 };
export const ANCHO_MINIMO = { der: 4, izq: 2 };
export const ANCHO_NUEVO = 6;
export const ALTO_MINIMO = 3;
export const ALTO_MAXIMO = 40;
export const TITULOS = { local: 'Red local', online: 'Internet' };

export let datos = null;

// Los demás módulos no pueden reasignar `datos` (es una importación): lo cambian con ponerDatos.
export function ponerDatos(d) {
  datos = d;
}

// hDefecto solo para los widgets: los grupos calculan su alto por el número de enlaces.
export function posValida(p, hDefecto, panel = 'der') {
  if (!p) return null;
  const columnas = COLUMNAS[panel];
  const w = limitar(Math.round(p.w) || ANCHO_NUEVO, ANCHO_MINIMO[panel], columnas);
  const pos = {
    x: limitar(Math.round(p.x) || 1, 1, columnas - w + 1),
    y: Math.max(1, Math.round(p.y) || 1),
    w,
  };
  if (hDefecto) pos.h = limitar(Math.round(p.h) || hDefecto, ALTO_MINIMO, ALTO_MAXIMO);
  return pos;
}

export function normalizar(d) {
  if (!d || !Array.isArray(d.grupos)) throw new Error('formato no válido');
  const grupos = d.grupos.map(g => ({
    id: g.id || nuevoId(),
    nombre: String(g.nombre || 'Sin nombre'),
    zona: g.zona === 'online' ? 'online' : 'local',
    color: /^#[0-9a-f]{3,8}$/i.test(g.color) ? g.color : '#8a8c92',
    pos: g.zona === 'online' ? null : posValida(g.pos),
    plegado: !!g.plegado,
    privado: !!g.privado,
    // Solo enlaces http y https: un javascript: o data: importado o guardado se descarta.
    enlaces: (g.enlaces || []).filter(e => urlSegura(String(e?.url || ''))).map(e => ({
      id: e.id || nuevoId(),
      nombre: String(e.nombre || ''),
      url: String(e.url || ''),
      icono: iconoValido(e.icono),
    })),
  }));
  // Datos de la versión 1 (sin zonas): se añaden los sitios online por defecto.
  if ((d.version || 1) < 2 && !grupos.some(g => g.zona === 'online')) {
    grupos.push(...normalizar(DATOS_DEFECTO).grupos.filter(g => g.zona === 'online'));
  }
  const titulos = { ...TITULOS };
  for (const k of Object.keys(TITULOS)) {
    const t = String(d.titulos?.[k] ?? '').trim();
    if (t) titulos[k] = t.slice(0, 60);
  }
  const widgets = (Array.isArray(d.widgets) ? d.widgets : [])
    .filter(w => WIDGETS[w?.tipo])
    .map(w => {
      const panel = w.panel === 'izq' ? 'izq' : 'der';
      return {
        id: w.id || nuevoId(),
        tipo: w.tipo,
        panel,
        pos: posValida(w.pos, WIDGETS[w.tipo].h, panel),
        config: w.config && typeof w.config === 'object' ? w.config : {},
        plegado: !!w.plegado,
      };
    });
  const res = { version: VERSION, titulos, grupos, widgets };
  colocarSinPosicion(res);
  return res;
}

export const gruposDe = (zona, d = datos) => d.grupos.filter(g => g.zona === zona);
export const grupo = id => datos.grupos.find(g => g.id === id);
