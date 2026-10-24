import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const w = (id, tipo, y, config = {}) => ({ id, tipo, panel: 'izq', pos: { x: 1, y, w: 6, h: 6 }, config });
const DATOS = {
  ...structuredClone(DATOS_PRUEBA),
  grupos: DATOS_PRUEBA.grupos.map((g, i) => ({ ...g, vista: ['lista', 'iconos', 'compacta'][i] ?? 'lista' })),
  widgets: [w('w-notas', 'notas', 1), w('w-tareas', 'tareas', 7), w('w-reloj', 'relojMundial', 13), w('w-cuenta', 'cuentaAtras', 19, { nombre: 'Fin de curso con un nombre bastante largo', fecha: '2099-06-01T08:00' })],
};
const desborda = `document.documentElement.scrollWidth > innerWidth + 1`;

export default {
  nombre: 'pulido: pantallas estrechas, movimiento reducido, tamaño de controles y foco',
  async ejecutar(abrir) {
    // (a) Sin desplazamiento horizontal a 400, 800 y 1440 px, también con el panel o la paleta abiertos.
    for (const ancho of [400, 800, 1440]) {
      const pg = await abrir({ ancho, alto: 800, datos: DATOS });
      await pg.esperar(500);
      igual(await pg.ev(desborda), false, `sin desplazamiento horizontal a ${ancho} px`);
      await pg.clic('#btn-tema');
      igual(await pg.ev(desborda), false, `con el panel de personalizar abierto a ${ancho} px`);
      await pg.clic('#btn-tema');
      await pg.tecla('k', 'ctrl');
      await pg.esperar(200);
      igual(await pg.ev(desborda), false, `con la paleta abierta a ${ancho} px`);
      await pg.tecla('Escape');
      await pg.clic('#btn-editar');
      igual(await pg.ev(desborda), false, `en modo edición a ${ancho} px`);
    }

    // (b) Diálogos, menú de perfiles y panel caben en una ventana de 400×700.
    let pg = await abrir({ ancho: 400, alto: 700, datos: DATOS });
    await pg.esperar(500);
    const dentro = selector => pg.ev(`(() => { const e = document.querySelector('${selector}'); const r = e.getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })()`);
    await pg.clic('#btn-tema');
    afirmar(await dentro('#panel-tema'), 'el panel de personalizar cabe en 400×700');
    await pg.clic('#btn-tema');
    await pg.clic('#btn-perfil');
    afirmar(await dentro('#menu-perfiles'), 'el menú de perfiles cabe en 400×700');
    await pg.clic('#btn-perfil');
    for (const dlg of ['dlg-enlace', 'dlg-grupo', 'dlg-widget', 'dlg-marcadores', 'dlg-perfil', 'dlg-restablecer', 'paleta']) {
      await pg.ev(`document.getElementById('${dlg}').showModal()`);
      afirmar(await dentro(`#${dlg}`), `el diálogo ${dlg} cabe en 400×700`);
      await pg.ev(`document.getElementById('${dlg}').close()`);
    }

    // (c) Con «reducir movimiento» no hay transiciones ni animaciones de más de 0,01 s.
    pg = await abrir({ datos: DATOS });
    await pg.esperar(500);
    await pg.p.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await pg.esperar(100);
    const lentos = await pg.ev(`(() => {
      const largo = v => v.split(',').some(t => parseFloat(t) * (t.trim().endsWith('ms') ? 0.001 : 1) > 0.01);
      return [...document.querySelectorAll('*')].filter(e => {
        const s = getComputedStyle(e);
        return largo(s.transitionDuration) || (s.animationName !== 'none' && largo(s.animationDuration));
      }).slice(0, 8).map(e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''));
    })()`);
    igual(lentos, [], 'ningún elemento con transición o animación con «reducir movimiento»');
    igual(await pg.ev(`getComputedStyle(document.documentElement).scrollBehavior`), 'auto', 'y sin desplazamiento suave');

    // (d) Los controles miden al menos 24×24 px y tienen indicador de foco visible.
    pg = await abrir({ datos: DATOS });
    await pg.esperar(500);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-tema');
    const controles = await pg.ev(`(() => {
      const sel = 'a[href], button, input, select, textarea, [role="button"], [tabindex="0"]';
      const salida = { pequenos: [], sinFoco: [] };
      // Con el estudio abierto la página se ve encogida a propósito: se mide a su tamaño real.
      const k = document.documentElement.classList.contains('estudio') ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--k')) : 1;
      for (const e of document.querySelectorAll(sel)) {
        const r = e.getBoundingClientRect();
        // El separador de paneles es un asa de arrastre con equivalente de teclado (flechas): queda fuera de la medida.
        if (!r.width || !r.height || e.closest('[hidden]') || e.disabled || e.type === 'hidden' || e.getAttribute('role') === 'separator') continue;
        const real = e.matches('input[type="checkbox"], input[type="radio"]') ? (e.closest('label') ?? e).getBoundingClientRect() : r;
        const f = e.closest('.pagina') ? k : 1;
        const caja = { width: real.width / f, height: real.height / f };
        const nombre = e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '');
        if (caja.width < 24 || caja.height < 24) salida.pequenos.push(nombre + ' ' + Math.round(caja.width) + 'x' + Math.round(caja.height));
        e.focus({ focusVisible: true });
        // El campo del buscador marca el foco en su caja (.caja), que lo contiene.
        const s = getComputedStyle(e.matches('#buscar') ? e.closest('.caja') : e);
        if (document.activeElement === e && s.outlineStyle === 'none' && s.boxShadow === 'none') salida.sinFoco.push(nombre);
      }
      return { pequenos: [...new Set(salida.pequenos)].slice(0, 12), sinFoco: [...new Set(salida.sinFoco)].slice(0, 12) };
    })()`);
    igual(controles.pequenos, [], 'controles de menos de 24×24 px');
    igual(controles.sinFoco, [], 'controles sin indicador de foco visible');

    // (e) Con el texto muy ampliado (una ventana de 720 y de 400 px, como un zoom del 200 y del 360 %), los bloques principales no se solapan ni se salen.
    for (const ancho of [720, 400]) {
      pg = await abrir({ ancho, alto: 900, datos: DATOS });
      await pg.esperar(500);
      const solapes = await pg.ev(`(() => {
        const cajas = ['.hora', '#buscador', '#rejilla .grupo', '.widget'].map(s => [s, document.querySelector(s)?.getBoundingClientRect()]).filter(([, r]) => r);
        const fuera = cajas.filter(([, r]) => r.left < -1 || r.right > innerWidth + 1).map(([s]) => s + ' fuera');
        const cruces = [];
        for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
          const [a, ra] = cajas[i]; const [b, rb] = cajas[j];
          if (ra.left < rb.right - 1 && rb.left < ra.right - 1 && ra.top < rb.bottom - 1 && rb.top < ra.bottom - 1) cruces.push(a + ' con ' + b);
        }
        return [...fuera, ...cruces];
      })()`);
      igual(solapes, [], `bloques solapados o fuera de la ventana a ${ancho} px`);
    }
  },
};
