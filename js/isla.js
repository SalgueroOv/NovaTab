// La isla: el mando único encima del panel derecho (o del izquierdo, si el derecho está oculto). Tiene tres
// capas, la barra, el menú de perfiles y la barra de edición, y su alto sigue a la que se ve: crece hacia
// abajo por encima del contenido sin empujarlo.
import { $, svg } from './util.js';
import { abrirPaleta } from './comandos.js';
import { perfilActivo, perfilesDeLaLista } from './perfiles.js';

const isla = $('#isla');
const capas = { barra: $('#isla .capa-barra'), perfiles: $('#menu-perfiles'), edicion: $('#isla .capa-edicion') };
let actual = 'barra';

export const capaActual = () => actual;

// El alto de la capa tal como se ve (el menú de perfiles tiene un tope y se desplaza por dentro).
const ajustarAlto = () => { isla.style.height = `${capas[actual].offsetHeight}px`; };

// El menú de perfiles mide al menos 560 px (o la ventana menos 24 px): si la isla es más estrecha, crece
// centrada sobre ella sin salirse de la ventana.
function ajustarAncho() {
  isla.style.left = isla.style.width = '';
  if (actual !== 'perfiles') return;
  const r = isla.getBoundingClientRect();
  const ancho = Math.min(560, innerWidth - 24);
  if (r.width >= ancho) return;
  const izquierda = Math.min(Math.max(12, r.left - (ancho - r.width) / 2), innerWidth - 12 - ancho);
  isla.style.left = `${izquierda - r.left}px`;
  isla.style.width = `${ancho}px`;
}

export function ponerCapa(capa) {
  actual = capa;
  for (const [nombre, el] of Object.entries(capas)) el.hidden = nombre !== capa;
  document.body.classList.toggle('con-velo', capa === 'perfiles');
  ajustarAncho();
  ajustarAlto();
  document.dispatchEvent(new CustomEvent('novatab:capa', { detail: { capa } }));
}

const observador = new ResizeObserver(ajustarAlto);
Object.values(capas).forEach(c => observador.observe(c));

// La barra de edición dice qué perfil se edita (el nombre como texto, nunca como HTML).
function pintarEditando() {
  const nombre = document.createElement('b');
  nombre.textContent = perfilesDeLaLista().find(p => p.id === perfilActivo())?.nombre ?? '';
  $('#editando-txt').replaceChildren('Editando ', nombre);
}

// El modo edición cambia la barra por la de edición (y al salir, al revés).
document.addEventListener('novatab:edicion', ev => {
  pintarEditando();
  ponerCapa(ev.detail.activo ? 'edicion' : 'barra');
});
document.addEventListener('novatab:perfil', pintarEditando);

$('#ico-paleta').outerHTML = svg('buscar');
$('#btn-paleta').addEventListener('click', () => abrirPaleta());

ponerCapa('barra');
