import { afirmar, igual } from './lib/util.mjs';

const distintos = sel => `(() => { const c = ${sel}; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const s = new Set(); for (let i = 0; i < d.length; i += 4) s.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return s.size; })()`;

export default {
  nombre: 'estudio de Personalizar: columna a la derecha, pestañas, ámbito y cierre',
  async ejecutar(abrir) {
    // (a) Al abrir, la página se encoge a la izquierda y el estudio ocupa 480 px pegado al borde derecho.
    let pg = await abrir({ ancho: 1440, alto: 900, reducirMovimiento: true });
    await pg.esperar(400);
    await pg.clic('#btn-tema');
    await pg.esperar(300);
    afirmar(await pg.ev(`document.documentElement.classList.contains('estudio')`), 'html.estudio al abrir');
    afirmar((await pg.ev(`getComputedStyle(document.querySelector('.pagina')).transform`)) !== 'none', 'la página se encoge');
    const r = await pg.ev(`(() => { const r = document.getElementById('panel-tema').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.right), Math.round(r.top)]; })()`);
    igual(r, [480, 1440, 0], 'el estudio mide 480 px y va pegado a la derecha');
    afirmar(await pg.ev(`document.querySelector('.pagina').getBoundingClientRect().right <= 1440 - 480`), 'la página no queda debajo del estudio');

    // (b) Pestañas y reparto de las secciones.
    igual(await pg.ev(`[...document.querySelectorAll('#panel-tema [role="tab"]')].map(t => t.textContent)`), ['Aspecto', 'Disposición', 'Buscador', 'Datos'], 'pestañas');
    igual(await pg.ev(`['#muestras', '#muestras-fondo', '#ajustes-terreno'].map(s => !!document.querySelector('#pestana-tema ' + s))`), [true, true, true], 'Aspecto lleva tema y fondo');
    igual(await pg.ev(`['#btn-panel-izq', '#opt-fondo-grupos', '#opt-hora24'].map(s => !!document.querySelector('#pestana-diseno ' + s))`), [true, true, true], 'Disposición lleva paneles, grupos y reloj');
    const datos = await pg.ev(`[...document.querySelectorAll('#pestana-datos button')].map(b => b.id)`);
    afirmar(datos.includes('btn-exportar') && datos.at(-1) === 'btn-restablecer', `Datos lleva exportar y acaba en restablecer (${datos})`);

    // (c) El ámbito de cada sección: el nombre del perfil o «Todos los perfiles».
    igual(await pg.ev(`document.querySelector('#pestana-tema .ambito').textContent`), 'Solo Principal', 'el tema es del perfil');
    igual(await pg.ev(`document.querySelector('#pestana-buscador .ambito').textContent`), 'Todos los perfiles', 'el buscador es común');

    // (d) Las muestras de tema llevan el terreno en sus colores; el indicador está bajo la pestaña elegida.
    afirmar(await pg.ev(distintos(`document.querySelector('#muestras canvas.mini-tema')`)) > 20, 'la miniatura del tema tiene el terreno');
    await pg.clic('#panel-tema [data-pestana="datos"]');
    await pg.esperar(300);
    afirmar(await pg.ev(`(() => { const i = document.querySelector('.indicador-pestana').getBoundingClientRect(), b = document.querySelector('[data-pestana="datos"]').getBoundingClientRect(); return Math.abs(i.left - b.left) < 2 && Math.abs(i.width - b.width) < 2; })()`), 'el indicador se desliza a Datos');

    // (e) Hecho cierra y devuelve el foco; Esc también cierra.
    await pg.ev(`document.getElementById('estudio-hecho').focus()`);
    await pg.clic('#estudio-hecho');
    await pg.esperar(200);
    afirmar(await pg.ev(`document.getElementById('panel-tema').hidden && !document.documentElement.classList.contains('estudio')`), 'Hecho cierra');
    igual(await pg.ev(`document.activeElement.id`), 'btn-tema', 'el foco vuelve a Personalizar');
    await pg.clic('#btn-tema');
    await pg.tecla('Escape');
    await pg.esperar(200);
    afirmar(await pg.ev(`document.getElementById('panel-tema').hidden`), 'Esc cierra');

    // (f) A 800 px es una hoja abajo, a todo el ancho, y la página no se encoge.
    pg = await abrir({ ancho: 800, alto: 800, reducirMovimiento: true });
    await pg.esperar(400);
    await pg.clic('#btn-tema');
    await pg.esperar(300);
    igual(await pg.ev(`getComputedStyle(document.querySelector('.pagina')).transform`), 'none', 'sin encoger');
    const h = await pg.ev(`(() => { const r = document.getElementById('panel-tema').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.bottom)]; })()`);
    igual(h, [800, 800], 'hoja abajo a todo el ancho');
  },
};
