import { afirmar, igual } from './lib/util.mjs';
import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';

// Datos de prueba con dos enlaces que ejecutarían código o contenido al pulsarlos.
const conEnlacesPeligrosos = () => {
  const d = structuredClone(DATOS_PRUEBA);
  d.grupos[0].enlaces.push(
    { id: 'e-js', nombre: 'Malo JS', url: 'javascript:alert(1)' },
    { id: 'e-data', nombre: 'Malo data', url: 'data:text/html,<script>alert(1)</script>' },
  );
  return d;
};

const plegarAlfa = `[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('[data-plegar]').click()`;

export default {
  nombre: 'seguridad: solo se aceptan enlaces http y https',
  async ejecutar(abrir) {
    // Al cargar se descartan; el resto de Alfa queda intacto.
    let pg = await abrir({ datos: conEnlacesPeligrosos() });
    igual(await pg.ev(`[...[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelectorAll('.nombre')].map(n => n.textContent)`),
      ['Proxmox Alfa', 'Portainer Alfa', 'Jellyfin Alfa', 'Grafana Alfa'], 'enlaces visibles de Alfa');
    afirmar(!(await pg.ev(`[...document.querySelectorAll('a[href]')].some(a => /^(javascript|data):/i.test(a.getAttribute('href')))`)), 'no debe quedar ningún enlace javascript: ni data: en la página');
    // En cuanto se guarda algo, lo guardado tampoco los contiene.
    await pg.ev(plegarAlfa);
    await pg.ev(plegarAlfa);
    await pg.esperar(300);
    const guardado = await pg.ev(`localStorage.getItem('datos')`);
    afirmar(!/javascript:|data:text/.test(guardado), 'lo guardado no debe contener enlaces javascript: ni data:');

    // Al editar, una dirección javascript: no se acepta: el diálogo sigue abierto y nada cambia.
    pg = await abrir();
    await pg.clic('#btn-editar');
    await pg.ev(`[...document.querySelectorAll('#rejilla .grupo')].find(g => g.querySelector('h3').textContent === 'Alfa').querySelector('.fila').click()`);
    await pg.esperar(200);
    await pg.ev(`document.querySelector('#dlg-enlace input[name="url"]').value = 'javascript:alert(1)'`);
    await pg.clic('#dlg-enlace button[value="ok"]');
    afirmar(await pg.ev(`document.getElementById('dlg-enlace').open`), 'el diálogo debería seguir abierto con una dirección javascript:');
    igual((await pg.datos()).grupos[0].enlaces[0].url, 'http://192.168.1.11/', 'URL del primer enlace de Alfa');
  },
};
