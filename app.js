'use strict';

const CLAVE = 'datos';
const CLAVE_TEMA = 'tema';
const CLAVE_OPCIONES = 'opciones';
const OPCIONES = { fondoGrupos: true, sobrio: false, reunion: false, ocultos: { izq: false, der: false } };
const VERSION = 3;
// Dos rejillas: la derecha (red local: grupos y widgets) y la izquierda (solo widgets).
const COLUMNAS = { der: 12, izq: 6 };
const ANCHO_MINIMO = { der: 4, izq: 2 };
const ANCHO_NUEVO = 6;
const ALTO_MINIMO = 3;
const ALTO_MAXIMO = 40;
const TITULOS = { local: 'Red local', online: 'Internet' };
const hayChrome = typeof chrome !== 'undefined' && !!chrome.storage;

const TEMAS = [
  { id: 'bosque', nombre: 'Bosque', modo: 'oscuro', muestra: ['#18221d', '#2f4438'] },
  { id: 'noche', nombre: 'Noche', modo: 'oscuro', muestra: ['#111316', '#29303a'] },
  { id: 'papel', nombre: 'Papel', modo: 'claro', muestra: ['#f5f0e6', '#d8c9ab'] },
  { id: 'glaciar', nombre: 'Glaciar', modo: 'claro', muestra: ['#eaf2f6', '#b9d1e1'] },
];

// Siglas y color según el nombre del servicio. Si no coincide ninguno,
// se usan las iniciales y el color del grupo.
const TIPOS = [
  [/proxmox/i, 'PX', '#f4b183'],
  [/neo4j/i, 'N4', '#9cc3e6'],
  [/gitlab/i, 'GL', '#f2a7a0'],
  [/alfresco/i, 'AF', '#a9d5b5'],
  [/redcap/i, 'RC', '#f0b8c6'],
];

const ICONOS = {
  buscar: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  ia: 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z',
  imagen: 'M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z',
  video: 'M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z',
  noticias: 'M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM11 17H6v-2h5v2zm7-4H6v-2h12v2zm0-4H6V7h12v2z',
  mapa: 'M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
  paleta: 'M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  lapiz: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
  panelIzq: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v12h4V6H5zm6 0v12h8V6h-8z',
  panelDer: 'M5 4h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v12h8V6H5zm10 0v12h4V6h-4z',
  plegar: 'M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z',
  ojo: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  ojoTachado: 'M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z',
  desplegar: 'M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z',
  mas: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  papelera: 'M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
  cerrar: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
};
const svg = nombre => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONOS[nombre]}"/></svg>`;

// Búsqueda en Google. udm=50 es el modo IA, udm=2 imágenes y udm=7 vídeos.
const GOOGLE = [
  { icono: 'buscar', titulo: q => `Buscar «${q}» en Google`, url: q => `https://www.google.com/search?q=${q}` },
  { icono: 'ia', titulo: () => 'Preguntar al Modo IA', url: q => `https://www.google.com/search?udm=50&q=${q}` },
  { icono: 'imagen', titulo: () => 'Imágenes', url: q => `https://www.google.com/search?udm=2&q=${q}` },
  { icono: 'video', titulo: () => 'Vídeos', url: q => `https://www.google.com/search?udm=7&q=${q}` },
  { icono: 'noticias', titulo: () => 'Noticias', url: q => `https://www.google.com/search?tbm=nws&q=${q}` },
  { icono: 'mapa', titulo: () => 'Maps', url: q => `https://www.google.com/maps/search/${q}` },
];

let datos = null;
let editando = false;
let arrastre = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const buscar = $('#buscar');
const REJILLAS = { der: $('#rejilla'), izq: $('#rejilla-izq') };

const nuevoId = () => crypto.randomUUID
  ? crypto.randomUUID()
  : Date.now().toString(36) + Math.random().toString(36).slice(2);
const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

// ---------- Datos ----------

// hDefecto solo para los widgets: los grupos calculan su alto por el número de enlaces.
function posValida(p, hDefecto, panel = 'der') {
  if (!p) return null;
  const columnas = COLUMNAS[panel];
  const w = limitar(Math.round(p.w) || ANCHO_NUEVO, ANCHO_MINIMO[panel], columnas);
  const pos = {
    x: limitar(Math.round(p.x) || 1, 1, columnas - w + 1),
    y: Math.max(1, Math.round(p.y) || 1),
    w,
  };
  if (hDefecto) pos.h = limitar(Math.round(p.h) || hDefecto, ALTO_MINIMO, ALTO_MAXIMO);
  return pos;
}

function normalizar(d) {
  if (!d || !Array.isArray(d.grupos)) throw new Error('formato no válido');
  const grupos = d.grupos.map(g => ({
    id: g.id || nuevoId(),
    nombre: String(g.nombre || 'Sin nombre'),
    zona: g.zona === 'online' ? 'online' : 'local',
    color: g.color || '#8a8c92',
    pos: g.zona === 'online' ? null : posValida(g.pos),
    plegado: !!g.plegado,
    privado: !!g.privado,
    // Solo enlaces http y https: un javascript: o data: importado o guardado se descarta.
    enlaces: (g.enlaces || []).filter(e => urlSegura(String(e?.url || ''))).map(e => ({
      id: e.id || nuevoId(),
      nombre: String(e.nombre || ''),
      url: String(e.url || ''),
      icono: iconoValido(e.icono),
    })),
  }));
  // Datos de la versión 1 (sin zonas): se añaden los sitios online por defecto.
  if ((d.version || 1) < 2 && !grupos.some(g => g.zona === 'online')) {
    grupos.push(...normalizar(DATOS_DEFECTO).grupos.filter(g => g.zona === 'online'));
  }
  const titulos = { ...TITULOS };
  for (const k of Object.keys(TITULOS)) {
    const t = String(d.titulos?.[k] ?? '').trim();
    if (t) titulos[k] = t.slice(0, 60);
  }
  const widgets = (Array.isArray(d.widgets) ? d.widgets : [])
    .filter(w => WIDGETS[w?.tipo])
    .map(w => {
      const panel = w.panel === 'izq' ? 'izq' : 'der';
      return {
        id: w.id || nuevoId(),
        tipo: w.tipo,
        panel,
        pos: posValida(w.pos, WIDGETS[w.tipo].h, panel),
        config: w.config && typeof w.config === 'object' ? w.config : {},
        plegado: !!w.plegado,
      };
    });
  const res = { version: VERSION, titulos, grupos, widgets };
  colocarSinPosicion(res);
  return res;
}

const gruposDe = (zona, d = datos) => d.grupos.filter(g => g.zona === zona);
const grupo = id => datos.grupos.find(g => g.id === id);

// ---------- Rejilla ----------
// En la rejilla hay bloques: los grupos locales y los widgets.
// Un grupo ocupa tantas filas como enlaces más una para el título; un widget, las que se le den.

const bloques = (d = datos) => [...gruposDe('local', d), ...d.widgets];
const bloque = id => grupo(id) || datos.widgets.find(w => w.id === id);
const panelDe = b => b.panel || 'der';
// En modo reunión los grupos privados no se pintan ni salen en el buscador (siguen ocupando su sitio).
const visible = b => !(opciones.reunion && b.privado);
const bloquesDe = (panel, d = datos) => bloques(d).filter(b => panelDe(b) === panel);
// Plegado, un bloque ocupa solo la fila del título.
const alto = b => b.plegado ? 1 : b.tipo ? b.pos.h : 1 + Math.max(1, b.enlaces.length);

const solapan = (a, b) =>
  a.pos.x < b.pos.x + b.pos.w && b.pos.x < a.pos.x + a.pos.w &&
  a.pos.y < b.pos.y + alto(b) && b.pos.y < a.pos.y + alto(a);

// Busca el primer hueco libre (de arriba abajo, de izquierda a derecha).
function colocarSinPosicion(d) {
  for (const panel of Object.keys(COLUMNAS)) {
    const columnas = COLUMNAS[panel];
    const colocados = bloquesDe(panel, d).filter(b => b.pos);
    for (const g of bloquesDe(panel, d).filter(b => !b.pos)) {
      // En la izquierda un widget nuevo ocupa todo el ancho.
      const w = !g.tipo ? ANCHO_NUEVO : panel === 'izq' ? columnas : WIDGETS[g.tipo].w;
      buscarHueco:
      for (let y = 1; ; y++) {
        for (let x = 1; x <= columnas - w + 1; x++) {
          g.pos = g.tipo ? { x, y, w, h: WIDGETS[g.tipo].h } : { x, y, w };
          if (!colocados.some(o => solapan(o, g))) break buscarHueco;
        }
      }
      colocados.push(g);
    }
  }
}

// El grupo recién movido manda; los que pisa bajan justo por debajo de él (y así en cascada).
function resolver(fijo) {
  for (const panel of Object.keys(COLUMNAS)) {
    const orden = bloquesDe(panel).sort((a, b) =>
      (b === fijo) - (a === fijo) || a.pos.y - b.pos.y || a.pos.x - b.pos.x);
    const colocados = [];
    for (const g of orden) {
      let pisa;
      while ((pisa = colocados.filter(o => solapan(o, g))).length) {
        g.pos.y = Math.max(...pisa.map(o => o.pos.y + alto(o)));
      }
      colocados.push(g);
    }
  }
}

const rejillaActiva = () => matchMedia('(min-width: 1001px)').matches;

// ---------- Almacenamiento ----------
// En la extensión: chrome.storage.sync (se sincroniza con tu cuenta de Chrome).
// Abierto como archivo suelto: localStorage.

async function leer(clave) {
  if (!hayChrome) {
    try { return JSON.parse(localStorage.getItem(clave)); } catch { return null; }
  }
  const s = await chrome.storage.sync.get(clave);
  if (s[clave] != null) return s[clave];
  const l = await chrome.storage.local.get(clave);
  return l[clave] ?? null;
}

async function escribir(clave, valor) {
  if (!hayChrome) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin almacenamiento */ }
    return;
  }
  try {
    await chrome.storage.sync.set({ [clave]: valor });
    await chrome.storage.local.remove(clave);
  } catch {
    // sync admite 8 KB por elemento; si se supera, se guarda solo en este equipo.
    await chrome.storage.local.set({ [clave]: valor });
    await chrome.storage.sync.remove(clave);
    avisar('Demasiados datos para sincronizar: guardado solo en este equipo');
  }
}

const guardar = () => escribir(CLAVE, datos);

async function guardarYPintar(fijo) {
  resolver(fijo);
  pintar();
  await guardar();
}

// ---------- Pintado ----------

function crear(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto != null) el.textContent = texto;
  return el;
}

function urlSegura(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

function partes(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, puerto: u.port || (u.protocol === 'https:' ? '443' : '80') };
  } catch {
    return { host: '', puerto: '' };
  }
}
const direccion = url => { const p = partes(url); return p.host ? `${p.host}:${p.puerto}` : url; };
const dominio = url => partes(url).host.replace(/^www\./, '');

function icono(e, g) {
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

function pintar() {
  pintarTitulos();
  pintarLocal();
  pintarOnline();
  pintarResumen();
}

function pintarLocal() {
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

function botonesGrupo() {
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

function botonPlegar(plegado) {
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
async function plegar(id) {
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

function botonBorrar() {
  const b = crear('span', 'borrar solo-edicion');
  b.setAttribute('role', 'button');
  b.title = 'Borrar enlace';
  b.innerHTML = svg('cerrar');
  return b;
}

function pintarGrupoLocal(g) {
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

function pintarOnline() {
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
function pintarTitulos() {
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

function pintarResumen() {
  const n = gruposDe('local').filter(visible).reduce((s, g) => s + g.enlaces.length, 0);
  $('#resumen-local').textContent = `${n} ${n === 1 ? 'servicio' : 'servicios'}`;
}

// ---------- Buscador ----------

const sugerencias = $('#sugerencias');
const caja = $('#buscador');
let items = [];
let sel = 0;
let primeraGoogle = 0;

function fila(url, iconoNodo, titulo, sub, etiqueta) {
  const a = crear('a', 'sugerencia');
  a.href = url;
  if (typeof iconoNodo === 'string') a.insertAdjacentHTML('beforeend', iconoNodo);
  else a.append(iconoNodo);
  a.append(crear('span', 's-titulo', titulo), crear('span', 's-sub mono', sub), crear('span', 's-etiqueta', etiqueta));
  return a;
}

function marcar() {
  items.forEach((n, i) => n.classList.toggle('sel', i === sel));
}

function pintarSugerencias() {
  const q = buscar.value.trim();
  const qq = encodeURIComponent(q);
  $('#modo-ia').href = q ? GOOGLE[1].url(qq) : 'https://www.google.com/search?udm=50';
  if (!q) {
    caja.classList.remove('abierto');
    sugerencias.replaceChildren();
    items = [];
    return;
  }
  const palabras = q.toLowerCase().split(/\s+/);
  const propios = datos.grupos
    .filter(visible)
    .flatMap(g => g.enlaces.map(e => ({ e, g, texto: `${g.nombre} ${e.nombre} ${e.url}`.toLowerCase() })))
    .filter(t => palabras.every(p => t.texto.includes(p)))
    .slice(0, 6)
    .map(({ e, g }) => fila(e.url, icono(e, g), e.nombre,
      g.zona === 'online' ? dominio(e.url) : direccion(e.url),
      g.zona === 'online' ? 'Internet' : g.nombre));
  const deGoogle = GOOGLE.map(o => fila(o.url(qq), svg(o.icono), o.titulo(q), '', 'Google'));
  items = [...propios, ...deGoogle];
  primeraGoogle = propios.length;
  sugerencias.replaceChildren(...(propios.length ? [...propios, crear('div', 'separador'), ...deGoogle] : deGoogle));
  sel = 0;
  marcar();
  caja.classList.add('abierto');
}

const abrir = (url, nueva) => (nueva ? window.open(url, '_blank') : (location.href = url));

buscar.addEventListener('input', pintarSugerencias);
buscar.addEventListener('focus', pintarSugerencias);
buscar.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    buscar.value = '';
    pintarSugerencias();
    return;
  }
  if (!items.length) return;
  if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
    ev.preventDefault();
    sel = (sel + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    marcar();
  } else if (ev.key === 'Enter') {
    // Enter abre lo marcado (tu servicio si coincide); Shift+Enter va siempre a Google.
    const destino = ev.shiftKey ? items[primeraGoogle] : items[sel];
    abrir(destino.href, ev.ctrlKey || ev.metaKey);
  }
});
sugerencias.addEventListener('mousemove', ev => {
  const i = items.indexOf(ev.target.closest('.sugerencia'));
  if (i >= 0 && i !== sel) { sel = i; marcar(); }
});
document.addEventListener('click', ev => {
  if (!caja.contains(ev.target)) caja.classList.remove('abierto');
});
document.addEventListener('keydown', ev => {
  if (ev.key === '/' && document.activeElement !== buscar && !$('dialog[open]')) {
    ev.preventDefault();
    buscar.focus();
  }
});

// ---------- Tema ----------

const muestras = TEMAS.map(t => {
  const b = crear('button', 'muestra');
  b.type = 'button';
  b.dataset.tema = t.id;
  b.style.setProperty('--m1', t.muestra[0]);
  b.style.setProperty('--m2', t.muestra[1]);
  b.append(crear('i'), t.nombre);
  b.addEventListener('click', () => {
    ponerTema(t.id);
    escribir(CLAVE_TEMA, t.id);
  });
  return b;
});
$('#muestras').append(...muestras);

function ponerTema(id) {
  const t = TEMAS.find(x => x.id === id) || TEMAS[0];
  document.documentElement.dataset.tema = t.id;
  document.documentElement.dataset.modo = t.modo;
  muestras.forEach(m => m.setAttribute('aria-pressed', String(m.dataset.tema === t.id)));
}

let opciones = { ...OPCIONES };

function ponerOpciones(o) {
  const nuevas = o && typeof o === 'object' ? o : {};
  opciones = { ...OPCIONES, ...nuevas, ocultos: { ...OPCIONES.ocultos, ...(nuevas.ocultos || {}) } };
  document.body.classList.toggle('grupos-con-fondo', !!opciones.fondoGrupos);
  $('#opt-fondo-grupos').checked = !!opciones.fondoGrupos;
  document.body.classList.toggle('sobrio', !!opciones.sobrio);
  $('#opt-sobrio').checked = !!opciones.sobrio;
  const reunion = $('#btn-reunion');
  reunion.setAttribute('aria-pressed', String(!!opciones.reunion));
  reunion.title = opciones.reunion ? 'Modo reunión activo: pulsa para mostrar los grupos privados' : 'Modo reunión: ocultar los grupos privados';
  reunion.innerHTML = svg(opciones.reunion ? 'ojoTachado' : 'ojo');
  if (datos) pintar();
  for (const [panel, nombre] of [['izq', 'el panel izquierdo'], ['der', 'la red local']]) {
    const oculto = !!opciones.ocultos[panel];
    document.body.classList.toggle(`sin-${panel}`, oculto);
    const b = $(`#btn-panel-${panel}`);
    b.setAttribute('aria-pressed', String(!oculto));
    b.title = `${oculto ? 'Mostrar' : 'Ocultar'} ${nombre}`;
  }
}

$('#btn-reunion').addEventListener('click', () => {
  ponerOpciones({ ...opciones, reunion: !opciones.reunion });
  escribir(CLAVE_OPCIONES, opciones);
  if (opciones.reunion && !datos.grupos.some(g => g.privado)) {
    avisar('Ningún grupo es privado todavía: márcalo al editar el grupo con su lápiz.');
  }
});

// Ocultar o mostrar un panel entero. Nunca quedan los dos ocultos.
for (const panel of ['izq', 'der']) {
  $(`#btn-panel-${panel}`).addEventListener('click', () => {
    const ocultos = { ...opciones.ocultos, [panel]: !opciones.ocultos[panel] };
    if (ocultos.izq && ocultos.der) ocultos[panel === 'izq' ? 'der' : 'izq'] = false;
    ponerOpciones({ ...opciones, ocultos });
    escribir(CLAVE_OPCIONES, opciones);
    if (editando) pintarLocal();
  });
}

$('#opt-sobrio').addEventListener('change', ev => {
  ponerOpciones({ ...opciones, sobrio: ev.target.checked });
  escribir(CLAVE_OPCIONES, opciones);
});

$('#opt-fondo-grupos').addEventListener('change', ev => {
  ponerOpciones({ ...opciones, fondoGrupos: ev.target.checked });
  escribir(CLAVE_OPCIONES, opciones);
});

const panelTema = $('#panel-tema');
$('#btn-tema').addEventListener('click', () => {
  panelTema.hidden = !panelTema.hidden;
  $('#btn-tema').setAttribute('aria-expanded', String(!panelTema.hidden));
});
document.addEventListener('click', ev => {
  if (!ev.target.closest('.esquina')) panelTema.hidden = true;
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') panelTema.hidden = true;
});

// Curvas de nivel: anillos deformados alrededor de dos cimas; cada quinto es una curva maestra.
function pintarFondo() {
  const w = innerWidth, h = innerHeight;
  const caminos = [];
  [[w * 0.08, h * 0.92, 1.3, 4.1], [w * 0.86, h * 0.12, 5.2, 2.7]].forEach(([cx, cy, f1, f2]) => {
    for (let k = 1; k <= 20; k++) {
      const base = k * 34;
      const puntos = [];
      for (let i = 0; i <= 140; i++) {
        const t = i / 140 * Math.PI * 2;
        const r = base * (1 + 0.11 * Math.sin(3 * t + f1 + k * 0.18) + 0.06 * Math.sin(5 * t + f2 - k * 0.12));
        puntos.push(`${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`);
      }
      caminos.push(`<path${k % 5 === 0 ? ' class="maestra"' : ''} d="M${puntos.join('L')}Z"/>`);
    }
  });
  $('#fondo').innerHTML = `<svg viewBox="0 0 ${w} ${h}">${caminos.join('')}</svg>`;
}

// ---------- Edición ----------

function abrirDialogo(dlg, valores) {
  const form = dlg.querySelector('form');
  for (const [k, v] of Object.entries(valores)) {
    const campo = form.elements[k];
    if (campo.type === 'checkbox') campo.checked = !!v;
    else campo.value = v;
  }
  dlg.returnValue = '';
  dlg.showModal();
  return new Promise(resolve => {
    dlg.addEventListener('close', () => {
      resolve(dlg.returnValue === 'ok' ? Object.fromEntries(new FormData(form)) : null);
    }, { once: true });
  });
}

function dialogoEnlace(titulo, valores) {
  const dlg = $('#dlg-enlace');
  dlg.querySelector('h2').textContent = titulo;
  const opciones = [['local', 'Red local'], ['online', 'Internet']].map(([zona, etiqueta]) => {
    const og = document.createElement('optgroup');
    og.label = etiqueta;
    og.append(...gruposDe(zona).map(g => new Option(g.nombre, g.id)));
    return og;
  }).filter(og => og.children.length);
  dlg.querySelector('select').replaceChildren(...opciones);
  const respuesta = abrirDialogo(dlg, valores);
  refrescarCampoIcono();
  return respuesta;
}

function leerIcono(texto) {
  try { return iconoValido(JSON.parse(texto || 'null')); } catch { return null; }
}

function dialogoGrupo(titulo, valores) {
  const dlg = $('#dlg-grupo');
  dlg.querySelector('h2').textContent = titulo;
  return abrirDialogo(dlg, valores);
}

async function nuevoEnlace(gid) {
  if (!datos.grupos.length) return nuevoGrupo('local');
  const r = await dialogoEnlace('Nuevo enlace', { nombre: '', url: '', grupo: gid || datos.grupos[0].id, icono: '' });
  if (!r) return;
  if (!urlSegura(r.url.trim())) return avisar('Solo direcciones http:// o https://');
  grupo(r.grupo).enlaces.push({ id: nuevoId(), nombre: r.nombre.trim(), url: r.url.trim(), icono: leerIcono(r.icono) });
  await guardarYPintar(grupo(r.grupo));
}

async function editarEnlace(gid, eid) {
  const g = grupo(gid);
  const e = g.enlaces.find(x => x.id === eid);
  const r = await dialogoEnlace('Editar enlace', { nombre: e.nombre, url: e.url, grupo: gid, icono: e.icono ? JSON.stringify(e.icono) : '' });
  if (!r) return;
  if (!urlSegura(r.url.trim())) return avisar('Solo direcciones http:// o https://');
  e.nombre = r.nombre.trim();
  e.url = r.url.trim();
  e.icono = leerIcono(r.icono);
  if (r.grupo !== gid) {
    g.enlaces.splice(g.enlaces.indexOf(e), 1);
    grupo(r.grupo).enlaces.push(e);
  }
  await guardarYPintar(grupo(r.grupo));
}

async function borrarEnlace(gid, eid) {
  const g = grupo(gid);
  const e = g.enlaces.find(x => x.id === eid);
  if (!confirm(`¿Borrar "${e.nombre}"?`)) return;
  g.enlaces.splice(g.enlaces.indexOf(e), 1);
  await guardarYPintar();
}

async function nuevoGrupo(zona) {
  const r = await dialogoGrupo('Nuevo grupo', { nombre: '', zona, color: '#8a8c92', privado: false });
  if (!r) return;
  datos.grupos.push({ id: nuevoId(), nombre: r.nombre.trim(), zona: r.zona, color: r.color, privado: r.privado === 'on', pos: null, enlaces: [] });
  colocarSinPosicion(datos);
  await guardarYPintar();
}

async function editarGrupo(gid) {
  const g = grupo(gid);
  const r = await dialogoGrupo('Editar grupo', { nombre: g.nombre, zona: g.zona, color: g.color, privado: g.privado });
  if (!r) return;
  g.nombre = r.nombre.trim();
  g.color = r.color;
  g.privado = r.privado === 'on';
  if (r.zona !== g.zona) {
    g.zona = r.zona;
    g.pos = null;
    colocarSinPosicion(datos);
  }
  await guardarYPintar();
}

async function borrarGrupo(gid) {
  const g = grupo(gid);
  const n = g.enlaces.length;
  if (!confirm(`¿Borrar el grupo "${g.nombre}"${n ? ` y sus ${n} enlaces` : ''}?`)) return;
  datos.grupos.splice(datos.grupos.indexOf(g), 1);
  await guardarYPintar();
}

document.querySelector('.pagina').addEventListener('click', ev => {
  const plegador = ev.target.closest('[data-plegar]');
  if (plegador) return plegar(plegador.closest('.bloque').dataset.id);
  const w = ev.target.closest('.widget');
  const accionWidget = ev.target.closest('[data-accion-widget]');
  if (w && accionWidget) return accionDeWidget(accionWidget.dataset.accionWidget, w.dataset.id);
  const nuevo = ev.target.closest('[data-nuevo-grupo]');
  if (nuevo) return nuevoGrupo(nuevo.dataset.nuevoGrupo);
  const g = ev.target.closest('.grupo');
  const boton = ev.target.closest('[data-accion]');
  if (boton && g) {
    if (boton.dataset.accion === 'nuevo-enlace') nuevoEnlace(g.dataset.id);
    if (boton.dataset.accion === 'editar-grupo') editarGrupo(g.dataset.id);
    if (boton.dataset.accion === 'borrar-grupo') borrarGrupo(g.dataset.id);
    return;
  }
  const a = ev.target.closest('.enlace');
  if (a && g && editando) {
    ev.preventDefault();
    if (ev.target.closest('.borrar')) borrarEnlace(g.dataset.id, a.dataset.id);
    else editarEnlace(g.dataset.id, a.dataset.id);
  }
});

function ponerEdicion(activo) {
  editando = activo;
  document.body.classList.toggle('editando', activo);
  $('#btn-editar').setAttribute('aria-pressed', String(activo));
  pintar();
}

$('#btn-editar').addEventListener('click', () => ponerEdicion(!editando));
$('#btn-listo').addEventListener('click', () => ponerEdicion(false));
$('#btn-nuevo-widget').addEventListener('click', () => nuevoWidget());

$('#btn-exportar').addEventListener('click', async () => {
  const copia = { ...datos, notas: await leerNotas() };
  const blob = new Blob([JSON.stringify(copia, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'marcadores.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$('#btn-importar').addEventListener('click', () => $('#archivo').click());
$('#archivo').addEventListener('change', async ev => {
  const archivo = ev.target.files[0];
  ev.target.value = '';
  if (!archivo) return;
  try {
    const leido = JSON.parse(await archivo.text());
    const nuevos = normalizar(leido);
    if (!confirm('¿Reemplazar todos los enlaces por los del archivo?')) return;
    await escribirNotas(leido.notas);
    datos = nuevos;
    await guardarYPintar();
    avisar('Enlaces importados');
  } catch (err) {
    avisar('No se pudo importar: ' + err.message);
  }
});

// Restablecer todo: los datos de ejemplo y ninguna nota guardada (sin widgets, serían huérfanas).
async function restablecerTodo() {
  datos = normalizar(DATOS_DEFECTO);
  memoriaNotas.clear();
  if (hayChrome) {
    for (const area of [chrome.storage.sync, chrome.storage.local]) {
      const todo = await area.get(null);
      await area.remove(Object.keys(todo).filter(k => k.startsWith('nota:')));
    }
  } else {
    for (const k of Object.keys(localStorage)) if (k.startsWith('nota:')) localStorage.removeItem(k);
  }
  await guardarYPintar();
}

$('#btn-restablecer').addEventListener('click', () => {
  panelTema.hidden = true;
  $('#texto-restablecer').value = '';
  $('#confirmar-restablecer').disabled = true;
  $('#dlg-restablecer').returnValue = '';
  $('#dlg-restablecer').showModal();
});
$('#texto-restablecer').addEventListener('input', ev => {
  $('#confirmar-restablecer').disabled = ev.target.value !== 'BORRAR';
});
$('#dlg-restablecer').addEventListener('close', ev => {
  if (ev.target.returnValue === 'ok') restablecerTodo();
});

// ---------- Mover y redimensionar grupos en la rejilla (modo edición) ----------

function medidas(rejilla) {
  const r = rejilla.getBoundingClientRect();
  const estilo = getComputedStyle(rejilla);
  const columnas = COLUMNAS[rejilla.dataset.panel];
  const huecoCol = parseFloat(estilo.columnGap) || 0;
  const filaPaso = (parseFloat(estilo.gridAutoRows) || 40) + (parseFloat(estilo.rowGap) || 0);
  return { r, columnas, huecoCol, colPaso: (r.width + huecoCol) / columnas, filaPaso };
}

// El panel (columna izquierda o derecha) que hay bajo el puntero.
function panelBajo(x, y) {
  for (const [panel, rejilla] of Object.entries(REJILLAS)) {
    const c = rejilla.closest('.izquierda, .derecha').getBoundingClientRect();
    if (x >= c.left && x <= c.right && y >= c.top && y <= c.bottom) return panel;
  }
  return null;
}

document.querySelector('.pagina').addEventListener('pointerdown', ev => {
  if (!editando || !rejillaActiva() || ev.button !== 0 || !ev.target.closest('.rejilla')) return;
  const asa = ev.target.closest('.asa-ancho, .asa-esquina');
  const cab = ev.target.closest('.grupo-cab, .widget-cab');
  if ((!asa && !cab) || ev.target.closest('button')) return;
  ev.preventDefault();

  const sec = ev.target.closest('.bloque');
  const g = bloque(sec.dataset.id);
  const conAlto = asa?.classList.contains('asa-esquina');
  const origen = panelDe(g);
  const r0 = sec.getBoundingClientRect();
  const agarre = { x: ev.clientX - r0.left, y: ev.clientY - r0.top };
  const inicio = { x: ev.clientX, y: ev.clientY, pos: { ...g.pos } };
  let destinoPanel = origen;
  let destinoPos = { ...g.pos };

  const destino = crear('div', 'destino');
  destino.style.gridColumn = `${g.pos.x} / span ${g.pos.w}`;
  destino.style.gridRow = `${g.pos.y} / span ${alto(g)}`;
  REJILLAS[origen].append(destino);
  sec.classList.add('moviendo');
  sec.setPointerCapture(ev.pointerId);

  const mover = e => {
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (asa) {
      const m = medidas(REJILLAS[origen]);
      const w = limitar(inicio.pos.w + Math.round(dx / m.colPaso), ANCHO_MINIMO[origen], m.columnas - inicio.pos.x + 1);
      destinoPos = { ...inicio.pos, w };
      if (conAlto) destinoPos.h = limitar(inicio.pos.h + Math.round(dy / m.filaPaso), ALTO_MINIMO, ALTO_MAXIMO);
      sec.style.gridColumn = `${inicio.pos.x} / span ${w}`;
      if (conAlto) sec.style.gridRow = `${inicio.pos.y} / span ${destinoPos.h}`;
    } else {
      sec.style.transform = `translate(${dx}px, ${dy}px)`;
      // Los grupos se quedan en la red local; los widgets pueden pasar de un panel a otro.
      if (g.tipo) destinoPanel = panelBajo(e.clientX, e.clientY) || destinoPanel;
      const rejilla = REJILLAS[destinoPanel];
      const m = medidas(rejilla);
      // Al cambiar de panel se conserva el ancho en píxeles, no en columnas.
      const w = destinoPanel === origen ? inicio.pos.w
        : limitar(Math.round((r0.width + m.huecoCol) / m.colPaso), ANCHO_MINIMO[destinoPanel], m.columnas);
      destinoPos = {
        ...inicio.pos,
        w,
        x: limitar(Math.round((e.clientX - agarre.x - m.r.left) / m.colPaso) + 1, 1, m.columnas - w + 1),
        y: Math.max(1, Math.round((e.clientY - agarre.y - m.r.top) / m.filaPaso) + 1),
      };
      if (destino.parentNode !== rejilla) rejilla.append(destino);
    }
    destino.style.gridColumn = `${destinoPos.x} / span ${destinoPos.w}`;
    destino.style.gridRow = `${destinoPos.y} / span ${conAlto ? destinoPos.h : alto(g)}`;
  };

  const soltar = () => {
    sec.removeEventListener('pointermove', mover);
    sec.removeEventListener('pointerup', soltar);
    sec.removeEventListener('pointercancel', soltar);
    g.pos = destinoPos;
    if (g.tipo) g.panel = destinoPanel;
    guardarYPintar(g);
  };

  sec.addEventListener('pointermove', mover);
  sec.addEventListener('pointerup', soltar);
  sec.addEventListener('pointercancel', soltar);
});

// ---------- Arrastrar enlaces entre grupos (modo edición) ----------
// Se mueven en el DOM mientras se arrastra y al soltar se reconstruye el orden desde el DOM.

const pagina = document.querySelector('.pagina');

pagina.addEventListener('dragstart', ev => {
  const a = ev.target.closest?.('.enlace');
  if (!editando || !a) return;
  arrastre = { el: a, horizontal: a.classList.contains('atajo') };
  ev.dataTransfer.effectAllowed = 'move';
  requestAnimationFrame(() => arrastre?.el.classList.add('arrastrando'));
});

pagina.addEventListener('dragover', ev => {
  if (!arrastre) return;
  ev.preventDefault();
  const lista = ev.target.closest('.grupo')?.querySelector('.enlaces');
  if (!lista) return;
  // Los atajos de Internet y las filas locales no se mezclan: cada uno en su zona.
  if (lista.classList.contains('atajos') !== arrastre.horizontal) return;
  const sobre = ev.target.closest('.enlace');
  if (sobre && sobre !== arrastre.el) {
    const r = sobre.getBoundingClientRect();
    const antes = arrastre.horizontal ? ev.clientX < r.left + r.width / 2 : ev.clientY < r.top + r.height / 2;
    lista.insertBefore(arrastre.el, antes ? sobre : sobre.nextSibling);
  } else if (!sobre && arrastre.el.parentNode !== lista) {
    lista.insertBefore(arrastre.el, lista.querySelector('.anadir'));
  }
});

pagina.addEventListener('drop', ev => {
  if (arrastre) ev.preventDefault();
});

pagina.addEventListener('dragend', async () => {
  if (!arrastre) return;
  arrastre.el.classList.remove('arrastrando');
  arrastre = null;
  const enlaces = new Map(datos.grupos.flatMap(g => g.enlaces).map(e => [e.id, e]));
  for (const sec of $$('.grupo[data-id]')) {
    grupo(sec.dataset.id).enlaces = [...sec.querySelectorAll('.enlace')].map(a => enlaces.get(a.dataset.id));
  }
  await guardarYPintar();
});

// ---------- Varios ----------

let temporizadorAviso;
function avisar(texto) {
  const el = $('#aviso');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { el.hidden = true; }, 3500);
}

function reloj() {
  const d = new Date();
  $('#hora').textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  $('#fecha').textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

// Cambios hechos en otra pestaña u otro equipo sincronizado.
if (hayChrome) {
  chrome.storage.onChanged.addListener(cambios => {
    if (cambios[CLAVE_TEMA]?.newValue) ponerTema(cambios[CLAVE_TEMA].newValue);
    if (cambios[CLAVE_OPCIONES]?.newValue) ponerOpciones(cambios[CLAVE_OPCIONES].newValue);
    const nuevo = cambios[CLAVE]?.newValue;
    if (!nuevo || arrastre || JSON.stringify(nuevo) === JSON.stringify(datos)) return;
    datos = normalizar(nuevo);
    pintar();
  });
}

(async () => {
  $('#btn-editar').innerHTML = svg('lapiz');
  $('#btn-panel-izq').innerHTML = svg('panelIzq');
  $('#btn-panel-der').innerHTML = svg('panelDer');
  $('#btn-tema').innerHTML = svg('paleta');
  $('#ico-buscar').innerHTML = svg('buscar');
  $('#modo-ia').innerHTML = `${svg('ia')}Modo IA`;

  reloj();
  setInterval(reloj, 10000);
  let redimension;
  pintarFondo();
  addEventListener('resize', () => {
    clearTimeout(redimension);
    redimension = setTimeout(() => { pintarFondo(); if (editando) pintarLocal(); }, 120);
  });

  let tema = null;
  let guardados = null;
  let opcionesGuardadas = null;
  try {
    [tema, guardados, opcionesGuardadas] = await Promise.all([leer(CLAVE_TEMA), leer(CLAVE), leer(CLAVE_OPCIONES)]);
  } catch { /* sin datos guardados */ }
  ponerTema(tema);
  ponerOpciones(opcionesGuardadas);
  try {
    datos = normalizar(guardados || DATOS_DEFECTO);
  } catch {
    datos = normalizar(DATOS_DEFECTO);
  }
  resolver();
  pintar();
  if (!guardados || (guardados.version || 1) < VERSION) await guardar();
})();
