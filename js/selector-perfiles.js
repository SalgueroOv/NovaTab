// El selector de perfiles junto al título del panel derecho: cambiar, crear, duplicar, renombrar y borrar.
import { $, avisar, crear, svg } from './util.js';
import { abrirDialogo } from './edicion.js';
import { MAX_PERFILES, esDemo, perfilActivo, perfilesDeLaLista, perfilesListos } from './perfiles.js';
import { alternarDemo, borrarPerfil, cambiarPerfil, crearPerfil, renombrarPerfil } from './perfiles-ops.js';

const boton = $('#btn-perfil');
const menu = $('#menu-perfiles');

const actual = () => perfilesDeLaLista().find(p => p.id === perfilActivo());
const elementos = () => [...menu.querySelectorAll('[role^="menuitem"]')];

// El ojo (modo reunión): pasa al perfil Demo y vuelve al de antes.
const ojo = $('#btn-reunion');
function pintarOjo() {
  ojo.disabled = !perfilesListos(); // sin migrar (o sin terminar de cargar) no se puede cambiar de perfil
  const demo = esDemo();
  const volver = perfilesDeLaLista().find(p => !p.demo)?.nombre ?? '';
  ojo.setAttribute('aria-pressed', String(demo));
  ojo.title = demo ? `Salir del modo reunión: volver a ${volver}` : 'Modo reunión: pasar al perfil Demo (sin los grupos privados)';
  ojo.setAttribute('aria-label', ojo.title);
  ojo.innerHTML = svg(demo ? 'ojoTachado' : 'ojo');
}
ojo.addEventListener('click', () => alternarDemo().catch(err => avisar(err.message)));

function pintar() {
  pintarOjo();
  boton.hidden = !perfilesListos();
  const lista = perfilesDeLaLista();
  const act = actual();
  boton.replaceChildren(crear('span', 'nombre-perfil', act?.nombre ?? ''), ' ▾');
  boton.title = `Perfil: ${act?.nombre ?? ''}`;
  const filas = lista.map(p => {
    const b = crear('button', null, p.nombre);
    b.type = 'button';
    b.setAttribute('role', 'menuitemradio');
    b.setAttribute('aria-checked', String(p.id === perfilActivo()));
    b.title = p.nombre;
    b.addEventListener('click', () => { cerrar(); cambiarPerfil(p.id).catch(err => avisar(err.message)); });
    return b;
  });
  const accion = (id, texto, fn) => {
    const b = crear('button', null, texto);
    b.type = 'button';
    b.dataset.accionPerfil = id;
    b.setAttribute('role', 'menuitem');
    b.addEventListener('click', () => { cerrar(); fn(); });
    return b;
  };
  const acciones = [accion('nuevo', 'Nuevo perfil…', nuevo), accion('duplicar', 'Duplicar este perfil…', duplicar), accion('renombrar', 'Renombrar…', renombrar)];
  if (lista.length > 1) acciones.push(accion('borrar', 'Borrar…', borrar));
  menu.replaceChildren(...filas, crear('div', 'separador'), ...acciones);
}

function abrir() {
  menu.hidden = false;
  boton.setAttribute('aria-expanded', 'true');
  (menu.querySelector('[aria-checked="true"]') ?? elementos()[0])?.focus();
}

function cerrar(devolverFoco = false) {
  menu.hidden = true;
  boton.setAttribute('aria-expanded', 'false');
  if (devolverFoco) boton.focus();
}

boton.addEventListener('click', () => (menu.hidden ? abrir() : cerrar()));
boton.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown' && menu.hidden) {
    ev.preventDefault();
    abrir();
  }
});
menu.addEventListener('keydown', ev => {
  const lista = elementos();
  const i = lista.indexOf(document.activeElement);
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    lista[(i + (ev.key === 'ArrowDown' ? 1 : -1) + lista.length) % lista.length]?.focus();
  } else if (ev.key === 'Home' || ev.key === 'End') {
    ev.preventDefault();
    lista[ev.key === 'Home' ? 0 : lista.length - 1]?.focus();
  } else if (ev.key === 'Escape') {
    ev.preventDefault();
    cerrar(true);
  } else if (ev.key === 'Tab') {
    cerrar();
  }
});
document.addEventListener('click', ev => {
  if (!menu.hidden && !ev.target.closest('.selector-perfil')) cerrar();
});

// ---------- Acciones ----------

function pedirNombre(titulo, nombre, nuevo) {
  const dlg = $('#dlg-perfil');
  dlg.querySelector('[data-solo-nuevo]').hidden = !nuevo;
  dlg.querySelector('h2').textContent = titulo;
  return abrirDialogo(dlg, { nombre, duplicar: false });
}

async function crearYCambiar(nombre, desde) {
  try {
    const { id } = await crearPerfil(nombre, { desde });
    await cambiarPerfil(id);
  } catch (err) {
    avisar(err.message);
  }
}

async function nuevo() {
  if (perfilesDeLaLista().length >= MAX_PERFILES) return avisar(`Máximo ${MAX_PERFILES} perfiles`);
  const r = await pedirNombre('Nuevo perfil', '', true);
  if (r) await crearYCambiar(r.nombre, r.duplicar === 'on' ? perfilActivo() : null);
}

async function duplicar() {
  if (perfilesDeLaLista().length >= MAX_PERFILES) return avisar(`Máximo ${MAX_PERFILES} perfiles`);
  const r = await pedirNombre('Duplicar este perfil', `${actual()?.nombre ?? ''} (copia)`, false);
  if (r) await crearYCambiar(r.nombre, perfilActivo());
}

async function renombrar() {
  const r = await pedirNombre('Renombrar el perfil', actual()?.nombre ?? '', false);
  if (!r) return;
  try {
    await renombrarPerfil(perfilActivo(), r.nombre);
  } catch (err) {
    avisar(err.message);
  }
}

async function borrar() {
  if (!confirm(`¿Borrar el perfil «${actual()?.nombre}» y todo su contenido?`)) return;
  try {
    await borrarPerfil(perfilActivo());
  } catch (err) {
    avisar(err.message);
  }
}

// El botón y el menú siguen a los cambios de perfil y a los del registro (renombrar o borrar en otro equipo).
document.addEventListener('novatab:perfil', pintar);
document.addEventListener('novatab:perfiles', pintar);
pintar();
