// El terreno de cada perfil: un relieve de ruido con semilla (por defecto, el id del perfil) que los
// estilos de fondos.js dibujan en un canvas como curvas, puntos, rayas… También hace las miniaturas.
import { FONDOS, POR_SEMILLA, azar, cuentaLuz, hashStr, reiniciarCuentaLuz } from './fondos.js';

export { hashStr, azar };

// Ruido de valor con cuatro octavas: la semilla decide la tabla y el desplazamiento. Devuelve f(x, y) en [0, 1].
export function ruido(semilla) {
  const r = azar(hashStr(semilla));
  const p = new Uint16Array(512), v = new Float32Array(256);
  for (let i = 0; i < 256; i++) { p[i] = i; v[i] = r(); }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const s = t => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
    const a = v[p[p[X] + Y]], b = v[p[p[X + 1] + Y]], c = v[p[p[X] + Y + 1]], d = v[p[p[X + 1] + Y + 1]];
    const u = s(xf), w = s(yf);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  const ox = r() * 200, oy = r() * 200;
  return (x, y) => {
    let f = 0, amp = 1, fr = 1, tot = 0;
    for (let o = 0; o < 4; o++) {
      f += amp * n(x * fr + ox, y * fr + oy);
      tot += amp;
      amp *= 0.5;
      fr *= 2.03;
    }
    return f / tot;
  };
}

export const plana = () => 0.5;
const reducido = matchMedia('(prefers-reduced-motion: reduce)');
// Cuánto avanza el tiempo del relieve por segundo según el movimiento elegido.
export const VELOCIDAD = { quieto: 0, lento: 0.45, vivo: 1.5 };
export const suave = k => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

export class Terreno {
  // colores: { bg, ink, acento, modo } fijos (miniaturas); sin ellos se leen del tema en cada dibujo.
  constructor(canvas, { estatico = false, colores = null } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.celda = 22;
    this.colores = colores;
    this.escala = 1;
    this.t = 0;
    this.op = { semilla: '', estilo: 'curvas', densidad: 0.55, relieve: 0.45, movimiento: 'lento', brillo: true };
    this.campoA = plana;
    this.campoB = null;
    this.k = 1;
    this.semAnt = '';
    this.raton = null;
    this.dibujos = 0;
    this.estadistica = { luz: 0 };
    this.pendiente = false;
    this.ultimo = 0;
    this.redibujarHasta = 0;
    this.vueltas = 0; // fotogramas pedidos (el bucle descansa cuando no hay nada que hacer)
    this.enMarcha = false;
    this.estatico = estatico;
    if (estatico) return;
    this.bucle = this.bucle.bind(this);
    this.medir();
    addEventListener('resize', () => { this.medir(); this.pedir(); });
    // La luz sigue al ratón; sin luz, moverlo no obliga a dibujar.
    addEventListener('pointermove', e => {
      const r = this.c.getBoundingClientRect();
      if (!r.width) return;
      this.raton = { x: (e.clientX - r.left) * this.w / r.width, y: (e.clientY - r.top) * this.h / r.height };
      if (this.op.brillo) this.pedir();
    });
    document.addEventListener('pointerleave', () => { this.raton = null; this.pedir(); });
    document.addEventListener('visibilitychange', () => this.despertar());
    this.despertar();
  }

  // El bucle solo corre mientras hay algo que hacer; cualquier cambio lo despierta.
  despertar() {
    if (this.enMarcha || this.estatico) return;
    this.enMarcha = true;
    this.prev = 0;
    requestAnimationFrame(this.bucle);
  }

  // Cada fotograma: con la pestaña oculta o el canvas oculto se detiene; durante una transformación dibuja
  // siempre; si no, como mucho cada 33 ms y solo si el relieve se mueve o hay un cambio pendiente. Sin nada
  // de eso, deja de pedir fotogramas hasta el siguiente cambio.
  bucle(ahora) {
    this.vueltas++;
    const dt = this.prev ? Math.min(0.1, (ahora - this.prev) / 1000) : 0;
    this.prev = ahora;
    if (document.hidden || !this.w || this.c.hidden) { // oculto con «liso», la imagen o intensidad 0
      this.enMarcha = false;
      return;
    }
    const vel = reducido.matches ? 0 : VELOCIDAD[this.op.movimiento] ?? 0;
    this.t += dt * vel;
    if (this.campoB) {
      this.k = Math.min(1, this.k + dt / 1.3);
      if (this.k >= 1) {
        this.campoA = this.campoB;
        this.campoB = null;
      }
      this.ultimo = ahora;
      this.pendiente = false;
      this.dibujar();
      requestAnimationFrame(this.bucle);
      return;
    }
    if ((this.pendiente || vel || ahora < this.redibujarHasta) && ahora - this.ultimo > 33) {
      this.ultimo = ahora;
      this.pendiente = false;
      this.dibujar();
    }
    if (vel || this.pendiente || ahora < this.redibujarHasta) requestAnimationFrame(this.bucle);
    else this.enMarcha = false;
  }

  medir() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.w = this.c.clientWidth || innerWidth;
    this.h = this.c.clientHeight || innerHeight;
    this.c.width = Math.round(this.w * this.dpr);
    this.c.height = Math.round(this.h * this.dpr);
  }

  // Un dibujo en cuanto lo permita el bucle (varios cambios seguidos dan uno solo).
  pedir() {
    this.pendiente = true;
    this.despertar();
  }

  // Dibujar durante un rato aunque el relieve esté quieto: los colores del tema cambian con una transición.
  pedirDurante(ms) {
    this.redibujarHasta = Math.max(this.redibujarHasta, performance.now() + ms);
    this.pedir();
  }

  // Una semilla nueva (otro perfil u otro terreno) transforma el relieve durante 1,3 s; si llega en mitad de
  // otra transformación, se parte de donde iba aquella. Al abrir, el relieve «sube» desde el llano.
  config(op) {
    const antes = this.op.semilla;
    const nueva = op.semilla && op.semilla !== antes;
    Object.assign(this.op, op);
    if (nueva) {
      if (this.campoB) this.campoA = this.campoB;
      this.campoB = ruido(op.semilla);
      this.semAnt = antes;
      this.k = reducido.matches ? 1 : 0;
    }
    this.pedir();
  }

  // Altura del relieve en un punto del canvas (en píxeles CSS); durante un cambio de semilla mezcla los dos.
  valor(x, y) {
    const e = (640 - 380 * this.op.relieve) * this.escala;
    const u = x / e + this.t * 0.03, v = y / e + this.t * 0.017;
    const a = this.campoA(u, v);
    if (!this.campoB) return a;
    return a + (this.campoB(u, v) - a) * suave(this.k);
  }

  dibujar() {
    if (this.colores === null && this.c.clientWidth && this.c.clientWidth !== this.w) this.medir();
    const { ctx, w, h } = this;
    this.dibujos++;
    const raiz = getComputedStyle(document.documentElement);
    const col = this.colores || {
      bg: raiz.getPropertyValue('--bg').trim(),
      ink: raiz.getPropertyValue('--ink').trim(),
      acento: raiz.getPropertyValue('--acento').trim(),
      modo: document.documentElement.dataset.modo,
    };
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (this.colores) {
      ctx.fillStyle = col.bg;
      ctx.fillRect(0, 0, w, h);
    }
    const estilo = FONDOS[this.op.estilo];
    if (!estilo) return;
    // Rejilla de alturas para los estilos que la usan (curvas) y para el rango de alturas de los demás.
    const c = this.celda, cols = Math.ceil(w / c) + 1, filas = Math.ceil(h / c) + 1;
    const g = new Float32Array(cols * filas);
    let min = 1, max = 0;
    for (let i = 0; i < filas; i++) for (let j = 0; j < cols; j++) {
      const v = this.valor(j * c, i * c);
      g[i * cols + j] = v;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const base = col.modo === 'claro' ? 0.2 : 0.15;
    const r = this.raton && this.op.brillo ? this.raton : null;
    const args = { g, cols, filas, min, max, ink: col.ink, acento: col.acento, bg: col.bg, base, r, luz: 0.9, semilla: this.op.semilla };
    reiniciarCuentaLuz();
    if (this.campoB && POR_SEMILLA.has(this.op.estilo)) {
      // Los dibujos que salen de la semilla y no del relieve se funden: el del perfil viejo se va y llega el nuevo.
      const k = suave(this.k);
      if (this.semAnt) estilo.dibujar(this, ctx, { ...args, semilla: this.semAnt, base: base * (1 - k), luz: 0.9 * (1 - k) });
      estilo.dibujar(this, ctx, { ...args, base: base * k, luz: 0.9 * k });
    } else {
      estilo.dibujar(this, ctx, args);
    }
    ctx.globalAlpha = 1;
    this.estadistica = { luz: cuentaLuz() };
  }
}

// Una vista fija del terreno con los colores de un tema (muestras de fondo, de tema y de perfil).
export function miniatura(canvas, { semilla, estilo, densidad, relieve, tema }) {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w) return;
  const T = new Terreno(canvas, { estatico: true, colores: tema });
  T.celda = Math.max(3, w / 36);
  T.dpr = Math.min(2, devicePixelRatio || 1);
  T.w = w;
  T.h = h;
  canvas.width = Math.round(w * T.dpr);
  canvas.height = Math.round(h * T.dpr);
  T.escala = w / innerWidth;
  T.op = { ...T.op, semilla, estilo, densidad, relieve, brillo: false };
  T.campoA = ruido(semilla);
  T.dibujar();
}
