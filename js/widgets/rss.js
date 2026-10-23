// Widget «RSS»: los últimos titulares de un feed RSS o Atom (un feed por widget, con caché de 30 minutos).
import { avisar, crear, urlSegura } from '../util.js';
import { borrar, escribirLocal, hayChrome, leerLocal } from '../almacen.js';
import { campo, registrar, vacioWidget } from '../widgets.js';

const MAX_ELEMENTOS = 50;
const CACHE_MS = 30 * 60 * 1000;
const claveCache = id => `rss:${id}`;
const cantidadDe = c => Math.min(10, Math.max(5, Math.round(Number(c?.cantidad)) || 5));
// Las pruebas acortan la espera con window.__esperaRss.
const espera = () => globalThis.__esperaRss ?? 8000;

const patronDe = url => { const u = new URL(url); return `${u.protocol}//${u.hostname}/*`; };
const hayPermisos = () => typeof chrome !== 'undefined' && !!chrome.permissions;
const tienePermiso = url => new Promise(resolver => {
  if (!hayPermisos()) resolver(true);
  else chrome.permissions.contains({ origins: [patronDe(url)] }, ok => resolver(!!ok));
});
const pedirPermiso = url => new Promise(resolver => chrome.permissions.request({ origins: [patronDe(url)] }, ok => resolver(!!ok)));

// ---------- Lectura del feed ----------

const textoDe = (el, nombre) => el.getElementsByTagName(nombre)[0]?.textContent?.trim() ?? '';

// Devuelve { titulo, items } de un RSS 2.0 o un Atom, o null si no es un feed. Solo enlaces http(s) y con título.
export function leerFeed(xml) {
  let doc;
  try {
    doc = new DOMParser().parseFromString(String(xml ?? ''), 'application/xml');
  } catch {
    return null;
  }
  if (doc.getElementsByTagName('parsererror').length) return null;
  const raiz = doc.documentElement?.localName;
  let entradas;
  let enlaceDe;
  let fechaDe;
  if (raiz === 'rss') {
    entradas = [...doc.getElementsByTagName('item')];
    enlaceDe = e => textoDe(e, 'link');
    fechaDe = e => textoDe(e, 'pubDate');
  } else if (raiz === 'feed') {
    entradas = [...doc.getElementsByTagName('entry')];
    enlaceDe = e => {
      const enlaces = [...e.getElementsByTagName('link')];
      const buscado = enlaces.find(l => (l.getAttribute('rel') || 'alternate') === 'alternate') ?? enlaces[0];
      return buscado?.getAttribute('href') ?? '';
    };
    fechaDe = e => textoDe(e, 'updated') || textoDe(e, 'published');
  } else {
    return null;
  }
  const items = [];
  for (const e of entradas) {
    const titulo = textoDe(e, 'title');
    const enlace = enlaceDe(e);
    if (!titulo || !urlSegura(enlace)) continue;
    const t = Date.parse(fechaDe(e));
    items.push({ titulo, enlace, fecha: Number.isFinite(t) ? t : null });
    if (items.length >= MAX_ELEMENTOS) break;
  }
  const canal = raiz === 'rss' ? doc.getElementsByTagName('channel')[0] : doc.documentElement;
  const tituloFeed = [...(canal?.children ?? [])].find(h => h.localName === 'title')?.textContent?.trim() ?? '';
  return { titulo: tituloFeed, items };
}

// Con caché de menos de 30 minutos no hay petición (salvo «forzar»); si la red falla se usa la caché vieja.
export async function cargarFeed(url, { id, forzar = false } = {}) {
  const cache = id ? await leerLocal(claveCache(id)) : null;
  const valida = cache && cache.url === url && Array.isArray(cache.items);
  if (valida && !forzar && Date.now() - cache.t < CACHE_MS) return { ...cache, viejo: false };
  const ac = new AbortController();
  const temporizador = setTimeout(() => ac.abort(), espera());
  try {
    const r = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: ac.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const feed = leerFeed(await r.text());
    if (!feed) throw new Error('no es un feed');
    const nuevo = { t: Date.now(), url, titulo: feed.titulo, items: feed.items };
    if (id) escribirLocal(claveCache(id), nuevo);
    return { ...nuevo, viejo: false };
  } catch (err) {
    if (valida) return { ...cache, viejo: true };
    throw err;
  } finally {
    clearTimeout(temporizador);
  }
}

// ---------- Pintado ----------

function hace(t) {
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  if (min < 1440) return `hace ${Math.round(min / 60)} h`;
  if (min < 43200) return `hace ${Math.round(min / 1440)} d`;
  return new Date(t).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function boton(clase, texto) {
  const b = crear('button', `boton-texto ${clase}`, texto);
  b.type = 'button';
  return b;
}

async function cargar(w, raiz, forzar) {
  const url = w.config.url;
  raiz.replaceChildren(crear('p', 'widget-nota', 'Cargando…'));
  if (!(await tienePermiso(url))) {
    const pedir = boton('rss-permiso', 'Dar permiso');
    pedir.addEventListener('click', async () => {
      if (await pedirPermiso(url)) cargar(w, raiz, false);
      else avisar('Sin permiso para leer ese feed');
    });
    raiz.replaceChildren(crear('p', 'widget-nota', 'Falta el permiso para este feed.'), pedir);
    return;
  }
  const recargar = boton('rss-recargar', 'Recargar');
  recargar.addEventListener('click', () => cargar(w, raiz, true));
  let feed;
  try {
    feed = await cargarFeed(url, { id: w.id, forzar });
  } catch {
    if (raiz.isConnected) raiz.replaceChildren(crear('p', 'widget-nota rss-estado', 'No se pudo leer el feed.'), recargar);
    return;
  }
  if (!raiz.isConnected) return;
  const cab = crear('div', 'rss-cab');
  cab.append(crear('span', 'rss-titulo', feed.titulo || 'Noticias'), recargar);
  const lista = crear('ul', 'rss-lista');
  for (const it of feed.items.slice(0, cantidadDe(w.config))) {
    const a = crear('a', null, it.titulo);
    a.href = it.enlace;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    const li = crear('li', 'rss-item');
    li.append(a);
    if (it.fecha) li.append(crear('small', 'fecha', hace(it.fecha)));
    lista.append(li);
  }
  raiz.replaceChildren(cab, lista);
  if (feed.viejo) raiz.append(crear('p', 'widget-nota rss-estado', 'No se pudo actualizar: se muestra la última copia.'));
}

function pintar(w, cuerpo) {
  if (!urlSegura(w.config.url ?? '')) return vacioWidget(cuerpo, 'Indica la dirección de un feed.');
  if (!hayChrome) {
    cuerpo.append(crear('p', 'widget-nota', 'Disponible al usarlo como extensión de Chrome.'));
    return;
  }
  const raiz = crear('div', 'rss');
  cuerpo.append(raiz);
  cargar(w, raiz, false);
}

function configurador(actual) {
  return (cuerpo, ctx) => {
    const [lUrl, url] = campo('Dirección del feed', { type: 'text', value: actual.url ?? '', placeholder: 'https://sitio.com/feed.xml', maxLength: 300 });
    const [lCantidad, cantidad] = campo('Titulares', { tag: 'select' });
    for (let n = 5; n <= 10; n++) cantidad.append(new Option(String(n), String(n)));
    cantidad.value = String(cantidadDe(actual));
    cuerpo.append(lUrl, lCantidad);
    const valor = () => ({ url: url.value.trim(), cantidad: Number(cantidad.value) });
    // El permiso se pide dentro del clic de Guardar: la primera vez se impide cerrar y, si se concede, se cierra.
    ctx.validar = () => {
      const direccion = url.value.trim();
      if (!urlSegura(direccion)) {
        avisar('Escribe una dirección http o https');
        return false;
      }
      if (!hayPermisos()) return true;
      pedirPermiso(direccion).then(ok => {
        if (ok) ctx.cerrar(valor());
        else avisar('Sin permiso para leer ese feed');
      });
      return false;
    };
    return valor;
  };
}

registrar('rss', {
  def: { nombre: 'RSS', descripcion: 'Los últimos titulares de un feed', w: 6, h: 10, configurable: true },
  pintar,
  configurador,
  alBorrar: w => { borrar([claveCache(w.id)]).catch(() => { /* caché local huérfana: se limpia al restablecer */ }); },
});
