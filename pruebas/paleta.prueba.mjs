import { activarDemo, afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

const intercepta = `window.__ir = []; novatab.alIr = url => window.__ir.push(url)`;
const titulos = pg => pg.ev(`[...document.querySelectorAll('#paleta-lista [role="option"]')].map(o => o.querySelector('.p-titulo').textContent)`);
const abrirPaleta = async pg => {
  await pg.tecla('k', 'ctrl');
  await pg.esperar(150);
};
const escribirYEnter = async (pg, texto) => {
  await pg.escribir(texto);
  await pg.tecla('Enter');
  await pg.esperar(250);
};
const avisoVisible = pg => pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`);

export default {
  nombre: 'paleta: Ctrl+K con enlaces, temas, modo reunión, nuevos elementos y paneles',
  async ejecutar(abrir) {
    // (a) Abrir, cerrar con Ctrl+K y con Esc, y devolver el foco.
    let pg = await abrir();
    await pg.esperar(300);
    await pg.ev(intercepta);
    await pg.ev(`document.getElementById('buscar').focus()`);
    await abrirPaleta(pg);
    afirmar(await pg.ev(`document.getElementById('paleta').open`), 'Ctrl+K abre la paleta');
    igual(await pg.ev(`document.getElementById('paleta-texto').value`), '', 'texto vacío al abrir');
    const todos = await titulos(pg);
    igual(todos.slice(0, 3), ['Abrir: Proxmox Alfa', 'Abrir: Portainer Alfa', 'Abrir: Jellyfin Alfa'], 'los enlaces primero');
    const ordenComandos = todos.filter(t => !t.startsWith('Abrir: '));
    igual(ordenComandos.slice(0, 1), ['Modo reunión: activar'], 'modo reunión es el primer comando');
    igual(ordenComandos.filter(t => t.startsWith('Tema: ')).length, 10, 'diez temas');
    igual(ordenComandos.slice(-6), ['Nuevo grupo', 'Nuevo enlace…', 'Nuevo widget', 'Ocultar panel izquierdo', 'Ocultar panel derecho', 'Editar: activar'], 'los últimos comandos');
    await pg.tecla('k', 'ctrl');
    afirmar(!(await pg.ev(`document.getElementById('paleta').open`)), 'Ctrl+K otra vez la cierra');
    await abrirPaleta(pg);
    await pg.tecla('Escape');
    afirmar(!(await pg.ev(`document.getElementById('paleta').open`)), 'Esc la cierra');
    igual(await pg.ev(`document.activeElement.id`), 'buscar', 'el foco vuelve al buscador');

    // (b) Filtrar y ejecutar: abrir un enlace y cambiar de tema.
    await abrirPaleta(pg);
    await pg.escribir('proxmox');
    igual(await titulos(pg), ['Abrir: Proxmox Alfa'], 'único resultado para «proxmox»');
    await pg.tecla('Enter');
    igual(await pg.ev(`window.__ir`), ['http://192.168.1.11/'], 'Enter abre el enlace');
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'tema papel');
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'papel', 'tema papel');
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'tema ro');
    igual(await pg.ev(`document.documentElement.dataset.tema`), 'rosa', 'tema ro → rosa');

    // (c) Modo reunión.
    pg = await abrir();
    await pg.esperar(300);
    await abrirPaleta(pg);
    await pg.escribir('reunion');
    igual(await titulos(pg), ['Modo reunión: activar'], 'sin tildes ni mayúsculas');
    await pg.tecla('Enter');
    await pg.esperar(1000);
    igual(await pg.ev(`document.getElementById('btn-reunion').getAttribute('aria-pressed')`), 'true', 'modo reunión activo');
    await abrirPaleta(pg);
    const tras = await titulos(pg);
    afirmar(tras.includes('Modo reunión: desactivar'), 'el título ahora dice desactivar');
    afirmar(!tras.some(t => t.includes('Secreto')), 'los enlaces del grupo privado no salen');

    // (d) Nuevo enlace: segundo paso con los grupos; sin grupos, aviso.
    pg = await abrir();
    await pg.esperar(300);
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'nuevo enlace');
    afirmar((await titulos(pg)).includes('Grupo: Beta'), 'lista de grupos como segundo paso');
    await pg.escribir('beta');
    await pg.tecla('Enter');
    await pg.esperar(300);
    afirmar(await pg.ev(`document.getElementById('dlg-enlace').open`), 'se abre el diálogo de nuevo enlace');
    afirmar((await pg.ev(`document.querySelector('#dlg-enlace h2').textContent`)).includes('Nuevo enlace'), 'título del diálogo');
    afirmar(await pg.ev(`document.body.classList.contains('editando')`), 'el modo edición queda activo');
    pg = await abrir({ datos: { version: 3, titulos: { local: 'Pruebas' }, grupos: [], widgets: [] } });
    await pg.esperar(300);
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'nuevo enlace');
    igual(await avisoVisible(pg), 'No hay grupos todavía: crea uno primero', 'aviso sin grupos');
    afirmar(!(await pg.ev(`document.getElementById('dlg-enlace').open`)), 'no se abre ningún diálogo');

    // (e) Nuevo grupo y paneles.
    pg = await abrir();
    await pg.esperar(300);
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'nuevo grupo');
    afirmar(await pg.ev(`document.getElementById('dlg-grupo').open`), 'se abre el diálogo de grupo');
    afirmar(await pg.ev(`document.body.classList.contains('editando')`), 'modo edición activo');
    await pg.ev(`document.getElementById('dlg-grupo').close()`);
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'ocultar panel izquierdo');
    afirmar(await pg.ev(`document.body.classList.contains('sin-izq')`), 'panel izquierdo oculto');
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'ocultar panel derecho');
    igual(await pg.ev(`[document.body.classList.contains('sin-izq'), document.body.classList.contains('sin-der')]`), [false, true], 'nunca quedan los dos ocultos');

    // (f) Navegar con las flechas y sin resultados.
    pg = await abrir();
    await pg.esperar(300);
    await pg.ev(intercepta);
    await abrirPaleta(pg);
    await pg.tecla('ArrowDown');
    await pg.tecla('ArrowDown');
    await pg.tecla('Enter');
    igual(await pg.ev(`window.__ir`), ['http://192.168.1.13:8096/'], '↓ ↓ Enter ejecuta el tercer resultado');
    await abrirPaleta(pg);
    await pg.escribir('zzzzz');
    igual(await pg.ev(`document.getElementById('paleta-lista').textContent`), 'Sin resultados', 'mensaje sin resultados');
    await pg.tecla('Enter');
    afirmar(await pg.ev(`document.getElementById('paleta').open`), 'Enter sin resultados no cierra ni ejecuta');

    // (g) Con otro diálogo abierto no se abre la paleta.
    pg = await abrir();
    await pg.esperar(300);
    await pg.ev(`document.getElementById('dlg-grupo').showModal()`);
    await pg.tecla('k', 'ctrl');
    await pg.esperar(150);
    afirmar(!(await pg.ev(`document.getElementById('paleta').open`)), 'no se abre con un diálogo abierto');

    // (h) Los nombres se muestran como texto, sin interpretar HTML.
    const raro = structuredClone(DATOS_PRUEBA);
    raro.grupos[0].enlaces[0].nombre = '<img src=x onerror="window.__xss=1"> & <b>x</b>';
    pg = await abrir({ datos: raro });
    await pg.esperar(300);
    await abrirPaleta(pg);
    igual((await titulos(pg))[0], 'Abrir: <img src=x onerror="window.__xss=1"> & <b>x</b>', 'texto literal');
    igual(await pg.ev(`window.__xss ?? null`), null, 'no se ejecuta nada');
    igual(await pg.ev(`document.querySelectorAll('#paleta-lista img, #paleta-lista b').length`), 0, 'ningún elemento HTML dentro de la lista');

    // (i) Revisión final: en modo reunión «Nuevo enlace…» no ofrece grupos privados.
    pg = await abrir();
    await pg.esperar(300);
    await activarDemo(pg);
    await abrirPaleta(pg);
    await escribirYEnter(pg, 'nuevo enlace');
    const grupos = await titulos(pg);
    afirmar(grupos.includes('Grupo: Alfa') && !grupos.includes('Grupo: Gamma') && !grupos.includes('Grupo: Ocio'), `solo grupos visibles (hay ${grupos})`);

    // (j) Si las opciones cambian desde fuera con la paleta abierta, se cierra.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await abrirPaleta(pg);
    await pg.ev(`__chromeFalso.remoto('sync', 'opciones', { reunion: true })`);
    await pg.esperar(300);
    afirmar(!(await pg.ev(`document.getElementById('paleta').open`)), 'la paleta se cierra si cambian las opciones');
  },
};
