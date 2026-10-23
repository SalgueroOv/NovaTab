import { afirmar, igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

const NOTAS = conWidgets([{ id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]);
const confirmarTodo = `window.confirm = () => true`;
const grupo = (d, nombre) => d.grupos.find(g => g.nombre === nombre);
const botonDeGrupo = (nombre, accion) => `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === '${nombre}').querySelector('[data-accion="${accion}"]').click()`;
const plegar = nombre => `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === '${nombre}').querySelector('[data-plegar]').click()`;
const teclear = texto => `(() => { const t = document.querySelector('.notas-texto'); t.focus(); t.value = ${JSON.stringify(texto)}; t.dispatchEvent(new Event('input')); })()`;

export default {
  nombre: 'historial: Ctrl+Z deshace, Ctrl+Y rehace y la pila es de 20',
  async ejecutar(abrir) {
    // (a) Borrar un grupo con sus enlaces; deshacer lo trae con enlaces y posición; rehacer lo quita.
    let pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(confirmarTodo);
    const antes = grupo(await pg.datos(), 'Alfa');
    await pg.clic('#btn-editar');
    await pg.ev(botonDeGrupo('Alfa', 'borrar-grupo'));
    await pg.esperar(300);
    igual(grupo(await pg.datos(), 'Alfa'), undefined, 'Alfa borrado');
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    igual(grupo(await pg.datos(), 'Alfa'), antes, 'Alfa tras deshacer (enlaces y posición)');
    await pg.tecla('y', 'ctrl');
    await pg.esperar(300);
    igual(grupo(await pg.datos(), 'Alfa'), undefined, 'Alfa tras rehacer con Ctrl+Y');
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    await pg.tecla('z', 'ctrl', 'shift');
    await pg.esperar(300);
    igual(grupo(await pg.datos(), 'Alfa'), undefined, 'Alfa tras rehacer con Ctrl+Mayús+Z');

    // (b) Dos cambios se deshacen en orden inverso.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(plegar('Alfa'));
    await pg.esperar(300);
    await pg.ev(plegar('Beta'));
    await pg.esperar(300);
    let d = await pg.datos();
    igual([grupo(d, 'Alfa').plegado, grupo(d, 'Beta').plegado], [true, true], 'ambos plegados');
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    d = await pg.datos();
    igual([grupo(d, 'Alfa').plegado, grupo(d, 'Beta').plegado], [true, false], 'primer Ctrl+Z: Beta vuelve');
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    d = await pg.datos();
    igual([grupo(d, 'Alfa').plegado, grupo(d, 'Beta').plegado], [false, false], 'segundo Ctrl+Z: Alfa vuelve');

    // (c) Con una nota enfocada, Ctrl+Z es del texto y no toca la rejilla.
    pg = await abrir({ chrome: {}, datos: NOTAS });
    await pg.esperar(300);
    await pg.ev(plegar('Alfa'));
    await pg.esperar(300);
    await pg.ev(`document.querySelector('.notas-texto').focus()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    igual(grupo(await pg.datos(), 'Alfa').plegado, true, 'Ctrl+Z en una nota no deshace la rejilla');

    // (d) Borrar un widget de notas y deshacer: vuelve con su texto, incluido el escrito después del
    // último guardado de datos.
    pg = await abrir({ chrome: {}, datos: NOTAS });
    await pg.esperar(300);
    await pg.ev(confirmarTodo);
    await pg.ev(teclear('hola'));
    await pg.esperar(2500);
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('[data-accion-widget="borrar"]').click()`);
    await pg.esperar(300);
    afirmar(!(await pg.ev(`!!document.querySelector('.notas-texto')`)), 'el widget de notas se borró');
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(400);
    igual(await pg.ev(`document.querySelector('.notas-texto')?.value`), 'hola', 'nota recuperada con su texto');

    // (e) Más de 20 cambios: solo se deshacen los últimos 20.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    for (let i = 0; i < 25; i++) {
      await pg.ev(plegar('Alfa'));
      await pg.esperar(120);
    }
    igual(grupo(await pg.datos(), 'Alfa').plegado, true, 'Alfa plegado tras 25 alternancias (impar)');
    for (let i = 0; i < 25; i++) await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    // 25 cambios: el estado inicial (desplegado) quedó fuera de la pila; tras 20 deshacer se llega al
    // estado tras el 5.º cambio (plegado).
    igual(grupo(await pg.datos(), 'Alfa').plegado, true, 'solo 20 pasos atrás');

    // (f) Tras deshacer, un cambio nuevo vacía rehacer.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(plegar('Alfa'));
    await pg.esperar(300);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    await pg.ev(plegar('Beta'));
    await pg.esperar(300);
    await pg.tecla('y', 'ctrl');
    await pg.esperar(300);
    d = await pg.datos();
    igual([grupo(d, 'Alfa').plegado, grupo(d, 'Beta').plegado], [false, true], 'Ctrl+Y no rehace tras un cambio nuevo');

    // (g) Un cambio llegado de otra pestaña vacía la pila.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(plegar('Alfa'));
    await pg.esperar(300);
    await pg.ev(`chrome.storage.sync.get('grupo:g-beta').then(r => {
      const e = r['grupo:g-beta']; e[0] = { ...e[0], nombre: 'Router Remoto' };
      __chromeFalso.remoto('sync', 'grupo:g-beta', e);
    })`);
    await pg.esperar(400);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    d = await pg.datos();
    igual(grupo(d, 'Alfa').plegado, true, 'Ctrl+Z tras un cambio de fuera no hace nada');
    igual(grupo(d, 'Beta').enlaces[0].nombre, 'Router Remoto', 'el cambio de fuera sigue ahí');

    // (h) Restablecer todo vacía la pila.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(plegar('Alfa'));
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    await pg.clic('#btn-restablecer');
    await pg.ev(`document.getElementById('texto-restablecer').value = 'BORRAR'; document.getElementById('texto-restablecer').dispatchEvent(new Event('input'))`);
    await pg.clic('#confirmar-restablecer');
    await pg.esperar(500);
    const tras = JSON.stringify(await pg.datos());
    await pg.tecla('z', 'ctrl');
    await pg.esperar(300);
    igual(JSON.stringify(await pg.datos()), tras, 'Ctrl+Z tras restablecer no hace nada');

    // (i) Aviso «Grupo borrado · Deshacer»: solo al borrar un grupo, con botón y 8 s de vida.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(confirmarTodo);
    await pg.clic('#btn-editar');
    await pg.ev(`document.querySelector('#rejilla .grupo .enlace .borrar').click()`);
    await pg.esperar(300);
    afirmar(await pg.ev(`document.getElementById('aviso-accion').hidden`), 'borrar un enlace no muestra el aviso');
    const antesAlfa = grupo(await pg.datos(), 'Alfa');
    await pg.ev(botonDeGrupo('Alfa', 'borrar-grupo'));
    await pg.esperar(300);
    igual(await pg.ev(`document.getElementById('aviso-accion').hidden`), false, 'aviso visible');
    igual(await pg.ev(`document.querySelector('#aviso-accion span').textContent`), 'Grupo borrado', 'texto del aviso');
    igual(await pg.ev(`document.querySelector('#aviso-accion button').textContent`), 'Deshacer', 'botón del aviso');
    await pg.clic('#aviso-accion button');
    await pg.esperar(400);
    igual(grupo(await pg.datos(), 'Alfa')?.enlaces.length, antesAlfa ? antesAlfa.enlaces.length : -1, 'Alfa recuperado con el botón');
    afirmar(await pg.ev(`document.getElementById('aviso-accion').hidden`), 'el aviso se oculta tras pulsar');
    await pg.ev(botonDeGrupo('Beta', 'borrar-grupo'));
    await pg.esperar(7000);
    igual(await pg.ev(`document.getElementById('aviso-accion').hidden`), false, 'aviso aún visible a los 7 s');
    await pg.esperar(1500);
    igual(await pg.ev(`document.getElementById('aviso-accion').hidden`), true, 'aviso oculto a los 8,5 s');

    // Revisión final · (j) Dos Ctrl+Z a la vez no estropean la pila: Ctrl+Y y más Ctrl+Z siguen valiendo.
    const pulsar = (tecla, extra = '') => `document.dispatchEvent(new KeyboardEvent('keydown', { key: '${tecla}', ctrlKey: true, bubbles: true${extra} }))`;
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    for (const n of ['Alfa', 'Beta', 'Gamma']) {
      await pg.ev(plegar(n));
      await pg.esperar(250);
    }
    const plegados = async () => (await pg.datos()).grupos.slice(0, 3).map(g => g.plegado);
    await pg.ev(`${pulsar('z')}; ${pulsar('z')}`);
    await pg.esperar(600);
    igual(await plegados(), [true, false, false], 'dos Ctrl+Z a la vez');
    await pg.ev(`${pulsar('y')}; ${pulsar('y')}`);
    await pg.esperar(600);
    igual(await plegados(), [true, true, true], 'dos Ctrl+Y a la vez');
    await pg.ev(`${pulsar('z')}; ${pulsar('z')}; ${pulsar('z')}`);
    await pg.esperar(800);
    igual(await plegados(), [false, false, false], 'tres Ctrl+Z llegan al estado inicial');

    // (k) Un cambio de otra pestaña guardado con mi diálogo no se pisa al deshacer.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('.fila').click()`);
    await pg.esperar(200);
    await pg.ev(`chrome.storage.sync.get('grupo:g-beta').then(r => {
      const e = r['grupo:g-beta']; e[0] = { ...e[0], nombre: 'Router Remoto' };
      __chromeFalso.remoto('sync', 'grupo:g-beta', e);
    })`);
    await pg.esperar(300);
    await pg.ev(`document.querySelector('#dlg-enlace input[name="nombre"]').value = 'Proxmox Local'`);
    await pg.clic('#dlg-enlace button[value="ok"]');
    await pg.esperar(500);
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(500);
    d = await pg.datos();
    igual(grupo(d, 'Beta').enlaces[0].nombre, 'Router Remoto', 'deshacer no pisa el cambio de otra pestaña');
    igual(grupo(d, 'Alfa').enlaces[0].nombre, 'Proxmox Alfa', 'deshacer sí revierte mi edición');
    igual((await pg.ev(`chrome.storage.sync.get('grupo:g-beta').then(r => r['grupo:g-beta'][0].nombre)`)), 'Router Remoto', 'y lo guardado en sync tampoco');

    // (l) Deshacer no revierte el texto de una nota escrito después del cambio.
    pg = await abrir({ chrome: {}, datos: NOTAS });
    await pg.esperar(300);
    await pg.ev(teclear('uno'));
    await pg.esperar(2500);
    await pg.ev(plegar('Alfa'));
    await pg.esperar(300);
    await pg.ev(teclear('uno dos tres'));
    await pg.esperar(2500);
    await pg.ev(`document.activeElement.blur()`);
    await pg.tecla('z', 'ctrl');
    await pg.esperar(500);
    igual(await pg.ev(`document.querySelector('.notas-texto').value`), 'uno dos tres', 'nota en pantalla tras deshacer un plegado');
    igual(await pg.ev(`chrome.storage.sync.get('nota:w-notas').then(r => r['nota:w-notas'])`), 'uno dos tres', 'nota guardada tras deshacer un plegado');

    // (m) El aviso «Deshacer» desaparece si hay un cambio nuevo: no deshace otra cosa.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(confirmarTodo);
    await pg.clic('#btn-editar');
    await pg.ev(botonDeGrupo('Alfa', 'borrar-grupo'));
    await pg.esperar(300);
    igual(await pg.ev(`document.getElementById('aviso-accion').hidden`), false, 'aviso tras borrar');
    await pg.ev(plegar('Beta'));
    await pg.esperar(300);
    igual(await pg.ev(`document.getElementById('aviso-accion').hidden`), true, 'aviso oculto tras un cambio nuevo');
  },
};
