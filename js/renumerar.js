// Ids nuevos para una copia de los datos de un perfil: dos perfiles no pueden compartir ids de grupos ni de widgets
// (comparten las claves «enlaces:<id>», «notas:<id>», «tareas:<id>»…).
import { nuevoId } from './util.js';

// «d» es la estructura con los enlaces dentro de cada grupo. Devuelve los datos nuevos y cómo cambiaron los ids de
// los grupos y de los widgets (viejo → nuevo). Los widgets de servicios que vigilan grupos concretos se traducen.
export function renumerar(d, { sinPrivados = false, tipos = null } = {}) {
  const grupos = new Map();
  const widgets = new Map();
  const gs = d.grupos.filter(g => !(sinPrivados && g.privado)).map(g => {
    const id = nuevoId();
    grupos.set(String(g.id), id);
    return { ...g, id, enlaces: g.enlaces.map(e => ({ ...e, id: nuevoId() })) };
  });
  const ws = d.widgets.filter(w => !tipos || tipos.includes(w.tipo)).map(w => {
    const id = nuevoId();
    widgets.set(String(w.id), id);
    const config = w.tipo === 'servicios' && Array.isArray(w.config?.grupos)
      ? { ...w.config, grupos: w.config.grupos.map(g => grupos.get(String(g))).filter(Boolean) }
      : w.config;
    return { ...w, id, config };
  });
  const { ajenos, ...resto } = d;
  return { datos: { ...resto, grupos: gs, widgets: ws }, grupos, widgets, omitidos: d.grupos.length - gs.length };
}

// Un mapa { idViejoDeWidget: valor } con los ids de widget nuevos (los que no cambiaron de id se descartan).
export function trasladarPorWidget(mapa, widgets) {
  if (!mapa || typeof mapa !== 'object') return {};
  return Object.fromEntries(Object.entries(mapa).filter(([id]) => widgets.has(id)).map(([id, v]) => [widgets.get(id), v]));
}
