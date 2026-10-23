import { afirmar, igual } from './lib/util.mjs';

const modulo = `import('/js/atajos.js')`;
const NOMBRES = ['Proxmox Alfa', 'Portainer Alfa', 'Jellyfin Alfa', 'Grafana Alfa', 'Router Beta', 'NAS Beta', 'Pihole Beta', 'Secreto Uno', 'Secreto Dos'];
const intercepta = `window.__ir = []; novatab.alIr = url => window.__ir.push(url)`;
const alt = (digito, extra = '') => `document.dispatchEvent(new KeyboardEvent('keydown', { key: '${digito}', code: 'Digit${digito}', altKey: true, bubbles: true, cancelable: true${extra} }))`;
const pulsar = (pg, digito, extra = '') => pg.ev(`(() => { const e = new KeyboardEvent('keydown', { key: '${digito}', code: 'Digit${digito}', altKey: true, bubbles: true, cancelable: true${extra} }); (document.activeElement || document).dispatchEvent(e); return e.defaultPrevented; })()`);
const plegarAlfa = `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('[data-plegar]').click()`;

export default {
  nombre: 'atajos: Alt+1…Alt+9 abren los nueve primeros enlaces locales',
  async ejecutar(abrir) {
    let pg = await abrir();
    await pg.esperar(300);
    await pg.ev(intercepta);

    // (a) Orden de la cuadrícula y Alt+número.
    igual(await pg.ev(`${modulo}.then(m => m.enlacesDeAtajo().map(e => e.enlace.nombre))`), NOMBRES, 'los nueve primeros, en el orden de la cuadrícula');
    igual(await pulsar(pg, 1), true, 'Alt+1 cancela la tecla');
    igual(await pg.ev(`window.__ir`), ['http://192.168.1.11/'], 'Alt+1 abre el primero de Alfa');
    await pulsar(pg, 5);
    igual((await pg.ev(`window.__ir`)).at(-1), 'http://192.168.1.1/', 'Alt+5 abre el primero de Beta');

    // (b) Modo reunión: Gamma (privado) no cuenta.
    pg = await abrir();
    await pg.esperar(300);
    await pg.ev(intercepta);
    await pg.clic('#btn-reunion');
    await pg.esperar(200);
    igual(await pg.ev(`${modulo}.then(m => m.enlacesDeAtajo().length)`), 7, 'siete enlaces en modo reunión');
    igual(await pulsar(pg, 8), false, 'Alt+8 sin enlace no cancela la tecla');
    igual(await pg.ev(`window.__ir`), [], 'Alt+8 no abre nada');

    // (c) Con Alfa plegado, Alt+1 abre el primero de Beta.
    pg = await abrir();
    await pg.esperar(300);
    await pg.ev(intercepta);
    await pg.ev(plegarAlfa);
    await pg.esperar(300);
    await pulsar(pg, 1);
    igual(await pg.ev(`window.__ir`), ['http://192.168.1.1/'], 'Alt+1 con Alfa plegado');

    // (d) Con un diálogo abierto o escribiendo en una nota, no abre nada; con el buscador vacío, sí.
    pg = await abrir();
    await pg.esperar(300);
    await pg.ev(intercepta);
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')][0].querySelector('.fila').click()`);
    await pg.esperar(200);
    await pulsar(pg, 1);
    igual(await pg.ev(`window.__ir`), [], 'con un diálogo abierto no abre nada');
    await pg.ev(`document.getElementById('dlg-enlace').close()`);
    await pg.clic('#btn-editar');
    await pg.ev(`document.getElementById('buscar').focus()`);
    await pulsar(pg, 2);
    igual(await pg.ev(`window.__ir`), ['http://192.168.1.12:9000/'], 'con el buscador vacío y enfocado sí abre');
    await pg.ev(`document.getElementById('buscar').value = 'algo'`);
    await pulsar(pg, 3);
    igual((await pg.ev(`window.__ir`)).length, 1, 'con texto en el buscador no abre nada');

    // (e) Con Ctrl, Mayús o sin enlace, nada.
    await pg.ev(`document.getElementById('buscar').value = ''`);
    igual(await pulsar(pg, 1, ', ctrlKey: true'), false, 'Ctrl+Alt+1 no actúa');
    igual(await pulsar(pg, 1, ', shiftKey: true'), false, 'Alt+Mayús+1 no actúa');

    // (f) Las cifras: ocultas sin ratón y visibles encima.
    pg = await abrir();
    await pg.esperar(300);
    igual(await pg.ev(`[...document.querySelectorAll('#rejilla .atajo-num')].map(n => n.textContent).sort()`), ['1', '2', '3', '4', '5', '6', '7', '8', '9'], 'cifras 1 a 9');
    igual(await pg.ev(`getComputedStyle(document.querySelector('#rejilla .atajo-num')).opacity`), '0', 'cifra oculta sin ratón');
    const [x, y] = await pg.centro('#rejilla .grupo .fila');
    await pg.raton('mouseMoved', x, y, 0);
    await pg.esperar(400);
    igual(await pg.ev(`getComputedStyle(document.querySelector('#rejilla .grupo .fila .atajo-num')).opacity`), '0.7', 'cifra visible con el ratón encima');
    afirmar(await pg.ev(`!!document.querySelector('#rejilla .grupo .fila .atajo-num[aria-hidden="true"]')`), 'la cifra es decorativa para lectores de pantalla');
  },
};
