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

const ajustarAlto = () => { isla.style.height = `${capas[actual].scrollHeight}px`; };

export function ponerCapa(capa) {
  actual = capa;
  for (const [nombre, el] of Object.entries(capas)) el.hidden = nombre !== capa;
  document.body.classList.toggle('con-velo', capa === 'perfiles');
  ajustarAlto();
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
