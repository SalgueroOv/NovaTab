// Los dibujos de fondo. Cada uno devuelve el contenido de un <svg viewBox="0 0 ancho alto">: solo path,
// circle, line y polygon, sin colores (los pone style.css con las variables del tema) y siempre igual
// para el mismo tamaño (el azar usa una semilla fija, así no cambia al repintar).

// Generador pseudoaleatorio con semilla (mulberry32).
function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = x => x.toFixed(1);
const maestra = k => (k % 5 === 0 ? ' class="maestra"' : '');

// Curvas de nivel: anillos deformados alrededor de dos cimas; cada quinto es una curva maestra.
function curvas(w, h) {
  const caminos = [];
  [[w * 0.08, h * 0.92, 1.3, 4.1], [w * 0.86, h * 0.12, 5.2, 2.7]].forEach(([cx, cy, f1, f2]) => {
    for (let k = 1; k <= 20; k++) {
      const base = k * 34;
      const puntos = [];
      for (let i = 0; i <= 140; i++) {
        const t = i / 140 * Math.PI * 2;
        const r = base * (1 + 0.11 * Math.sin(3 * t + f1 + k * 0.18) + 0.06 * Math.sin(5 * t + f2 - k * 0.12));
        puntos.push(`${n(cx + r * Math.cos(t))},${n(cy + r * Math.sin(t))}`);
      }
      caminos.push(`<path${maestra(k)} d="M${puntos.join('L')}Z"/>`);
    }
  });
  return caminos.join('');
}

// Grafo: nodos al azar unidos a sus dos vecinos más cercanos.
function grafo(w, h) {
  const r = azar(7);
  const nodos = Array.from({ length: Math.round(w * h / 15000) }, () => ({ x: r() * w, y: r() * h, s: r() }));
  const aristas = new Set();
  nodos.forEach((a, i) => {
    nodos.map((b, j) => [j, (a.x - b.x) ** 2 + (a.y - b.y) ** 2]).filter(([j]) => j !== i)
      .sort((x, y) => x[1] - y[1]).slice(0, 2)
      .forEach(([j]) => aristas.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const lineas = [...aristas].map(k => {
    const [i, j] = k.split('-').map(Number);
    return `<line x1="${n(nodos[i].x)}" y1="${n(nodos[i].y)}" x2="${n(nodos[j].x)}" y2="${n(nodos[j].y)}"/>`;
  });
  const circulos = nodos.map(p => p.s > 0.9
    ? `<circle class="grande" cx="${n(p.x)}" cy="${n(p.y)}" r="${n(6 + p.s * 3)}"/>`
    : `<circle cx="${n(p.x)}" cy="${n(p.y)}" r="${n(2 + p.s * 3)}"/>`);
  return lineas.join('') + circulos.join('');
}

// Teselas: una baldosa de 240 px (cuartos de círculo, un cuadrado con medio círculo y dos círculos) repetida.
function teselas(w, h) {
  const piezas = [];
  for (let y = 0; y < h; y += 240) {
    for (let x = 0; x < w; x += 240) {
      const t = `transform="translate(${x} ${y})"`;
      piezas.push(
        `<path class="f1" ${t} d="M0 0h120A120 120 0 0 1 0 120z"/>`,
        `<path class="f2" ${t} fill-rule="evenodd" d="M120 120h120v120h-120zM120 120a60 60 0 0 0 120 0z"/>`,
        `<circle class="f3" cx="${x + 180}" cy="${y + 60}" r="34"/>`,
        `<path class="f4" ${t} d="M0 240v-120a120 120 0 0 1 120 120z"/>`,
        `<circle class="f1" cx="${x + 60}" cy="${y + 180}" r="14"/>`,
      );
    }
  }
  return piezas.join('');
}

// Ondas: líneas onduladas paralelas, cada quinta más marcada.
function ondas(w, h) {
  const lineas = [];
  for (let k = 0, y = 12; y < h + 40; k++, y += 28) {
    const puntos = [];
    for (let x = 0; x <= w + 8; x += 8) puntos.push(`${x},${n(y + 9 * Math.sin(x / 70 + k * 0.5) + 5 * Math.sin(x / 31 - k * 0.3))}`);
    lineas.push(`<path${maestra(k)} d="M${puntos.join('L')}"/>`);
  }
  return lineas.join('');
}

// Puntos: una retícula, con uno más grande cada cuatro.
function puntos(w, h) {
  const p = [];
  for (let j = 0, y = 16; y < h; j++, y += 32) {
    for (let i = 0, x = 16; x < w; i++, x += 32) {
      p.push(i % 4 === 0 && j % 4 === 0
        ? `<circle class="grande" cx="${x}" cy="${y}" r="3"/>`
        : `<circle cx="${x}" cy="${y}" r="1.5"/>`);
    }
  }
  return p.join('');
}

// Rayas: diagonales paralelas, cada quinta más marcada.
function rayas(w, h) {
  const l = [];
  for (let k = 0, x = -h; x < w; k++, x += 36) l.push(`<line${maestra(k)} x1="${x}" y1="${h}" x2="${x + h}" y2="0"/>`);
  return l.join('');
}

// Cuadrícula tipo plano técnico: una línea cada 40 px y una maestra cada cinco.
function cuadricula(w, h) {
  const l = [];
  for (let k = 0, x = 0; x <= w; k++, x += 40) l.push(`<line${maestra(k)} x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  for (let k = 0, y = 0; y <= h; k++, y += 40) l.push(`<line${maestra(k)} x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  return l.join('');
}

// Hexágonos: un panal de hexágonos de 34 px de radio.
function hexagonos(w, h) {
  const radio = 34;
  const ancho = Math.sqrt(3) * radio;
  const p = [];
  for (let fila = 0, y = 0; y < h + radio; fila++, y += radio * 1.5) {
    for (let x = fila % 2 ? ancho / 2 : 0; x < w + ancho; x += ancho) {
      const vertices = Array.from({ length: 6 }, (_, i) => {
        const a = Math.PI / 6 + i * Math.PI / 3;
        return `${n(x + radio * Math.cos(a))},${n(y + radio * Math.sin(a))}`;
      });
      p.push(`<polygon points="${vertices.join(' ')}"/>`);
    }
  }
  return p.join('');
}

// Anillos: círculos concéntricos desde dos centros, cada quinto más marcado.
function anillos(w, h) {
  const c = [];
  [[w * 0.15, h * 0.85], [w * 0.85, h * 0.15]].forEach(([cx, cy]) => {
    for (let k = 1; k <= 24; k++) c.push(`<circle class="anillo${k % 5 === 0 ? ' maestra' : ''}" cx="${n(cx)}" cy="${n(cy)}" r="${k * 30}"/>`);
  });
  return c.join('');
}

// Montañas: diez crestas, de lejos a cerca; la de delante y cada quinta más marcadas.
function montanas(w, h) {
  const r = azar(11);
  const c = [];
  for (let k = 0; k < 10; k++) {
    const base = h * 0.3 + k * h * 0.07;
    let y = base;
    const puntos = [];
    for (let x = 0; x <= w + 60; x += 60) {
      y = Math.max(base - 90, Math.min(base + 40, y + (r() - 0.5) * 70));
      puntos.push(`${x},${n(y)}`);
    }
    c.push(`<path${k === 9 ? ' class="maestra"' : maestra(k)} d="M${puntos.join('L')}"/>`);
  }
  return c.join('');
}

export const FONDOS = {
  curvas: { nombre: 'Curvas de nivel', dibujar: curvas },
  grafo: { nombre: 'Grafo', dibujar: grafo },
  teselas: { nombre: 'Teselas', dibujar: teselas },
  ondas: { nombre: 'Ondas', dibujar: ondas },
  puntos: { nombre: 'Puntos', dibujar: puntos },
  rayas: { nombre: 'Rayas', dibujar: rayas },
  cuadricula: { nombre: 'Cuadrícula', dibujar: cuadricula },
  hexagonos: { nombre: 'Hexágonos', dibujar: hexagonos },
  anillos: { nombre: 'Anillos', dibujar: anillos },
  montanas: { nombre: 'Montañas', dibujar: montanas },
};
