// Iconos elegidos para los enlaces. Dos catálogos, servidos por jsDelivr:
import { $, crear } from './util.js';

// - Apps: Dashboard Icons (homarr-labs, Apache-2.0), logos en color de servicios autoalojados.
// - Iconos: Lucide (ISC), iconos de línea de un solo color.
// En el enlace solo se guarda { set, nombre, formato }; el dibujo se pide al CDN al pintarlo.
// Se carga antes que app.js y usa sus funciones (crear, $) solo al llamarse.

export const CATALOGOS = {
  apps: {
    indice: 'https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/metadata.json',
    url: (nombre, formato = 'svg') => `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${formato}/${nombre}.${formato}`,
  },
  lucide: {
    indice: 'https://cdn.jsdelivr.net/npm/lucide-static@1.52.0/tags.json',
    url: nombre => `https://cdn.jsdelivr.net/npm/lucide-static@1.52.0/icons/${nombre}.svg`,
  },
};

// Lucide se etiqueta en inglés: las palabras más habituales se traducen antes de buscar.
export const TRADUCCIONES = {
  servidor: 'server', servidores: 'server', 'base de datos': 'database', datos: 'database', nube: 'cloud',
  correo: 'mail', calendario: 'calendar', musica: 'music', juego: 'gamepad', juegos: 'gamepad', red: 'network',
  disco: 'hard-drive', carpeta: 'folder', archivo: 'file', documento: 'file-text', codigo: 'code',
  grafico: 'chart', casa: 'house', inicio: 'house', usuario: 'user', usuarios: 'users', seguridad: 'shield',
  laboratorio: 'flask', genetica: 'dna', cerebro: 'brain', hospital: 'hospital', medico: 'stethoscope',
  libro: 'book', noticias: 'newspaper', video: 'video', foto: 'image', fotos: 'images', terminal: 'terminal',
  copia: 'archive', backup: 'archive', almacenamiento: 'hard-drive', grafo: 'git-fork', ia: 'sparkles',
  chat: 'message-circle', mensaje: 'message-circle', estadistica: 'chart-bar', tienda: 'store', mapa: 'map',
};

export const indices = {};

export const iconoValido = i => i && CATALOGOS[i.set] && /^[a-z0-9-]+$/.test(i.nombre)
  ? { set: i.set, nombre: i.nombre, ...(i.set === 'apps' ? { formato: ['svg', 'png', 'webp'].includes(i.formato) ? i.formato : 'svg' } : {}) }
  : null;

// El dibujo de un icono elegido, en el mismo círculo que las siglas y los favicons.
export function pintarIconoElegido(icono, tono) {
  if (icono.set === 'apps') {
    const caja = crear('span', 'icono favicon app');
    const img = crear('img');
    img.alt = '';
    img.loading = 'lazy';
    img.src = CATALOGOS.apps.url(icono.nombre, icono.formato);
    caja.append(img);
    return caja;
  }
  // Lucide se pinta como máscara: así toma el color que diga el CSS (el del grupo o el del tema).
  const caja = crear('span', 'icono lucide');
  caja.style.setProperty('--tono', tono);
  const glifo = crear('i');
  glifo.style.setProperty('--mascara', `url("${CATALOGOS.lucide.url(icono.nombre)}")`);
  caja.append(glifo);
  return caja;
}

export async function cargarIndice(set) {
  if (!indices[set]) {
    indices[set] = fetch(CATALOGOS[set].indice)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => set === 'apps'
        ? Object.entries(d).map(([nombre, m]) => ({ nombre, formato: m.base || 'svg', texto: [nombre, ...(m.aliases || []), ...(m.categories || [])].join(' ').toLowerCase() }))
        : Object.entries(d).map(([nombre, etiquetas]) => ({ nombre, texto: [nombre, ...etiquetas].join(' ').toLowerCase() })))
      .catch(err => { delete indices[set]; throw err; });
  }
  return indices[set];
}

export const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function buscarIconos(lista, consulta) {
  let q = sinTildes(consulta.trim().toLowerCase());
  for (const [es, en] of Object.entries(TRADUCCIONES)) q = q.replace(new RegExp(`\\b${es}\\b`, 'g'), en);
  const palabras = q.split(/\s+/).filter(Boolean);
  if (!palabras.length) return [];
  const nombreJunto = palabras.join('-');
  return lista
    .filter(i => palabras.every(p => i.texto.includes(p)))
    .sort((a, b) =>
      (b.nombre === nombreJunto) - (a.nombre === nombreJunto) ||
      b.nombre.startsWith(palabras[0]) - a.nombre.startsWith(palabras[0]) ||
      a.nombre.length - b.nombre.length)
    .slice(0, 96);
}

// Abre el selector. Devuelve el icono elegido, null si se quita, o undefined si se cancela.
export function elegirIcono(sugerencia, tono) {
  const dlg = $('#dlg-icono');
  const entrada = $('#icono-buscar');
  const resultados = $('#icono-resultados');
  const estado = $('#icono-estado');
  const pestanas = [...dlg.querySelectorAll('[data-set]')];
  let set = 'apps';
  let elegido;
  let turno = 0;

  async function pintar() {
    const mio = ++turno;
    pestanas.forEach(p => p.setAttribute('aria-selected', String(p.dataset.set === set)));
    if (!entrada.value.trim()) {
      resultados.replaceChildren();
      estado.textContent = set === 'apps' ? 'Escribe el nombre del servicio: proxmox, gitlab, synology…' : 'Escribe qué representa: servidor, base de datos, nube…';
      return;
    }
    estado.textContent = 'Cargando…';
    try {
      const lista = buscarIconos(await cargarIndice(set), entrada.value);
      if (mio !== turno) return;
      resultados.replaceChildren(...lista.map(i => {
        const b = crear('button', 'opcion-icono');
        b.type = 'button';
        b.title = i.nombre;
        const icono = iconoValido({ set, nombre: i.nombre, formato: i.formato });
        b.append(pintarIconoElegido(icono, tono), crear('span', null, i.nombre));
        b.addEventListener('click', () => { elegido = icono; dlg.close('ok'); });
        return b;
      }));
      estado.textContent = lista.length
        ? `${lista.length === 96 ? 'Más de 96' : lista.length} resultados.`
        : set === 'apps' ? 'Ningún logo con ese nombre. Prueba en la pestaña Iconos.' : 'Ningún icono con ese nombre.';
    } catch {
      if (mio === turno) estado.textContent = 'No se pudieron cargar los iconos. ¿Hay conexión?';
    }
  }

  let espera;
  const alEscribir = () => { clearTimeout(espera); espera = setTimeout(pintar, 150); };
  const alPestana = ev => { set = ev.currentTarget.dataset.set; pintar(); };
  const quitar = () => { elegido = null; dlg.close('ok'); };
  entrada.addEventListener('input', alEscribir);
  pestanas.forEach(p => p.addEventListener('click', alPestana));
  $('#icono-quitar').addEventListener('click', quitar);
  entrada.addEventListener('keydown', alEnter);
  function alEnter(ev) { if (ev.key === 'Enter') ev.preventDefault(); }

  entrada.value = sugerencia || '';
  dlg.returnValue = '';
  dlg.showModal();
  pintar();
  return new Promise(resolve => {
    dlg.addEventListener('close', () => {
      entrada.removeEventListener('input', alEscribir);
      entrada.removeEventListener('keydown', alEnter);
      pestanas.forEach(p => p.removeEventListener('click', alPestana));
      $('#icono-quitar').removeEventListener('click', quitar);
      resolve(dlg.returnValue === 'ok' ? elegido : undefined);
    }, { once: true });
  });
}

// El campo "Icono" del diálogo de enlace: una vista previa y los botones para elegir o quitar.
export function leerIcono(texto) {
  try { return iconoValido(JSON.parse(texto || 'null')); } catch { return null; }
}

export function refrescarCampoIcono() {
  const form = $('#dlg-enlace form');
  const icono = leerIcono(form.elements.icono.value);
  const vista = $('#vista-icono');
  vista.replaceChildren(icono
    ? pintarIconoElegido(icono, '#c9c9cc')
    : crear('span', 'icono letras', (form.elements.nombre.value.trim().slice(0, 2) || '?').toUpperCase()));
  $('#nombre-icono').textContent = icono ? `${icono.set === 'apps' ? 'Logo' : 'Icono'}: ${icono.nombre}` : 'Automático (siglas o favicon)';
  $('#btn-quitar-icono').hidden = !icono;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = $('#dlg-enlace form');
  $('#btn-elegir-icono').addEventListener('click', async () => {
    const r = await elegirIcono(form.elements.nombre.value, '#c9c9cc');
    if (r === undefined) return;
    form.elements.icono.value = r ? JSON.stringify(r) : '';
    refrescarCampoIcono();
  });
  $('#btn-quitar-icono').addEventListener('click', () => {
    form.elements.icono.value = '';
    refrescarCampoIcono();
  });
  form.elements.nombre.addEventListener('input', refrescarCampoIcono);
});
