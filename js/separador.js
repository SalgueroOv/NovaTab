// El separador entre los paneles: se arrastra para cambiar el ancho del izquierdo (25 a 50 %).
import { $ } from './util.js';
import { cambiarAnchoIzq, fusionarEco, guardarOpciones, opciones, pausarEcos, ponerAnchoIzqVivo } from './apariencia.js';

const separador = $('#separador-paneles');
const pagina = $('.pagina');
const izquierda = $('.izquierda');
let arrastrando = false;
let valorInicial = null;

// El ancho del panel izquierdo medido, en % del contenido de la página (con el ancho de siempre y una ventana
// estrecha, el mínimo de 400 px manda sobre el 36 %).
function porcentajeMedido() {
  const estilo = getComputedStyle(pagina);
  const ancho = pagina.getBoundingClientRect().width - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
  return Math.min(50, Math.max(25, Math.round(izquierda.getBoundingClientRect().width / ancho * 100)));
}

// Pegado al borde derecho del panel izquierdo, en el centro del hueco entre paneles.
function colocar() {
  const r = pagina.getBoundingClientRect();
  const hueco = parseFloat(getComputedStyle(pagina).columnGap) || 0;
  separador.style.left = `${izquierda.getBoundingClientRect().right + hueco / 2 - separador.offsetWidth / 2 - r.left}px`;
  if (opciones.anchoIzq === null) {
    const medido = porcentajeMedido();
    separador.setAttribute('aria-valuenow', String(medido));
    separador.setAttribute('aria-valuetext', `${medido} %`);
  }
}
new ResizeObserver(colocar).observe(pagina);
new ResizeObserver(colocar).observe(izquierda);
colocar();

// El porcentaje del ancho del contenido de la página que deja el borde del panel izquierdo bajo el puntero.
function porcentajeEn(x) {
  const estilo = getComputedStyle(pagina);
  const r = pagina.getBoundingClientRect();
  const ini = r.left + parseFloat(estilo.paddingLeft);
  const ancho = r.width - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
  const hueco = parseFloat(estilo.columnGap) || 0;
  return Math.min(50, Math.max(25, Math.round((x - ini - hueco / 2) / ancho * 100)));
}

separador.addEventListener('pointerdown', ev => {
  if (ev.button !== 0) return;
  ev.preventDefault();
  separador.setPointerCapture(ev.pointerId);
  arrastrando = true;
  valorInicial = opciones.anchoIzq;
  separador.classList.add('moviendo');
  pausarEcos(true);
});
separador.addEventListener('pointermove', ev => {
  if (arrastrando) ponerAnchoIzqVivo(porcentajeEn(ev.clientX));
});
function soltar() {
  if (!arrastrando) return;
  arrastrando = false;
  separador.classList.remove('moviendo');
  pausarEcos(false);
  if (opciones.anchoIzq !== valorInicial) guardarOpciones(); // un simple clic no escribe nada
  else fusionarEco(); // pero sí aplica lo que llegó de otra pestaña mientras tanto
}
separador.addEventListener('pointerup', soltar);
separador.addEventListener('pointercancel', soltar);

separador.addEventListener('keydown', ev => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(ev.key)) return;
  ev.preventDefault();
  const actual = opciones.anchoIzq ?? porcentajeMedido();
  const nuevo = ev.key === 'Home' ? 25 : ev.key === 'End' ? 50 : actual + (ev.key === 'ArrowRight' ? 1 : -1);
  cambiarAnchoIzq(Math.min(50, Math.max(25, nuevo)), true);
});
separador.addEventListener('dblclick', () => cambiarAnchoIzq(null));
