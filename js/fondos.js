// Los dibujos de fondo: nueve formas minimalistas (líneas y puntos a pantalla completa) de dibujar el
// terreno del perfil (ver terreno.js). Cada uno pinta en el contexto de un canvas con la tinta del tema;
// lo que queda cerca del ratón se repinta en el color de acento, difuminado hacia el borde.
// Los que salen de la semilla y no del relieve (POR_SEMILLA) se funden al cambiar de perfil.

export function hashStr(s) {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Generador pseudoaleatorio con semilla (mulberry32).
export function azar(semilla) {
  let a = semilla;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export const POR_SEMILLA = new Set(['grafo', 'trama', 'galaxia']);

// ---------- Luz bajo el ratón ----------

export const RADIO = 190;
export const BINS = 10;
let iluminados = 0;
export const reiniciarCuentaLuz = () => { iluminados = 0; };
export const cuentaLuz = () => iluminados;

// Nivel de luz de 0 a BINS-1 que crece hacia el centro con una curva suave, o -1 lejos del ratón.
export function nivelLuz(r, x, y) {
  if (!r) return -1;
  const d2 = (x - r.x) ** 2 + (y - r.y) ** 2;
  if (d2 >= RADIO * RADIO) return -1;
  const t = 1 - Math.sqrt(d2) / RADIO;
  iluminados++;
  return Math.min(BINS - 1, Math.floor(t * t * (3 - 2 * t) * BINS));
}
export const capasLuz = () => Array.from({ length: BINS }, () => new Path2D());
// La opacidad de cada capa: la exterior casi transparente, así la luz se difumina sin dejar un círculo.
export const alfaLuz = (i, tope) => tope * ((i + 0.5) / BINS) ** 1.7;
export function pintarLuz(ctx, capas, acento, tope, modo = 'stroke') {
  ctx.strokeStyle = acento;
  ctx.fillStyle = acento;
  capas.forEach((ruta, i) => {
    ctx.globalAlpha = alfaLuz(i, tope);
    ctx[modo](ruta);
  });
}

// Datos fijos por semilla (nodos, estrellas), guardados para no rehacerlos en cada dibujo.
const guardados = new Map();
function fijo(clave, crear) {
  if (!guardados.has(clave)) {
    if (guardados.size > 40) guardados.clear();
    guardados.set(clave, crear());
  }
  return guardados.get(clave);
}

// ---------- Curvas de nivel («marching squares») ----------

// Segmentos de cada caso; bordes: 0 arriba, 1 derecha, 2 abajo, 3 izquierda.
const TABLA = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[0, 1]], [[3, 0], [2, 1]], [[0, 2]], [[3, 0]], [[3, 0]], [[0, 2]], [[0, 1], [3, 2]], [[0, 1]], [[3, 1]], [[2, 1]], [[3, 2]], []];
function borde(e, x0, y0, c, a, b, cc, d, L) {
  if (e === 0) return [x0 + c * (L - a) / (b - a), y0];
  if (e === 1) return [x0 + c, y0 + c * (L - b) / (cc - b)];
  if (e === 2) return [x0 + c * (L - d) / (cc - d), y0 + c];
  return [x0, y0 + c * (L - a) / (d - a)];
}

function curvas(T, ctx, { g, cols, filas, min, max, ink, acento, base, r, luz }) {
  if (max - min < 0.002) return;
  const n = Math.round(8 + 22 * T.op.densidad), c = T.celda;
  const lejos = new Path2D(), indice = new Path2D(), capas = capasLuz();
  for (let l = 1; l < n; l++) {
    const L = min + (max - min) * l / n, destino = l % 5 === 0 ? indice : lejos;
    for (let i = 0; i < filas - 1; i++) for (let j = 0; j < cols - 1; j++) {
      const a = g[i * cols + j], b = g[i * cols + j + 1], cc = g[(i + 1) * cols + j + 1], d = g[(i + 1) * cols + j];
      const segs = TABLA[(a > L) << 3 | (b > L) << 2 | (cc > L) << 1 | (d > L)];
      if (!segs.length) continue;
      const x0 = j * c, y0 = i * c;
      for (const [e1, e2] of segs) {
        const p = borde(e1, x0, y0, c, a, b, cc, d, L), q = borde(e2, x0, y0, c, a, b, cc, d, L);
        destino.moveTo(p[0], p[1]);
        destino.lineTo(q[0], q[1]);
        const lv = nivelLuz(r, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        if (lv >= 0) { capas[lv].moveTo(p[0], p[1]); capas[lv].lineTo(q[0], q[1]); }
      }
    }
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.globalAlpha = base;
  ctx.stroke(lejos);
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = Math.min(1, base * 1.9);
  ctx.stroke(indice);
  ctx.lineWidth = 1.4;
  pintarLuz(ctx, capas, acento, luz);
}

// Cotas: una retícula de puntos, más gruesos cuanto más alto.
function cotas(T, ctx, { min, max, ink, acento, base, r, luz }) {
  const f = Math.max(0.35, Math.min(1, T.escala * 2));
  const paso = Math.max(4, (30 - 14 * T.op.densidad) * Math.min(1, T.escala * 2.2));
  const puntos = new Path2D(), capas = capasLuz();
  for (let y = paso / 2; y < T.h; y += paso) for (let x = paso / 2; x < T.w; x += paso) {
    const n = (T.valor(x, y) - min) / (max - min || 1), rad = (0.45 + n * n * 2.8) * f;
    puntos.moveTo(x + rad, y);
    puntos.arc(x, y, rad, 0, Math.PI * 2);
    const lv = nivelLuz(r, x, y);
    if (lv >= 0) { capas[lv].moveTo(x + rad + 0.6, y); capas[lv].arc(x, y, rad + 0.6, 0, Math.PI * 2); }
  }
  ctx.fillStyle = ink;
  ctx.globalAlpha = Math.min(1, base * 2.2);
  ctx.fill(puntos);
  pintarLuz(ctx, capas, acento, luz, 'fill');
}

// Sombreado: trazos cortos en la dirección de la pendiente, más largos cuanto más empinada.
function sombreado(T, ctx, { min, max, ink, acento, base, r, luz }) {
  const paso = Math.max(4, (20 - 8 * T.op.densidad) * Math.min(1, T.escala * 2.2));
  const e = (640 - 380 * T.op.relieve) * T.escala, rango = max - min || 1;
  const trazos = new Path2D(), capas = capasLuz();
  for (let y = paso / 2; y < T.h; y += paso) for (let x = paso / 2; x < T.w; x += paso) {
    const v = T.valor(x, y), gx = T.valor(x + 1, y) - v, gy = T.valor(x, y + 1) - v, m = Math.hypot(gx, gy);
    if (!m) continue;
    const len = Math.min(paso * 0.95, m / rango * e * paso * 0.5);
    if (len < 0.6) continue;
    const ux = gx / m * len / 2, uy = gy / m * len / 2;
    trazos.moveTo(x - ux, y - uy);
    trazos.lineTo(x + ux, y + uy);
    const lv = nivelLuz(r, x, y);
    if (lv >= 0) { capas[lv].moveTo(x - ux, y - uy); capas[lv].lineTo(x + ux, y + uy); }
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = ink;
  ctx.globalAlpha = Math.min(1, base * 2);
  ctx.stroke(trazos);
  pintarLuz(ctx, capas, acento, luz);
}

// Crestas: perfiles de altura en filas, de atrás adelante; cada fila tapa las de detrás con el color del
// fondo. Bajo el ratón solo se iluminan los tramos cercanos, no la fila entera.
function crestas(T, ctx, { min, max, ink, acento, base, bg, r, luz }) {
  const f = Math.min(1, T.escala * 2.2), paso = Math.max(3, (28 - 14 * T.op.densidad) * f), dx = Math.max(2, 8 * f);
  const amp = paso * (2.2 + 3.4 * T.op.relieve), rango = max - min || 1;
  ctx.lineWidth = 1.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let y0 = paso; y0 < T.h + amp; y0 += paso) {
    const linea = new Path2D(), capas = r && Math.abs(r.y - y0) < RADIO + amp ? capasLuz() : null;
    let px = 0, py = 0;
    for (let x = 0; x <= T.w + dx; x += dx) {
      const n = (T.valor(x, y0) - min) / rango, y = y0 - n * n * amp;
      if (x === 0) linea.moveTo(x, y);
      else {
        linea.lineTo(x, y);
        const lv = capas ? nivelLuz(r, (px + x) / 2, (py + y) / 2) : -1;
        if (lv >= 0) { capas[lv].moveTo(px, py); capas[lv].lineTo(x, y); }
      }
      px = x;
      py = y;
    }
    const relleno = new Path2D(linea);
    relleno.lineTo(T.w + dx, T.h + amp);
    relleno.lineTo(0, T.h + amp);
    relleno.closePath();
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fill(relleno);
    ctx.strokeStyle = ink;
    ctx.globalAlpha = Math.min(1, base * 2.4);
    ctx.stroke(linea);
    if (capas) pintarLuz(ctx, capas, acento, luz);
  }
}

// Grafo: nodos que se mecen despacio, cada uno unido a sus dos vecinos más cercanos de ese momento.
function grafo(T, ctx, { ink, acento, base, r, luz, semilla }) {
  const nodos = fijo(`grafo/${semilla}`, () => {
    const a = azar(hashStr(`${semilla}/grafo`));
    return Array.from({ length: Math.round(innerWidth * innerHeight / 15000) }, () => ({ x: a(), y: a(), s: a(), f: a() * 6.28, g: a() * 6.28, v: 0.5 + a() }));
  });
  const k = Math.max(0.3, Math.min(1, T.escala * 2)), amp = 18 * T.escala;
  const pos = nodos.map(n => [n.x * T.w + Math.sin(T.t * 0.35 * n.v + n.f) * amp, n.y * T.h + Math.cos(T.t * 0.3 * n.v + n.g) * amp]);
  const aristas = new Path2D(), capas = capasLuz(), vistas = new Set();
  pos.forEach((a, i) => {
    let m1 = -1, m2 = -1, d1 = Infinity, d2 = Infinity;
    pos.forEach((b, j) => {
      if (j === i) return;
      const d = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
      if (d < d1) { d2 = d1; m2 = m1; d1 = d; m1 = j; } else if (d < d2) { d2 = d; m2 = j; }
    });
    for (const j of [m1, m2]) {
      const clave = Math.min(i, j) * 100000 + Math.max(i, j);
      if (j < 0 || vistas.has(clave)) continue;
      vistas.add(clave);
      const b = pos[j];
      aristas.moveTo(a[0], a[1]);
      aristas.lineTo(b[0], b[1]);
      const lv = nivelLuz(r, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      if (lv >= 0) { capas[lv].moveTo(a[0], a[1]); capas[lv].lineTo(b[0], b[1]); }
    }
  });
  ctx.lineWidth = 1;
  ctx.strokeStyle = ink;
  ctx.globalAlpha = Math.min(1, base * 2);
  ctx.stroke(aristas);
  ctx.lineWidth = 1.4;
  pintarLuz(ctx, capas, acento, luz);
  const chicos = new Path2D(), grandes = new Path2D(), luzNodos = capasLuz();
  nodos.forEach((n, i) => {
    const [x, y] = pos[i], rad = (n.s > 0.9 ? 6 + n.s * 3 : 2 + n.s * 3) * k, ruta = n.s > 0.9 ? grandes : chicos;
    ruta.moveTo(x + rad, y);
    ruta.arc(x, y, rad, 0, Math.PI * 2);
    const lv = nivelLuz(r, x, y);
    if (lv >= 0) { luzNodos[lv].moveTo(x + rad, y); luzNodos[lv].arc(x, y, rad, 0, Math.PI * 2); }
  });
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.globalAlpha = Math.min(1, base * 3);
  ctx.fill(chicos);
  ctx.lineWidth = 1.5;
  ctx.stroke(grandes);
  pintarLuz(ctx, luzNodos, acento, luz, 'fill');
}

// Rayas: diagonales paralelas, cada quinta más marcada, que se deslizan despacio.
function rayas(T, ctx, { ink, acento, base, r, luz }) {
  const f = Math.min(1, T.escala * 2.2), paso = Math.max(4, (48 - 24 * T.op.densidad) * f), tramo = Math.max(4, 24 * f);
  const desliza = (T.t * 8 * f) % (paso * 5);
  const finas = new Path2D(), maestras = new Path2D(), capas = capasLuz();
  for (let k = 0, x = -T.h - paso * 5 + desliza; x < T.w + paso; k++, x += paso) {
    const ruta = k % 5 === 0 ? maestras : finas;
    ruta.moveTo(x, T.h);
    ruta.lineTo(x + T.h, 0);
    if (r && Math.abs((r.x - x) - (T.h - r.y)) < RADIO * 1.5) {
      for (let d = 0; d < T.h; d += tramo) {
        const lv = nivelLuz(r, x + d + tramo / 2, T.h - d - tramo / 2);
        if (lv >= 0) { capas[lv].moveTo(x + d, T.h - d); capas[lv].lineTo(x + d + tramo, T.h - d - tramo); }
      }
    }
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.globalAlpha = Math.min(1, base * 1.3);
  ctx.stroke(finas);
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = Math.min(1, base * 2.4);
  ctx.stroke(maestras);
  ctx.lineWidth = 1.4;
  pintarLuz(ctx, capas, acento, luz);
}

// Líneas rectas en tramos cortos, cada tramo más o menos visible según el relieve que tiene debajo.
// familias: [ángulo, marcar cada quinta]; paso: separación entre líneas paralelas.
function lineasPorTramos(T, ctx, { min, max, ink, acento, base, r, luz }, familias, paso, alfas) {
  const f = Math.min(1, T.escala * 2.2), tramo = Math.max(4, 16 * f), rango = max - min || 1;
  const cx = T.w / 2, cy = T.h / 2, D = Math.hypot(T.w, T.h) / 2 + paso * 5;
  const capas = [0, 1, 2, 3].map(() => new Path2D()), maestras = [0, 1, 2, 3].map(() => new Path2D()), luzC = capasLuz();
  for (const [th, marcar] of familias) {
    const dx = Math.cos(th), dy = Math.sin(th);
    for (let k = Math.round(-D / paso), o = k * paso; o <= D; k++, o += paso) {
      const destino = marcar && k % 5 === 0 ? maestras : capas;
      for (let d = -D; d < D; d += tramo) {
        const x0 = cx - dy * o + dx * d, y0 = cy + dx * o + dy * d, x1 = x0 + dx * tramo, y1 = y0 + dy * tramo, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        if (mx < -tramo || my < -tramo || mx > T.w + tramo || my > T.h + tramo) continue;
        const q = Math.max(0, Math.min(3, Math.floor((T.valor(mx, my) - min) / rango * 4)));
        destino[q].moveTo(x0, y0);
        destino[q].lineTo(x1, y1);
        const lv = nivelLuz(r, mx, my);
        if (lv >= 0) { luzC[lv].moveTo(x0, y0); luzC[lv].lineTo(x1, y1); }
      }
    }
  }
  ctx.lineCap = 'butt';
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  capas.forEach((ruta, i) => { ctx.globalAlpha = Math.min(1, base * alfas[i]); ctx.stroke(ruta); });
  ctx.lineWidth = 1.5;
  maestras.forEach((ruta, i) => { ctx.globalAlpha = Math.min(1, base * alfas[i] * 1.4); ctx.stroke(ruta); });
  ctx.lineWidth = 1.3;
  pintarLuz(ctx, luzC, acento, luz);
}

// Rombos: solo la red, dos familias de diagonales; una de cada cinco líneas va más marcada.
function rombos(T, ctx, args) {
  const f = Math.min(1, T.escala * 2.2), a = Math.max(4, (36 - 14 * T.op.densidad) * f), b = a * 0.58;
  const th = Math.atan2(b, a);
  lineasPorTramos(T, ctx, args, [[th, true], [-th, true]], 2 * b * Math.cos(th), [0.35, 0.8, 1.4, 2.2]);
}

// Trama: tres familias de rectas que se cruzan formando triángulos; el giro sale de la semilla.
function trama(T, ctx, args) {
  const f = Math.min(1, T.escala * 2.2), paso = Math.max(5, (72 - 34 * T.op.densidad) * f);
  const giro = azar(hashStr(`${args.semilla}/trama`))() * Math.PI / 3 + T.t * 0.003;
  lineasPorTramos(T, ctx, args, [0, 1, 2].map(i => [giro + i * Math.PI / 3, false]), paso, [0.3, 0.9, 1.7, 2.8]);
}

// Galaxia: brazos en espiral más grandes que la pantalla, nebulosa desenfocada a lo largo de ellos, un núcleo
// y estrellas sueltas que titilan. Gira entera muy despacio; brazos, centro e inclinación salen de la semilla.
function galaxia(T, ctx, { ink, acento, base, r, luz, semilla }) {
  const G = fijo(`galaxia/${semilla}`, () => {
    const a = azar(hashStr(`${semilla}/galaxia`)), area = innerWidth * innerHeight;
    const brazos = 2 + Math.floor(a() * 3), giro = 2.4 + a() * 1.6, gauss = () => (a() + a() + a() - 1.5) / 1.5;
    const enBrazo = (rr, ancho) => Math.floor(a() * brazos) * Math.PI * 2 / brazos + Math.log(1 + rr * 9) * giro + gauss() * ancho;
    const fondo = Array.from({ length: Math.round(area / 360) }, () => [a(), a(), a(), a() * 6.28]);
    const espiral = Array.from({ length: Math.round(area / 75) }, () => {
      const rr = 0.03 + Math.pow(a(), 0.85) * 0.97;
      return [rr, enBrazo(rr, 0.26 - 0.12 * rr), a(), a() < 0.035 ? 1 : 0];
    });
    const nucleo = Array.from({ length: Math.round(area / 500) }, () => [Math.abs(gauss()) * 0.06, a() * 6.28, a(), 0]);
    const nebulosa = Array.from({ length: Math.round(area / 2600) }, () => { const rr = 0.05 + Math.pow(a(), 0.9) * 0.9; return [rr, enBrazo(rr, 0.16), 0.4 + a() * 0.6]; });
    return { cx: 0.56 + a() * 0.24, cy: 0.3 + a() * 0.4, plano: 0.55 + a() * 0.3, rot: a() * 6.28, fondo, espiral: espiral.concat(nucleo), nebulosa };
  });
  const f = Math.max(0.35, Math.min(1, T.escala * 2.2)), R = Math.hypot(T.w, T.h) * 0.8, cx = G.cx * T.w, cy = G.cy * T.h;
  const giro = G.rot + T.t * 0.015, cg = Math.cos(giro), sg = Math.sin(giro);
  const situar = (rr, ang) => {
    const ex = Math.cos(ang) * rr * R, ey = Math.sin(ang) * rr * R * G.plano;
    return [cx + ex * cg - ey * sg, cy + ex * sg + ey * cg];
  };
  const nubes = new Path2D();
  for (const [rr, ang, t] of G.nebulosa) {
    const [px, py] = situar(rr, ang), rad = (18 + t * 34) * f * (1.2 - rr * 0.5);
    if (px < -rad || py < -rad || px > T.w + rad || py > T.h + rad) continue;
    nubes.moveTo(px + rad, py);
    nubes.arc(px, py, rad, 0, Math.PI * 2);
  }
  // La nebulosa va desenfocada: así no se ven los círculos que la forman.
  ctx.filter = `blur(${Math.max(2, 16 * f)}px)`;
  ctx.fillStyle = ink;
  ctx.globalAlpha = base * 0.3;
  ctx.fill(nubes);
  ctx.filter = 'none';
  const brillo = [0, 1, 2, 3].map(() => new Path2D()), color = new Path2D(), capas = capasLuz();
  const punto = (ruta, x, y, t) => ruta.rect(x - t / 2, y - t / 2, t, t);
  for (const [x, y, s, fase] of G.fondo) {
    const px = x * T.w, py = y * T.h, titila = 0.5 + 0.5 * Math.sin(T.t * 1.6 + fase), t = (0.7 + s * 1.2) * f;
    punto(brillo[Math.min(3, Math.floor((s * 0.6 + titila * 0.4) * 4))], px, py, t);
    const lv = nivelLuz(r, px, py);
    if (lv >= 0) punto(capas[lv], px, py, t + 0.8);
  }
  for (const [rr, ang, s, esAcento] of G.espiral) {
    const [px, py] = situar(rr, ang);
    if (px < -4 || py < -4 || px > T.w + 4 || py > T.h + 4) continue;
    const t = (0.8 + s * 1.5) * f * (1.15 - rr * 0.4);
    punto(esAcento ? color : brillo[Math.min(3, Math.floor((1 - rr) * 2.6 + s * 1.6))], px, py, t);
    const lv = nivelLuz(r, px, py);
    if (lv >= 0) punto(capas[lv], px, py, t + 0.8);
  }
  ctx.fillStyle = ink;
  brillo.forEach((ruta, i) => { ctx.globalAlpha = Math.min(1, base * [1.2, 2.2, 3.4, 5][i]); ctx.fill(ruta); });
  ctx.fillStyle = acento;
  ctx.globalAlpha = Math.min(1, base * 3.5);
  ctx.fill(color);
  pintarLuz(ctx, capas, acento, luz, 'fill');
}

export const FONDOS = {
  curvas: { nombre: 'Curvas', dibujar: curvas },
  cotas: { nombre: 'Cotas', dibujar: cotas },
  sombreado: { nombre: 'Sombreado', dibujar: sombreado },
  crestas: { nombre: 'Crestas', dibujar: crestas },
  grafo: { nombre: 'Grafo', dibujar: grafo },
  rayas: { nombre: 'Rayas', dibujar: rayas },
  rombos: { nombre: 'Rombos', dibujar: rombos },
  trama: { nombre: 'Trama', dibujar: trama },
  galaxia: { nombre: 'Galaxia', dibujar: galaxia },
};
