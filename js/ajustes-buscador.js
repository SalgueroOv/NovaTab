// La pestaña «Buscador» del panel de personalizar: motor y atajos con «!».
import { $, crear } from './util.js';
import { opciones, cambiarBuscador } from './apariencia.js';
import { ATAJOS, MOTORES, atajoValido } from './motores.js';

const lista = $('#lista-atajos');

$('#motor-buscador').append(...Object.entries(MOTORES).map(([id, m]) => {
  const o = crear('option', null, m.nombre);
  o.value = id;
  return o;
}));
$('#motor-buscador').addEventListener('change', ev => cambiarBuscador({ motor: ev.target.value }));

function campo(nombre, valor, etiqueta, maximo) {
  const i = crear('input');
  i.type = 'text';
  i.value = valor;
  i.dataset.campo = nombre;
  i.placeholder = etiqueta;
  i.setAttribute('aria-label', etiqueta);
  i.spellcheck = false;
  if (maximo) i.maxLength = maximo;
  i.addEventListener('input', alEscribir);
  return i;
}

function fila(a) {
  const li = crear('li');
  const borrar = crear('button', 'borrar-atajo', '×');
  borrar.type = 'button';
  borrar.dataset.accion = 'borrar';
  borrar.title = 'Borrar atajo';
  borrar.setAttribute('aria-label', 'Borrar atajo');
  borrar.addEventListener('click', () => {
    li.remove();
    guardarFilas();
  });
  li.append(campo('clave', a.clave, 'clave', 10), campo('nombre', a.nombre, 'Nombre', 30), borrar, campo('url', a.url, 'https://…?q=%s'));
  return li;
}

// Pinta el motor y los atajos guardados (los borradores sin terminar se pierden al volver a pintar).
function pintar() {
  $('#motor-buscador').value = opciones.buscador.motor;
  lista.replaceChildren(...opciones.buscador.atajos.map(fila));
}

const leerFila = li => ({ clave: li.querySelector('[data-campo="clave"]').value.trim(), nombre: li.querySelector('[data-campo="nombre"]').value, url: li.querySelector('[data-campo="url"]').value });

// Marca las filas inválidas y guarda las demás.
function guardarFilas(diferir = false) {
  const vistas = new Set();
  const validas = [];
  for (const li of lista.children) {
    const a = atajoValido(leerFila(li));
    let error = '';
    if (!a) error = 'Clave de 1 a 10 letras o números, un nombre, y una dirección http o https con un solo %s';
    else if (vistas.has(a.clave)) error = 'Esa clave ya la usa otro atajo';
    else {
      vistas.add(a.clave);
      validas.push(a);
    }
    for (const c of li.querySelectorAll('input')) c.setAttribute('aria-invalid', String(!!error));
    li.querySelector('.ayuda-fila')?.remove();
    if (error) li.append(crear('p', 'ayuda-fila', error));
  }
  cambiarBuscador({ atajos: validas }, diferir);
}

function alEscribir() {
  guardarFilas(true);
}

$('#atajo-nuevo').addEventListener('click', () => {
  lista.append(fila({ clave: '', nombre: '', url: '' }));
  lista.lastElementChild.querySelector('input').focus(); // se valida cuando se escribe en ella
});
$('#atajos-restaurar').addEventListener('click', () => {
  cambiarBuscador({ atajos: ATAJOS });
  pintar();
});

// Se pinta al abrir la pestaña.
document.querySelector('#panel-tema [data-pestana="buscador"]').addEventListener('click', pintar);
