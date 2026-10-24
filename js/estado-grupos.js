// El estado de los servicios en los grupos que lo piden («Comprobar si responden» en el diálogo del grupo): un
// punto por enlace (verde si responde, ámbar si va lento o sin verificar, rojo si no responde) con los
// milisegundos, y un resumen en la cabecera del panel que nombra lo más grave. Se sondea cada 60 s con la
// pestaña visible, solo con el permiso de host ya concedido (se pide al marcar la opción).
import { $, crear, urlSegura } from './util.js';
import { datos, gruposDe } from './datos.js';
import { visible } from './rejilla.js';
import { patronesDe, pedirPermiso, sondear, tienePermiso } from './widgets/servicios.js';

const LENTO = 800; // ms
const A_LA_VEZ = 6;
const cada = () => globalThis.__cadaServicios ?? 60000; // las pruebas acortan el intervalo
const TEXTO = { vivo: 'Responde', lento: 'Responde, pero lento', desconocido: 'Sin verificar: HTTPS con certificado propio, o caído', caido: 'No responde' };

const estados = new Map(); // origen → { estado, ms, desde }
let temporizador = null;
let sondeando = false;

const gruposQueComprueban = () => gruposDe('local').filter(g => g.comprobar && visible(g));
const origenDe = url => (urlSegura(url) ? new URL(url).origin : null);
const origenes = () => [...new Set(gruposQueComprueban().flatMap(g => g.enlaces.map(e => origenDe(e.url)).filter(Boolean)))];

// Pide el permiso de las direcciones de un grupo. Tiene que llamarse desde un clic.
export const pedirPermisoDe = g => (typeof chrome === 'undefined' || !chrome.permissions
  ? Promise.resolve(true)
  : pedirPermiso(patronesDe(g.enlaces.map(e => origenDe(e.url)).filter(Boolean))));

async function sondearUno(origen) {
  const t0 = performance.now();
  const r = await sondear(origen);
  const ms = Math.round(performance.now() - t0);
  const estado = r === 'vivo' && ms > LENTO ? 'lento' : r;
  const antes = estados.get(origen);
  // «desde» guarda cuándo dejó de responder, para el resumen.
  const desde = estado === 'caido' ? (antes?.estado === 'caido' ? antes.desde : Date.now()) : null;
  estados.set(origen, { estado, ms, desde });
}

export async function comprobarAhora() {
  if (sondeando) return;
  const lista = origenes();
  if (!lista.length || !(await tienePermiso(patronesDe(lista)))) { decorar(); return; }
  sondeando = true;
  try {
    const cola = [...lista];
    await Promise.all(Array.from({ length: Math.min(A_LA_VEZ, cola.length) }, async () => {
      while (cola.length) await sondearUno(cola.shift());
    }));
  } finally {
    sondeando = false;
  }
  decorar();
}

// Pone el punto en cada enlace de los grupos que comprueban y el resumen en la cabecera.
export function decorar() {
  const grupos = gruposQueComprueban();
  for (const g of grupos) {
    for (const fila of document.querySelectorAll(`.grupo[data-id="${CSS.escape(g.id)}"] .fila[data-id]`)) {
      const e = g.enlaces.find(x => x.id === fila.dataset.id);
      const st = e && estados.get(origenDe(e.url));
      let marca = fila.querySelector('.estado-enlace');
      if (!marca) {
        marca = crear('span', 'estado-enlace');
        marca.append(crear('i', 'punto'), crear('span', 'ms'));
        fila.insertBefore(marca, fila.querySelector('.borrar'));
      }
      const estado = st?.estado ?? 'pendiente';
      marca.dataset.estado = estado;
      marca.title = TEXTO[estado] ?? 'Sin comprobar';
      marca.setAttribute('role', 'img');
      marca.setAttribute('aria-label', marca.title + (st && estado !== 'caido' ? `, ${st.ms} ms` : ''));
      marca.querySelector('.ms').textContent = st && estado !== 'caido' && estado !== 'desconocido' ? `${st.ms} ms` : '';
    }
  }
  pintarResumen(grupos);
}

function pintarResumen(grupos) {
  const resumen = $('#resumen-estado');
  const enlaces = grupos.flatMap(g => g.enlaces).filter(e => estados.has(origenDe(e.url)));
  resumen.hidden = !enlaces.length;
  if (!enlaces.length) return;
  const responden = enlaces.filter(e => ['vivo', 'lento'].includes(estados.get(origenDe(e.url)).estado)).length;
  const caidos = enlaces.filter(e => estados.get(origenDe(e.url)).estado === 'caido');
  const lentos = enlaces.filter(e => estados.get(origenDe(e.url)).estado === 'lento');
  let grave = '';
  if (caidos.length) {
    const desde = new Date(estados.get(origenDe(caidos[0].url)).desde).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    grave = caidos.length === 1 ? ` · ${caidos[0].nombre} no responde desde las ${desde}` : ` · ${caidos.length} no responden`;
  } else if (lentos.length) {
    grave = lentos.length === 1 ? ` · ${lentos[0].nombre} va lento` : ` · ${lentos.length} van lentos`;
  }
  resumen.textContent = `${responden} de ${enlaces.length} responden${grave}`;
  resumen.dataset.grave = caidos.length ? 'caido' : lentos.length ? 'lento' : '';
}

// Cada 60 s con la pestaña visible; al volver a ella, enseguida.
function programar() {
  clearTimeout(temporizador);
  if (document.hidden || !gruposQueComprueban().length) return;
  temporizador = setTimeout(async () => { await comprobarAhora(); programar(); }, cada());
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearTimeout(temporizador);
  else comprobarAhora().then(programar);
});
// Tras cada repintado de la rejilla los puntos se vuelven a poner; si ahora hay algún sitio sin comprobar, se comprueba.
document.addEventListener('novatab:pintado', () => {
  decorar();
  if (origenes().some(o => !estados.has(o))) comprobarAhora().then(programar);
  else if (!temporizador) programar();
});
