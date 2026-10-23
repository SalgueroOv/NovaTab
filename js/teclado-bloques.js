// Mover y redimensionar grupos y widgets con el teclado, en modo edición: con el foco en la cabecera de un bloque,
// las flechas lo mueven una celda; Mayús + flechas cambian su ancho (y el alto de un widget); Alt + ← → pasa un
// widget al otro panel. Cada pulsación es un paso de deshacer y se anuncia para los lectores de pantalla.
import { $ } from './util.js';
import { ALTO_MAXIMO, ALTO_MINIMO, ANCHO_MINIMO, COLUMNAS, datos, grupo } from './datos.js';
import { colocarSinPosicion, panelDe } from './rejilla.js';
import { editando, guardarYPintar } from './edicion.js';
import { tituloWidget } from './widgets.js';

const anuncios = $('#anuncios');
const anunciar = texto => { anuncios.textContent = ''; setTimeout(() => { anuncios.textContent = texto; }, 30); };

const bloqueDe = id => grupo(id) ?? datos.widgets.find(w => w.id === id);
const nombreDe = b => (b.tipo ? tituloWidget(b) : b.nombre);

// Lo que se anuncia cuando la pulsación no se puede cumplir.
const SIN_ESPACIO = {
  ArrowLeft: 'a la izquierda',
  ArrowRight: 'a la derecha',
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
};

// Aplica la pulsación al bloque; devuelve un texto de error si no se puede, o null si se hizo.
function aplicar(b, ev) {
  const esWidget = !!b.tipo;
  const panel = panelDe(b);
  const columnas = COLUMNAS[panel];
  const dx = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
  const dy = ev.key === 'ArrowDown' ? 1 : ev.key === 'ArrowUp' ? -1 : 0;
  const { x, y, w } = b.pos;

  if (ev.altKey) {
    if (!esWidget || !dx) return 'solo un widget puede pasar a otro panel, con Alt y las flechas izquierda o derecha';
    const destino = dx > 0 ? 'der' : 'izq';
    if (panel === destino) return `ya está en el panel ${destino === 'der' ? 'derecho' : 'izquierdo'}`;
    b.panel = destino;
    b.pos = null;
    colocarSinPosicion(datos);
    return null;
  }
  if (ev.shiftKey) {
    if (dx) {
      const nuevo = w + dx;
      if (nuevo < ANCHO_MINIMO[panel]) return 'no se puede estrechar más';
      if (nuevo > columnas - x + 1) return 'no se puede ensanchar más';
      b.pos.w = nuevo;
      return null;
    }
    if (!esWidget) return 'el alto de un grupo depende de sus enlaces';
    const nuevo = b.pos.h + dy;
    if (nuevo < ALTO_MINIMO) return 'no se puede hacer más bajo';
    if (nuevo > ALTO_MAXIMO) return 'no se puede hacer más alto';
    b.pos.h = nuevo;
    return null;
  }
  if (x + dx < 1 || x + dx + w - 1 > columnas || y + dy < 1) return `no se puede mover más ${SIN_ESPACIO[ev.key]}`;
  b.pos.x = x + dx;
  b.pos.y = y + dy;
  return null;
}

document.addEventListener('keydown', async ev => {
  if (!editando || ev.ctrlKey || ev.metaKey || !SIN_ESPACIO[ev.key]) return;
  const cab = ev.target.closest?.('.grupo-cab, .widget-cab');
  if (!cab || ev.target !== cab) return; // un botón o un campo de dentro conserva sus propias flechas
  const id = cab.closest('.bloque')?.dataset.id;
  const b = id && bloqueDe(id);
  if (!b?.pos) return;
  ev.preventDefault();
  const error = aplicar(b, ev);
  if (error) {
    anunciar(`${nombreDe(b)}: ${error}`);
    return;
  }
  await guardarYPintar(b);
  // El repintado crea elementos nuevos: el foco vuelve a la cabecera del mismo bloque.
  document.querySelector(`.bloque[data-id="${CSS.escape(id)}"] .grupo-cab, .bloque[data-id="${CSS.escape(id)}"] .widget-cab`)?.focus();
  const p = b.pos;
  anunciar(`${nombreDe(b)}: columna ${p.x}, fila ${p.y}, ancho ${p.w}${b.tipo ? `, alto ${p.h}` : ''}`);
});
