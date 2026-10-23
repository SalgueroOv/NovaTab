// Alt+1…Alt+9: los nueve primeros enlaces locales visibles, en el orden de la cuadrícula.
import { datos, gruposDe } from './datos.js';
import { visible } from './rejilla.js';
import { opciones } from './apariencia.js';

// Grupos de la zona local sin plegar (y sin los privados en modo reunión), por filas y luego columnas;
// los enlaces de cada grupo en su orden.
export function enlacesDeAtajo() {
  if (opciones.ocultos.der) return []; // la red local no se ve: sus enlaces tampoco cuentan
  return gruposDe('local', datos)
    .filter(g => visible(g) && !g.plegado)
    .sort((a, b) => (a.pos?.y ?? 0) - (b.pos?.y ?? 0) || (a.pos?.x ?? 0) - (b.pos?.x ?? 0))
    .flatMap(g => g.enlaces.map(enlace => ({ enlace, grupo: g })))
    .slice(0, 9);
}

// Abre una dirección en esta pestaña. Las pruebas la sustituyen con novatab.alIr para no salir de la página.
export function ir(url) {
  if (globalThis.novatab?.alIr) globalThis.novatab.alIr(url);
  else location.href = url;
}
