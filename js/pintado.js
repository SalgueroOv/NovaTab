// Pintado de grupos, enlaces, títulos y resumen.
import { $, $$, crear, direccion, svg } from './util.js';
import { hayChrome } from './almacen.js';
import { COLUMNAS, datos, gruposDe } from './datos.js';
import { REJILLAS, alto, bloque, bloquesDe, panelDe, rejillaActiva, solapan, visible } from './rejilla.js';
import { caja } from './buscador.js';
import { editando, guardarYPintar } from './edicion.js';
import { pintarWidget } from './widgets.js';
import { pintarIconoElegido } from './iconos.js';

// Siglas y color según el nombre del servicio. Si no coincide ninguno,
// se usan las iniciales y el color del grupo.
export const TIPOS = [
  [/proxmox/i, 'PX', '#f4b183'],
  [/neo4j/i, 'N4', '#9cc3e6'],
  [/gitlab/i, 'GL', '#f2a7a0'],
  [/alfresco/i, 'AF', '#a9d5b5'],
  [/redcap/i, 'RC', '#f0b8c6'],
];

export function icono(e, g) {
  if (e.icono) {
    const t = TIPOS.find(([re]) => re.test(e.nombre));
    return pintarIconoElegido(e.icono, t ? t[2] : g.color);
  }
  if (g.zona === 'online' && hayChrome && chrome.runtime?.id) {
    // El favicon va dentro de su propio círculo para que el modo sobrio pueda teñirlo con el tema.
    const caja = crear('span', 'icono favicon');
    const img = crear('img');
    img.alt = '';
    img.src = chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(e.url)}&size=32`);
    caja.append(img);
    return caja;
  }
  const t = TIPOS.find(([re]) => re.test(e.nombre));
  const s = crear('span', 'icono letras', t ? t[1] : e.nombre.trim().slice(0, 2).toUpperCase());
  s.style.setProperty('--tono', t ? t[2] : g.color);
  return s;
}

export function pintar() {
  pintarTitulos();
  pintarLocal();
  pintarOnline();
  pintarResumen();
}

export function pintarLocal() {
  for (const [panel, rejilla] of Object.entries(REJILLAS)) {
    const lista = bloquesDe(panel).filter(visible);
    const nodos = [];
    if (editando && rejillaActiva()) {
      const filas = Math.max(0, ...lista.map(g => g.pos.y + alto(g) - 1)) + 4;
      for (let y = 1; y <= filas; y++) {
        for (let x = 1; x <= COLUMNAS[panel]; x++) {
          const c = crear('div', 'celda');
          c.style.gridArea = `${y} / ${x}`;
          nodos.push(c);
        }
      }
    }
    // En pantallas estrechas (sin rejilla) el orden de lectura sigue la posición.
    const orden = [...lista].sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);
    orden.forEach((b, i) => {
      const nodo = b.tipo ? pintarWidget(b) : pintarGrupoLocal(b);
      nodo.style.order = i;
      nodos.push(nodo);
    });
    // Sin replaceChildren: un widget que se conserva no debe salir del DOM o su iframe se recargaría.
    const conservar = new Set(nodos);
    for (const n of [...rejilla.children]) if (!conservar.has(n)) n.remove();
    for (const n of nodos) if (n.parentNode !== rejilla) rejilla.append(n);
  }
  $('#vacio-local').hidden = bloquesDe('der').some(visible);
}

export function botonesGrupo() {
  return [['nuevo-enlace', 'mas', 'Añadir enlace'], ['editar-grupo', 'lapiz', 'Editar grupo'], ['borrar-grupo', 'papelera', 'Borrar grupo']]
    .map(([accion, ico, titulo]) => {
      const b = crear('button', 'mini solo-edicion');
      b.type = 'button';
      b.dataset.accion = accion;
      b.title = titulo;
      b.setAttribute('aria-label', titulo);
      b.innerHTML = svg(ico);
      return b;
    });
}

export function botonPlegar(plegado) {
  const b = crear('button', 'mini plegar');
  b.type = 'button';
  b.dataset.plegar = '';
  const titulo = plegado ? 'Desplegar' : 'Plegar';
  b.title = titulo;
  b.setAttribute('aria-label', titulo);
  b.setAttribute('aria-expanded', String(!plegado));
  b.innerHTML = svg(plegado ? 'desplegar' : 'plegar');
  return b;
}

// Al plegar, lo que había justo debajo (en las mismas columnas) sube a ocupar el hueco si cabe;
// al desplegar, resolver() vuelve a empujar hacia abajo lo que pise.
export async function plegar(id) {
  const b = bloque(id);
  const antes = alto(b);
  b.plegado = !b.plegado;
  const cambio = alto(b) - antes;
  const mismos = bloquesDe(panelDe(b));
  const debajo = mismos
    .filter(o => o !== b && o.pos.y >= b.pos.y + antes && o.pos.x < b.pos.x + b.pos.w && b.pos.x < o.pos.x + o.pos.w)
    .sort((x, y) => cambio < 0 ? x.pos.y - y.pos.y : y.pos.y - x.pos.y);
  for (const o of debajo) {
    const y = o.pos.y;
    o.pos.y += cambio;
    // Al subir, solo si cabe; al bajar, lo que choque lo resuelve resolver().
    if (cambio < 0 && mismos.some(m => m !== o && solapan(m, o))) o.pos.y = y;
  }
  await guardarYPintar(b);
}

export function botonBorrar() {
  const b = crear('span', 'borrar solo-edicion');
  b.setAttribute('role', 'button');
  b.title = 'Borrar enlace';
  b.innerHTML = svg('cerrar');
  return b;
}

export function pintarGrupoLocal(g) {
  const sec = crear('section', 'grupo bloque');
  sec.classList.toggle('plegado', !!g.plegado);
  sec.dataset.id = g.id;
  sec.style.setProperty('--c', g.color);
  sec.style.gridColumn = `${g.pos.x} / span ${g.pos.w}`;
  sec.style.gridRow = `${g.pos.y} / span ${alto(g)}`;

  const cab = crear('div', 'grupo-cab');
  cab.append(crear('i'), crear('h3', null, g.nombre), crear('span', 'cuenta', String(g.enlaces.length)));
  if (g.privado) cab.append(crear('span', 'privado solo-edicion', 'Privado'));
  cab.append(...botonesGrupo(), botonPlegar(g.plegado));

  const lista = crear('div', 'enlaces');
  for (const e of g.enlaces) {
    const a = crear('a', 'fila enlace');
    a.href = e.url;
    a.title = e.url;
    a.dataset.id = e.id;
    a.draggable = editando;
    a.append(icono(e, g), crear('span', 'nombre', e.nombre), crear('span', 'dir mono', direccion(e.url)), botonBorrar());
    lista.append(a);
  }
  if (!g.enlaces.length) lista.append(crear('p', 'fila-vacia', 'Sin enlaces'));

  const asa = crear('div', 'asa-ancho solo-edicion');
  asa.title = 'Cambiar el ancho';
  sec.append(cab, lista, asa);
  return sec;
}

export function pintarOnline() {
  const cont = $('#online');
  const grupos = gruposDe('online').filter(visible);
  cont.replaceChildren(...grupos.map(g => {
    const div = crear('div', 'grupo grupo-online');
    div.dataset.id = g.id;
    if (editando || grupos.length > 1) {
      const cab = crear('div', 'grupo-online-cab');
      cab.append(crear('span', null, g.nombre));
      if (g.privado) cab.append(crear('span', 'privado solo-edicion', 'Privado'));
      cab.append(...botonesGrupo());
      div.append(cab);
    }
    const atajos = crear('nav', 'atajos enlaces');
    atajos.setAttribute('aria-label', g.nombre);
    for (const e of g.enlaces) {
      const a = crear('a', 'atajo enlace');
      a.href = e.url;
      a.title = e.url;
      a.dataset.id = e.id;
      a.draggable = editando;
      a.append(icono(e, g), crear('span', 'nombre', e.nombre), botonBorrar());
      atajos.append(a);
    }
    if (editando) {
      const mas = crear('button', 'atajo anadir');
      mas.type = 'button';
      mas.dataset.accion = 'nuevo-enlace';
      mas.append(crear('span', 'icono', '+'), crear('span', 'nombre', 'Añadir'));
      atajos.append(mas);
    }
    div.append(atajos);
    return div;
  }));
}

// Los nombres de los paneles: en modo edición se escriben directamente sobre el título.
export function pintarTitulos() {
  for (const el of $$('[data-titulo]')) {
    el.contentEditable = editando ? 'plaintext-only' : 'false';
    if (document.activeElement !== el) el.textContent = datos.titulos[el.dataset.titulo];
  }
}

for (const el of $$('[data-titulo]')) {
  el.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); el.blur(); }
    if (ev.key === 'Escape') { el.textContent = datos.titulos[el.dataset.titulo]; el.blur(); }
  });
  el.addEventListener('blur', async () => {
    const texto = el.textContent.replace(/\s+/g, ' ').trim().slice(0, 60);
    const clave = el.dataset.titulo;
    if (!texto || texto === datos.titulos[clave]) { el.textContent = datos.titulos[clave]; return; }
    datos.titulos[clave] = texto;
    await guardarYPintar();
  });
}

export function pintarResumen() {
  const n = gruposDe('local').filter(visible).reduce((s, g) => s + g.enlaces.length, 0);
  $('#resumen-local').textContent = `${n} ${n === 1 ? 'servicio' : 'servicios'}`;
}
