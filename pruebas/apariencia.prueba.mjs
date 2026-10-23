import { afirmar, igual } from './lib/util.mjs';

const modulo = `import('/js/apariencia.js')`;
const acentoActual = `getComputedStyle(document.documentElement).getPropertyValue('--acento').trim()`;
const opcionesGuardadas = `JSON.parse(localStorage.getItem('opciones'))`;
const poner = (id, valor) => `(() => { const e = document.getElementById('${id}'); e.value = '${valor}'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`;

const DEFECTO = {
  acento: null, fondo: 'curvas', intensidad: 100, intensidadImagen: 40, densidad: 'comoda',
  esquinas: 'medio', hora24: true, segundos: false, fecha: true,
};

export default {
  nombre: 'apariencia: ajustes con valores seguros, pestañas y acento libre',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);

    // (a) Normalizar: lo inválido vuelve a su valor por defecto, uno a uno.
    for (const malo of [undefined, null, 'x', 7]) {
      igual(await pg.ev(`${modulo}.then(m => m.normalizarApariencia(${malo === undefined ? 'undefined' : JSON.stringify(malo)}))`), DEFECTO, `normalizar(${malo})`);
    }
    igual(await pg.ev(`${modulo}.then(m => m.normalizarApariencia({ acento: 'rojo', fondo: 'nada', intensidad: 500, densidad: 'x', esquinas: 3, hora24: 'sí' }))`),
      DEFECTO, 'normalizar con basura');
    igual(await pg.ev(`${modulo}.then(m => m.normalizarApariencia({ acento: '#E0245E', fondo: 'rayas', intensidad: 30, segundos: true, esquinas: 'recto' }))`),
      { ...DEFECTO, acento: '#e0245e', fondo: 'rayas', intensidad: 30, segundos: true, esquinas: 'recto' }, 'normalizar conserva lo válido');

    // (b) Opciones de antes de esta fase: la página arranca igual.
    pg = await abrir({ guardados: { opciones: { sobrio: true } } });
    await pg.esperar(300);
    igual(await pg.ev(acentoActual), '#8ab4f8', 'acento del tema sin apariencia guardada');
    afirmar(await pg.ev(`document.body.classList.contains('sobrio')`), 'el modo sobrio sigue activo');

    // (c) Tres pestañas.
    await pg.clic('#btn-tema');
    igual(await pg.ev(`[...document.querySelectorAll('#panel-tema [role="tab"]')].map(t => t.textContent)`), ['Tema', 'Fondo', 'Diseño'], 'pestañas');
    afirmar(await pg.ev(`document.getElementById('pestana-fondo').hidden`), 'Fondo oculto al principio');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    afirmar(!(await pg.ev(`document.getElementById('pestana-fondo').hidden`)), 'Fondo visible tras pulsar su pestaña');
    afirmar(await pg.ev(`document.getElementById('pestana-tema').hidden`), 'Tema oculto tras pulsar Fondo');
    igual(await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').getAttribute('aria-selected')`), 'true', 'aria-selected');
    await pg.tecla('Escape');
    afirmar(await pg.ev(`document.getElementById('panel-tema').hidden`), 'Escape cierra el panel');

    // (d) Acento libre: se mantiene al cambiar de tema y «Restaurar» lo quita.
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="tema"]').click()`);
    await pg.ev(poner('acento-libre', '#e0245e'));
    await pg.esperar(450); // el guardado de un control que se arrastra espera 250 ms
    igual(await pg.ev(acentoActual), '#e0245e', 'acento libre aplicado');
    igual((await pg.ev(opcionesGuardadas)).apariencia.acento, '#e0245e', 'acento guardado');
    await pg.ev(`document.querySelector('.muestra[data-tema="papel"]').click()`);
    await pg.esperar(200);
    igual(await pg.ev(acentoActual), '#e0245e', 'el acento sobrevive al cambio de tema');
    await pg.clic('#acento-restaurar');
    await pg.esperar(200);
    igual(await pg.ev(acentoActual), '#1a73e8', 'Restaurar vuelve al acento del tema Papel');
    igual((await pg.ev(opcionesGuardadas)).apariencia.acento, null, 'acento guardado como null');

    // (e) Texto sobre el acento: oscuro con un acento claro, claro con uno oscuro.
    const sobre = `getComputedStyle(document.documentElement).getPropertyValue('--sobre-acento').trim()`;
    await pg.ev(poner('acento-libre', '#ffeb3b'));
    await pg.esperar(150);
    igual(await pg.ev(sobre), '#1f1f1f', 'texto sobre amarillo');
    await pg.ev(poner('acento-libre', '#1a237e'));
    await pg.esperar(150);
    igual(await pg.ev(sobre), '#ffffff', 'texto sobre azul oscuro');

    // ---- Diseño ----
    const conApariencia = a => ({ guardados: { opciones: { apariencia: a } } });
    const PASOS = `(() => {
      const r = document.querySelector('#rejilla');
      const e = getComputedStyle(r);
      const cols = Number(e.getPropertyValue('--columnas')) || 12;
      return [(r.getBoundingClientRect().width + parseFloat(e.columnGap)) / cols, parseFloat(e.gridAutoRows) + parseFloat(e.rowGap)];
    })()`;
    const tituloDe = nombre => `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === '${nombre}')`;

    // (f) Densidad: la altura de fila cambia y el arrastre sigue cayendo en la celda correcta.
    pg = await abrir(conApariencia({ densidad: 'compacta' }));
    await pg.esperar(300);
    igual(await pg.ev(`getComputedStyle(document.querySelector('#rejilla')).gridAutoRows`), '32px', 'filas compactas');
    pg = await abrir();
    await pg.esperar(300);
    igual(await pg.ev(`getComputedStyle(document.querySelector('#rejilla')).gridAutoRows`), '40px', 'filas cómodas');
    pg = await abrir(conApariencia({ densidad: 'compacta' }));
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    const [col, fila] = await pg.ev(PASOS);
    const [x, y] = await pg.ev(`(() => { const r = ${tituloDe('Beta')}.querySelector('h3').getBoundingClientRect(); return [r.left + 10, r.top + r.height / 2]; })()`);
    await pg.arrastrar([x, y], [x - 6 * col, y + 7 * fila]);
    const grupos = (await pg.datos()).grupos.filter(g => g.zona === 'local');
    igual(grupos.find(g => g.nombre === 'Beta').pos.x, 1, 'Beta en la columna 1 con filas compactas');
    afirmar(grupos.find(g => g.nombre === 'Beta').pos.y >= 8, 'Beta en la fila 8 o más abajo con filas compactas');
    const solapan = (a, b) => a.pos.x < b.pos.x + b.pos.w && b.pos.x < a.pos.x + a.pos.w;
    afirmar(!grupos.some((a, i) => grupos.slice(i + 1).some(b => solapan(a, b) && Math.abs(a.pos.y - b.pos.y) < 1)), 'nada solapado');

    // (g) Esquinas: cambian los bloques y no los iconos redondos.
    const radio = (sel) => `getComputedStyle(document.querySelector('${sel}')).borderTopLeftRadius`;
    for (const [valor, px] of [['recto', '4px'], ['medio', '14px'], ['redondo', '24px']]) {
      pg = await abrir(conApariencia({ esquinas: valor }));
      await pg.esperar(300);
      igual(await pg.ev(radio('#rejilla .grupo')), px, `radio del grupo con esquinas ${valor}`);
      igual(await pg.ev(radio('#btn-editar')), '50%', `el icono redondo no cambia con ${valor}`);
    }

    // (h) Reloj: 12/24 h, segundos y fecha.
    const horaFecha = `[document.getElementById('hora').textContent, document.getElementById('fecha').hidden]`;
    pg = await abrir(conApariencia({ hora24: false }));
    await pg.esperar(300);
    afirmar(/[ap]\.?\s?m\./i.test((await pg.ev(horaFecha))[0]), 'reloj de 12 horas con a. m. o p. m.');
    pg = await abrir(conApariencia({ hora24: true }));
    await pg.esperar(300);
    afirmar(!/[ap]\.?\s?m\./i.test((await pg.ev(horaFecha))[0]), 'reloj de 24 horas sin a. m. ni p. m.');
    pg = await abrir(conApariencia({ segundos: true }));
    await pg.esperar(300);
    afirmar(/^\d{2}:\d{2}:\d{2}$/.test((await pg.ev(horaFecha))[0]), 'hora con segundos hh:mm:ss');
    const antes = (await pg.ev(horaFecha))[0];
    await pg.esperar(2200);
    afirmar((await pg.ev(horaFecha))[0] !== antes, 'con segundos la hora cambia en menos de 2,2 s');
    pg = await abrir(conApariencia({ fecha: false }));
    await pg.esperar(300);
    igual((await pg.ev(horaFecha))[1], true, 'fecha oculta');
    pg = await abrir(conApariencia({ segundos: false }));
    await pg.esperar(300);
    const sinSeg = (await pg.ev(horaFecha))[0];
    await pg.esperar(2200);
    igual((await pg.ev(horaFecha))[0], sinSeg, 'sin segundos la hora no cambia en 2,2 s');

    // (i) Los controles de la pestaña Diseño guardan los cinco ajustes y sobreviven a una recarga.
    pg = await abrir();
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="diseno"]').click()`);
    await pg.clic('#densidad-compacta');
    await pg.clic('#esquinas-redondo');
    await pg.ev(`document.getElementById('opt-hora24').click(); document.getElementById('opt-segundos').click(); document.getElementById('opt-fecha').click()`);
    await pg.esperar(300);
    const esperado = { densidad: 'compacta', esquinas: 'redondo', hora24: false, segundos: true, fecha: false };
    const guardado = (await pg.ev(opcionesGuardadas)).apariencia;
    igual({ densidad: guardado.densidad, esquinas: guardado.esquinas, hora24: guardado.hora24, segundos: guardado.segundos, fecha: guardado.fecha }, esperado, 'ajustes guardados');
    await pg.recargar();
    await pg.esperar(300);
    igual(await pg.ev(`getComputedStyle(document.querySelector('#rejilla')).gridAutoRows`), '32px', 'densidad tras recargar');
    igual(await pg.ev(radio('#rejilla .grupo')), '24px', 'esquinas tras recargar');
    igual((await pg.ev(horaFecha))[1], true, 'fecha oculta tras recargar');

    // ---- Revisión final ----
    // (j) Contraste del texto sobre el acento: elige el de mayor contraste con la luminosidad real.
    pg = await abrir();
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    for (const [color, texto] of [['#ff9800', '#1f1f1f'], ['#4caf50', '#1f1f1f'], ['#4fc3f7', '#1f1f1f'], ['#7e57c2', '#ffffff']]) {
      await pg.ev(poner('acento-libre', color));
      await pg.esperar(100);
      igual(await pg.ev(sobre), texto, `texto sobre ${color}`);
    }

    // (k) Arrastrar un control continuo no inunda sync ni deja que un eco viejo pise el valor.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    await pg.ev(`__chromeFalso.escritas()`);
    for (let i = 0; i < 40; i++) {
      const color = '#' + (0x100000 + i * 0x010203).toString(16).padStart(6, '0');
      await pg.ev(poner('acento-libre', color));
      await pg.esperar(15);
    }
    const ultimoColor = '#' + (0x100000 + 39 * 0x010203).toString(16).padStart(6, '0');
    igual(await pg.ev(acentoActual), ultimoColor, 'el acento se ve al instante mientras se arrastra');
    await pg.esperar(900);
    const escritasOpciones = (await pg.ev(`__chromeFalso.escritas()`)).filter(k => k === 'opciones').length;
    afirmar(escritasOpciones >= 1 && escritasOpciones <= 3, `como mucho 3 escrituras de opciones al arrastrar (hubo ${escritasOpciones})`);
    igual(await pg.ev(acentoActual), ultimoColor, 'ningún eco viejo pisa el acento');
    igual((await pg.ev(`JSON.parse(localStorage.getItem('chrome.sync/opciones'))`)).apariencia.acento, ultimoColor, 'se guardó el último valor');

    // (l) Con los valores por defecto la página se ve como en 4.2.0.
    pg = await abrir({ datos: { ...structuredClone((await import('./lib/datos-prueba.mjs')).DATOS_PRUEBA), widgets: [{ id: 'w-n', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }] } });
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    igual(await pg.ev(`getComputedStyle(document.getElementById('panel-tema')).borderTopLeftRadius`), '16px', 'radio del panel de personalizar');
    igual(await pg.ev(`getComputedStyle(document.querySelector('.widget')).borderTopLeftRadius`), '16px', 'radio de un widget');
    igual(await pg.ev(`getComputedStyle(document.querySelector('.derecha')).borderTopLeftRadius`), '28px', 'radio del panel derecho');

    // (m) El reloj con segundos late en el cambio de segundo, no a mitad.
    pg = await abrir({ guardados: { opciones: { apariencia: { segundos: true } } } });
    await pg.esperar(300);
    const desfase = [];
    for (let i = 0; i < 4; i++) {
      await pg.esperar(1000);
      desfase.push(await pg.ev(`(() => { const [h, m, s] = document.getElementById('hora').textContent.split(':').map(Number); const d = new Date(); return (d.getSeconds() - s + 60) % 60; })()`));
    }
    afirmar(desfase.every(d => d <= 1), `la hora mostrada va como mucho 1 s por detrás (desfases ${desfase})`);
  },
};
