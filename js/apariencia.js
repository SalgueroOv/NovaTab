// Tema, opciones, paneles, fondo y reloj.
import { $, avisar, crear, svg } from './util.js';
import { escribir } from './almacen.js';
import { datos } from './datos.js';
import { pintar, pintarLocal } from './pintado.js';
import { editando } from './edicion.js';

export const CLAVE_TEMA = 'tema';
export const CLAVE_OPCIONES = 'opciones';
export const OPCIONES = { fondoGrupos: true, sobrio: false, reunion: false, ocultos: { izq: false, der: false } };

export const TEMAS = [
  { id: 'bosque', nombre: 'Bosque', modo: 'oscuro', muestra: ['#18221d', '#2f4438'] },
  { id: 'noche', nombre: 'Noche', modo: 'oscuro', muestra: ['#111316', '#29303a'] },
  { id: 'papel', nombre: 'Papel', modo: 'claro', muestra: ['#f5f0e6', '#d8c9ab'] },
  { id: 'glaciar', nombre: 'Glaciar', modo: 'claro', muestra: ['#eaf2f6', '#b9d1e1'] },
];

export const muestras = TEMAS.map(t => {
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

export function ponerTema(id) {
  const t = TEMAS.find(x => x.id === id) || TEMAS[0];
  document.documentElement.dataset.tema = t.id;
  document.documentElement.dataset.modo = t.modo;
  muestras.forEach(m => m.setAttribute('aria-pressed', String(m.dataset.tema === t.id)));
}

export let opciones = { ...OPCIONES };

export function ponerOpciones(o) {
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

export const panelTema = $('#panel-tema');
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
export function pintarFondo() {
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


export function reloj() {
  const d = new Date();
  $('#hora').textContent = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  $('#fecha').textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}
