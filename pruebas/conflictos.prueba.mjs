import { afirmar, igual } from './lib/util.mjs';

const enArea = (area, clave) => `chrome.storage.${area}.get('${clave}').then(r => r['${clave}'] ?? null)`;
const abrirEnlaceDeAlfa = `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('.fila').click()`;

// Lo que haría otra pestaña: renombrar el primer enlace de Beta.
const renombrarBetaFuera = `chrome.storage.sync.get('enlaces:g-beta').then(r => {
  const enlaces = r['enlaces:g-beta'];
  enlaces[0] = { ...enlaces[0], nombre: 'Router Remoto' };
  __chromeFalso.remoto('sync', 'enlaces:g-beta', enlaces);
})`;

// Lo que haría otra pestaña: borrar el grupo Gamma.
const borrarGammaFuera = `chrome.storage.sync.get('perfil:principal:datos').then(r => {
  const d = r['perfil:principal:datos'];
  d.grupos = d.grupos.filter(g => g.id !== 'g-gamma');
  __chromeFalso.remoto('sync', 'perfil:principal:datos', d);
  __chromeFalso.remoto('sync', 'enlaces:g-gamma', undefined);
})`;

const nombresDe = (d, id) => d.grupos.find(g => g.id === id)?.enlaces.map(e => e.nombre);

export default {
  nombre: 'conflictos: lo que llega de otra pestaña espera a que termines de editar',
  async ejecutar(abrir) {
    // (a) Sin editar, un cambio de otra pestaña se ve al momento.
    let pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(renombrarBetaFuera);
    await pg.esperar(300);
    afirmar((await pg.ev(`document.querySelector('.pagina').innerText`)).includes('Router Remoto'), 'el cambio remoto debería verse');

    // (b) Con el diálogo de Alfa abierto llega un cambio remoto en Beta: al guardar están los dos.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.ev(abrirEnlaceDeAlfa);
    await pg.esperar(200);
    await pg.ev(renombrarBetaFuera);
    await pg.esperar(300);
    afirmar(await pg.ev(`document.getElementById('dlg-enlace').open`), 'el diálogo sigue abierto mientras llega el cambio');
    await pg.ev(`document.querySelector('#dlg-enlace input[name="nombre"]').value = 'Proxmox Local'`);
    await pg.clic('#dlg-enlace button[value="ok"]');
    await pg.esperar(400);
    let d = await pg.datos();
    igual(nombresDe(d, 'g-alfa')[0], 'Proxmox Local', 'mi cambio en Alfa');
    igual(nombresDe(d, 'g-beta')[0], 'Router Remoto', 'el cambio remoto en Beta');
    igual((await pg.ev(enArea('sync', 'enlaces:g-beta')))[0].nombre, 'Router Remoto', 'Beta guardado (no se pisa con lo viejo)');

    // (c) Con el diálogo de Alfa abierto, otra pestaña borra Gamma: al guardar, Gamma no reaparece.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.ev(abrirEnlaceDeAlfa);
    await pg.esperar(200);
    await pg.ev(borrarGammaFuera);
    await pg.esperar(300);
    await pg.ev(`document.querySelector('#dlg-enlace input[name="nombre"]').value = 'Proxmox Otra Vez'`);
    await pg.clic('#dlg-enlace button[value="ok"]');
    await pg.esperar(400);
    d = await pg.datos();
    igual(d.grupos.some(g => g.id === 'g-gamma'), false, 'Gamma en memoria tras guardar');
    igual((await pg.ev(enArea('sync', 'perfil:principal:datos'))).grupos.some(g => g.id === 'g-gamma'), false, 'Gamma en lo guardado');
    igual(nombresDe(d, 'g-alfa')[0], 'Proxmox Otra Vez', 'mi cambio en Alfa');

    // (c2) Si cancelo el diálogo, lo que llegó mientras tanto se aplica al cerrarlo.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.clic('#btn-editar');
    await pg.ev(abrirEnlaceDeAlfa);
    await pg.esperar(200);
    await pg.ev(renombrarBetaFuera);
    await pg.esperar(300);
    igual(nombresDe(await pg.datos(), 'g-beta')[0] === 'Router Remoto', false, 'el cambio remoto espera con el diálogo abierto');
    await pg.clic('#dlg-enlace button[data-cerrar]');
    await pg.esperar(300);
    igual(nombresDe(await pg.datos(), 'g-beta')[0], 'Router Remoto', 'el cambio remoto tras cancelar');

    // (d) Mis propios cambios no provocan una recarga (los datos en memoria son el mismo objeto).
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(`window.__antes = novatab.datos`);
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Beta').querySelector('[data-plegar]').click()`);
    await pg.esperar(400);
    igual(await pg.ev(`novatab.datos === window.__antes`), true, 'mismos datos en memoria tras un cambio propio');
  },
};
