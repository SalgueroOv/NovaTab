// Atajos de teclado: Alt+1…Alt+9 para los primeros enlaces locales.
import { $, enCampoDeTexto } from './util.js';
import { enlacesDeAtajo, ir } from './atajos.js';
import { arrastre } from './edicion.js';

document.addEventListener('keydown', ev => {
  if (!ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
  const m = /^Digit([1-9])$/.exec(ev.code);
  if (!m || $('dialog[open]') || arrastre || enCampoDeTexto(ev.target)) return;
  const destino = enlacesDeAtajo()[Number(m[1]) - 1];
  if (!destino) return;
  ev.preventDefault();
  ir(destino.enlace.url);
});
