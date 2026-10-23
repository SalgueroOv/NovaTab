// Widget «Estado de servicios»: un LED por servicio de los grupos locales (¿responde?).
// Se sondea con fetch sin leer la respuesta: cualquier respuesta HTTP, aunque sea un 401 o un 404, cuenta como viva.
import { avisar, crear, direccion, urlSegura } from '../util.js';
import { hayChrome } from '../almacen.js';
import { datos } from '../datos.js';
import { visible } from '../rejilla.js';
import { campo, registrar } from '../widgets.js';

const MAX_ORIGENES = 40;
const A_LA_VEZ = 6;
const ESPERA_SONDEO = 4000;
const cada = () => globalThis.__cadaServicios ?? 60000; // las pruebas acortan el intervalo

const TEXTO = {
  vivo: 'Responde',
  caido: 'No responde',
  desconocido: 'Sin verificar: HTTPS con certificado propio, o caído',
  pendiente: 'Sin comprobar',
  comprobando: 'Comprobando',
};

// Los sitios (protocolo, host y puerto) de los enlaces http(s) de los grupos locales elegidos y visibles.
export function origenesVigilados(config, d = datos) {
  const elegidos = Array.isArray(config?.grupos) ? new Set(config.grupos) : null;
  const porOrigen = new Map();
  for (const g of d.grupos.filter(x => x.zona === 'local' && visible(x) && (!elegidos || elegidos.has(x.id)))) {
    for (const e of g.enlaces) {
      if (!urlSegura(e.url)) continue;
      const origen = new URL(e.url).origin;
      if (!porOrigen.has(origen) && porOrigen.size >= MAX_ORIGENES) continue;
      if (!porOrigen.has(origen)) porOrigen.set(origen, []);
      porOrigen.get(origen).push({ nombre: e.nombre, grupo: g.nombre, url: e.url });
    }
  }
  return [...porOrigen].map(([origen, enlaces]) => ({ origen, enlaces }));
}

// Los patrones de permiso: un host una sola vez, sin puerto.
export const patronesDe = origenes => [...new Set(origenes.map(o => { const u = new URL(o); return `${u.protocol}//${u.hostname}/*`; }))];

// Un fallo en HTTPS puede ser un certificado propio: desde fetch no se distingue de una caída, así que
// queda como «desconocido». Un fallo en HTTP, o pasarse del tiempo, es una caída.
export async function sondear(origen, { espera = ESPERA_SONDEO } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), espera);
  try {
    await fetch(`${origen}/`, { mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal: ac.signal });
    return 'vivo';
  } catch {
    if (ac.signal.aborted) return 'caido';
    return origen.startsWith('https:') ? 'desconocido' : 'caido';
  } finally {
    clearTimeout(t);
  }
}

// Como mucho 6 a la vez, para no saturar la red.
export async function sondearTodos(origenes, opciones) {
  const resultado = {};
  const cola = [...origenes];
  await Promise.all(Array.from({ length: Math.min(A_LA_VEZ, cola.length) }, async () => {
    while (cola.length) {
      const o = cola.shift();
      resultado[o] = await sondear(o, opciones);
    }
  }));
  return resultado;
}

// ---------- Permisos ----------

const hayPermisos = () => typeof chrome !== 'undefined' && !!chrome.permissions;
const tienePermiso = patrones => new Promise(resolver => {
  if (!hayPermisos() || !patrones.length) resolver(true);
  else chrome.permissions.contains({ origins: patrones }, ok => resolver(!!ok));
});
const pedirPermiso = patrones => new Promise(resolver => chrome.permissions.request({ origins: patrones }, ok => resolver(!!ok)));

// ---------- Pintado ----------

const estados = new Map(); // id del widget → { t, porOrigen }
const comprobando = new Set();
const widgetDe = new WeakMap(); // .servicios → su widget
// Hay sitios vigilados que aún no se han comprobado (se añadió un grupo o un enlace).
const faltanOrigenes = (w, st) => origenesVigilados(w.config).some(o => !(o.origen in st.porOrigen));

function pintarEstado(raiz) {
  const w = widgetDe.get(raiz);
  const vigilados = origenesVigilados(w.config);
  const st = estados.get(w.id);
  const lista = crear('ul', 'servicios-lista');
  let vivos = 0;
  let total = 0;
  for (const { origen, enlaces } of vigilados) {
    const estado = comprobando.has(w.id) ? 'comprobando' : st?.porOrigen[origen] ?? 'pendiente';
    for (const e of enlaces) {
      total++;
      if (st?.porOrigen[origen] === 'vivo') vivos++;
      const li = crear('li', 'servicio');
      const led = crear('span', 'led');
      led.dataset.estado = estado;
      led.title = TEXTO[estado];
      led.setAttribute('role', 'img');
      led.setAttribute('aria-label', TEXTO[estado]);
      li.append(led, crear('span', 'nombre', e.nombre), crear('span', 'dir mono', direccion(e.url)));
      lista.append(li);
    }
  }
  const resumen = crear('span', 'servicios-resumen');
  resumen.textContent = !st ? (comprobando.has(w.id) ? 'Comprobando…' : 'Sin comprobar')
    : `${vivos} de ${total} responden · comprobado ${new Date(st.t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
  const boton = crear('button', 'boton-texto servicios-comprobar', 'Comprobar ahora');
  boton.type = 'button';
  boton.addEventListener('click', () => comprobar(raiz));
  const cab = crear('div', 'servicios-cab');
  cab.append(resumen, boton);
  raiz.replaceChildren(cab, lista);
}

async function comprobar(raiz) {
  const w = widgetDe.get(raiz);
  if (comprobando.has(w.id)) return;
  comprobando.add(w.id);
  pintarEstado(raiz);
  try {
    const porOrigen = await sondearTodos(origenesVigilados(w.config).map(o => o.origen));
    estados.set(w.id, { t: Date.now(), porOrigen });
  } finally {
    comprobando.delete(w.id);
    // Si hubo un repintado durante el sondeo, el widget de la página es otro: se actualizan todos los de este id.
    for (const r of document.querySelectorAll(`.servicios[data-id="${CSS.escape(w.id)}"]`)) if (widgetDe.has(r)) pintarEstado(r);
  }
}

async function iniciar(raiz) {
  const w = widgetDe.get(raiz);
  const vigilados = origenesVigilados(w.config);
  if (!vigilados.length) {
    raiz.replaceChildren(crear('p', 'widget-nota', 'No hay servicios que vigilar: elige grupos con enlaces.'));
    return;
  }
  const patrones = patronesDe(vigilados.map(o => o.origen));
  pintarEstado(raiz);
  if (!(await tienePermiso(patrones))) {
    const pedir = crear('button', 'boton-texto servicios-permiso', 'Dar permiso');
    pedir.type = 'button';
    pedir.addEventListener('click', async () => {
      if (await pedirPermiso(patrones)) iniciar(raiz);
      else avisar('Sin permiso para comprobar esos sitios');
    });
    raiz.replaceChildren(crear('p', 'widget-nota', 'Falta el permiso para comprobar estos sitios.'), pedir);
    return;
  }
  raiz.dataset.ok = '1'; // a partir de aquí el temporizador de abajo lo comprueba
  const st = estados.get(w.id);
  if (!w.plegado && (!st || Date.now() - st.t >= cada() || faltanOrigenes(w, st))) comprobar(raiz);
}

function pintar(w, cuerpo) {
  if (!hayChrome) {
    cuerpo.append(crear('p', 'widget-nota', 'Disponible al usarlo como extensión de Chrome.'));
    return;
  }
  const raiz = crear('div', 'servicios');
  raiz.dataset.id = w.id;
  widgetDe.set(raiz, w);
  cuerpo.append(raiz);
  iniciar(raiz);
}

// Un solo temporizador para todos los widgets: comprueba solo los que están a la vista (pestaña visible,
// widget sin plegar y en la página) y ya tienen más de un minuto. Un widget borrado deja de estar en la página.
setInterval(() => {
  if (document.visibilityState !== 'visible') return;
  for (const raiz of document.querySelectorAll('.servicios[data-ok="1"]')) {
    if (raiz.closest('.widget')?.classList.contains('plegado')) continue;
    const st = estados.get(raiz.dataset.id);
    if (!st || Date.now() - st.t >= cada() || faltanOrigenes(widgetDe.get(raiz), st)) comprobar(raiz);
  }
}, 1000);

function configurador(actual) {
  return (cuerpo, ctx) => {
    const locales = datos.grupos.filter(g => g.zona === 'local' && visible(g)); // en modo reunión, sin los privados
    const elegidos = Array.isArray(actual.grupos) ? new Set(actual.grupos) : null;
    const lista = crear('div', 'lista-zonas');
    for (const g of locales) {
      const [label, input] = campo(g.nombre, { type: 'checkbox', value: g.id, checked: !elegidos || elegidos.has(g.id) });
      label.className = 'opcion opcion-dialogo';
      label.prepend(input);
      lista.append(label);
    }
    cuerpo.append(lista);
    const marcados = () => [...lista.querySelectorAll('input:checked')].map(i => i.value);
    const valor = () => ({ grupos: marcados().length === locales.length ? null : marcados() });
    // El permiso se pide dentro del clic de Guardar: la primera vez se impide cerrar y, si se concede, se cierra.
    ctx.validar = () => {
      if (!marcados().length) {
        avisar('Elige al menos un grupo');
        return false;
      }
      const patrones = patronesDe(origenesVigilados({ grupos: marcados() }).map(o => o.origen));
      if (!hayPermisos() || !patrones.length) return true;
      pedirPermiso(patrones).then(ok => {
        if (ok) ctx.cerrar(valor());
        else avisar('Sin permiso para comprobar esos sitios');
      });
      return false;
    };
    return valor;
  };
}

registrar('servicios', {
  def: {
    nombre: 'Estado de servicios',
    descripcion: 'Un LED por servicio de tus grupos locales',
    w: 6,
    h: 6,
    configurable: true,
    alto: c => 1 + Math.min(12, Math.max(3, origenesVigilados(c).reduce((n, o) => n + o.enlaces.length, 0))),
  },
  pintar,
  configurador,
  alBorrar: w => { estados.delete(w.id); comprobando.delete(w.id); },
});
