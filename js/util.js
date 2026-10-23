// Utilidades comunes: DOM, iconos de interfaz, identificadores, URLs y avisos.

export const ICONOS = {
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
export const svg = nombre => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONOS[nombre]}"/></svg>`;

export const $ = s => document.querySelector(s);
export const $$ = s => [...document.querySelectorAll(s)];

export const nuevoId = () => crypto.randomUUID
  ? crypto.randomUUID()
  : Date.now().toString(36) + Math.random().toString(36).slice(2);
export const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

export function crear(tag, clase, texto) {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (texto != null) el.textContent = texto;
  return el;
}

// El foco está en un campo donde Ctrl+Z o las teclas son del texto: uno con contenido, un área de texto,
// un desplegable o algo editable. Un campo vacío (como el buscador al abrir la pestaña) no cuenta.
export function enCampoDeTexto(el) {
  const campo = el?.closest?.('input, textarea, select, [contenteditable]');
  return !!campo && (campo.value !== '' || campo.matches('textarea, select, [contenteditable]'));
}

export function urlSegura(url) {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export function partes(url) {
  try {
    const u = new URL(url);
    return { host: u.hostname, puerto: u.port || (u.protocol === 'https:' ? '443' : '80') };
  } catch {
    return { host: '', puerto: '' };
  }
}
export const direccion = url => { const p = partes(url); return p.host ? `${p.host}:${p.puerto}` : url; };
export const dominio = url => partes(url).host.replace(/^www\./, '');

export let temporizadorAviso;
let temporizadorAccion;
export function ocultarAvisoAccion() {
  $('#aviso-accion').hidden = true;
  clearTimeout(temporizadorAccion);
}

// Aviso con un botón (por ejemplo «Deshacer»): se oculta al pulsarlo o pasados «ms».
export function avisarConAccion(texto, etiqueta, accion, ms = 8000) {
  $('#aviso').hidden = true;
  const el = $('#aviso-accion');
  el.querySelector('span').textContent = texto;
  const boton = el.querySelector('button');
  boton.textContent = etiqueta;
  boton.onclick = () => { el.hidden = true; clearTimeout(temporizadorAccion); accion(); };
  el.hidden = false;
  clearTimeout(temporizadorAccion);
  temporizadorAccion = setTimeout(() => { el.hidden = true; }, ms);
}
export function avisar(texto) {
  ocultarAvisoAccion(); // los dos avisos comparten sitio: solo se ve uno
  const el = $('#aviso');
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { el.hidden = true; }, 3500);
}
