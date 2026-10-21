import { igual } from './lib/util.mjs';

export default {
  nombre: 'iconos: elegir el logo de Proxmox para un enlace',
  red: true,
  async ejecutar(abrir) {
    const pg = await abrir();
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('.fila').click()`);
    await pg.esperar(200);
    await pg.clic('#btn-elegir-icono');
    await pg.ev(`(() => { const i = document.getElementById('icono-buscar'); i.value = 'proxmox'; i.dispatchEvent(new Event('input')); })()`);
    // El índice de logos (1,2 MB) viene de jsDelivr y sin caché puede tardar: se espera hasta 30 s.
    for (let i = 0; i < 120 && !(await pg.ev(`!!document.querySelector('.opcion-icono[title="proxmox"]')`)); i++) await pg.esperar(250);
    await pg.clic('.opcion-icono[title="proxmox"]');
    await pg.clic('#dlg-enlace button[value="ok"]');
    const enlace = (await pg.datos()).grupos.find(g => g.nombre === 'Alfa').enlaces[0];
    igual(enlace.icono, { set: 'apps', nombre: 'proxmox', formato: 'svg' }, 'icono guardado');
  },
};
