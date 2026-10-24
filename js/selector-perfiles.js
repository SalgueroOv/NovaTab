// El selector de perfiles de la isla: el chip con el perfil activo y su terreno, y la capa con una carta por
// perfil (su terreno en su tema) para cambiar, crear, duplicar, renombrar y borrar.
import { $, avisar, crear, svg } from './util.js';
import { abrirDialogo } from './edicion.js';
import { MAX_PERFILES, claveAspecto, esDemo, perfilActivo, perfilesDeLaLista, perfilesListos } from './perfiles.js';
import { leer } from './almacen.js';
import { apariencia, normalizarApariencia, panelTema, temaActual } from './apariencia.js';
import { FONDOS } from './fondos.js';
import { buscarTema } from './temas.js';
import { miniatura } from './terreno.js';
import { alternarDemo, borrarPerfil, cambiarPerfil, crearPerfil, renombrarPerfil } from './perfiles-ops.js';
import { capaActual, ponerCapa } from './isla.js';

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
  const focoEnMenu = menu.contains(document.activeElement);
  pintarOjo();
  boton.hidden = !perfilesListos();
  const lista = perfilesDeLaLista();
  const act = actual();
  const mini = crear('canvas', 'mini-perfil');
  mini.setAttribute('aria-hidden', 'true');
  const flecha = crear('span', 'flecha-perfil');
  flecha.setAttribute('aria-hidden', 'true');
  flecha.innerHTML = svg('desplegar');
  boton.replaceChildren(mini, crear('span', 'nombre-perfil', act?.nombre ?? ''), flecha);
  boton.title = `Perfil: ${act?.nombre ?? ''} (Alt+P, el siguiente)`;
  requestAnimationFrame(() => pintarMini(mini, perfilActivo()));
  // Cada carta: su terreno en miniatura y su nombre (el tema y el fondo, en data-info, los pinta el CSS).
  const filas = lista.map(p => {
    const b = crear('button', 'carta-perfil');
    b.type = 'button';
    b.setAttribute('role', 'menuitemradio');
    b.setAttribute('aria-checked', String(p.id === perfilActivo()));
    b.title = p.nombre;
    b.dataset.perfil = p.id;
    const lienzo = crear('canvas', 'mini-terreno');
    lienzo.setAttribute('aria-hidden', 'true');
    b.append(lienzo, crear('span', 'nombre', p.nombre));
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
  const cartas = crear('div', 'cartas-perfil');
  cartas.append(...filas);
  const pie = crear('div', 'acciones-perfil');
  pie.append(...acciones);
  menu.replaceChildren(crear('p', 'perfiles-cab', 'Perfiles'), cartas, pie);
  if (capaActual() === 'perfiles') {
    pintarCartas();
    // Las cartas se acaban de rehacer (otro perfil, por Alt+P o desde otra pestaña): el foco no se pierde.
    if (focoEnMenu) menu.querySelector('[aria-checked="true"]')?.focus();
  }
}

// El menú es una capa de la isla: abrirlo y cerrarlo es cambiar de capa.
function abrir() {
  panelTema.hidden = true; // Personalizar y el menú no se pisan
  $('#btn-tema').setAttribute('aria-expanded', 'false');
  ponerCapa('perfiles');
  pintarCartas();
  boton.setAttribute('aria-expanded', 'true');
  (menu.querySelector('[aria-checked="true"]') ?? elementos()[0])?.focus();
}

function cerrar(devolverFoco = false) {
  if (capaActual() === 'perfiles') ponerCapa('barra');
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
  if (!menu.hidden && !ev.target.closest('#isla')) cerrar();
});

// ---------- Miniaturas del terreno ----------

// El aspecto de un perfil: el activo, el que hay en memoria; los demás, el guardado (normalizado).
async function aspectoDe(id) {
  if (id === perfilActivo()) return { tema: temaActual, apariencia };
  const guardado = await leer(claveAspecto(id)).catch(() => null);
  return { tema: guardado?.tema, apariencia: normalizarApariencia(guardado?.apariencia) };
}

async function pintarMini(lienzo, id) {
  const { tema: idTema, apariencia: a } = await aspectoDe(id);
  const t = buscarTema(idTema);
  lienzo.closest('.carta-perfil')?.setAttribute('data-info', `${t.nombre} · ${FONDOS[a.fondo]?.nombre ?? (a.fondo === 'imagen' ? 'Imagen' : 'Liso')}`);
  miniatura(lienzo, {
    semilla: a.semilla ?? id, estilo: FONDOS[a.fondo] ? a.fondo : 'curvas', densidad: a.densidadFondo, relieve: a.relieve,
    tema: { bg: t.bg, ink: t.ink, acento: a.acento ?? t.acento, modo: t.modo },
  });
}

// Se pintan cuando la capa ya se ve (antes no miden nada).
function pintarCartas() {
  requestAnimationFrame(() => {
    for (const b of menu.querySelectorAll('.carta-perfil')) pintarMini(b.querySelector('canvas'), b.dataset.perfil);
  });
}

$('#velo-isla').addEventListener('click', () => cerrar(true));

// La miniatura del chip: se repinta al volver a la barra (oculta no mide nada) y cuando cambia el aspecto.
const pintarChip = () => { const c = boton.querySelector('canvas.mini-perfil'); if (c) requestAnimationFrame(() => pintarMini(c, perfilActivo())); };
document.addEventListener('novatab:capa', ev => { if (ev.detail.capa === 'barra') pintarChip(); });
document.addEventListener('novatab:apariencia', pintarChip);
document.addEventListener('novatab:tema', pintarChip);

// Esc cierra el menú aunque el foco no esté en él; abrir la paleta, también.
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && capaActual() === 'perfiles' && !document.querySelector('dialog[open]')) {
    ev.preventDefault();
    cerrar(true);
  }
});
document.addEventListener('novatab:paleta', () => { if (capaActual() === 'perfiles') cerrar(); });

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
