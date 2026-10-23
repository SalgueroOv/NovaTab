import { igual } from './lib/util.mjs';
import { conWidgets } from './lib/datos-prueba.mjs';

export default {
  nombre: 'widgets: notas, Spotify y más usadas',
  async ejecutar(abrir) {
    // Una nota escrita se guarda en su propia clave.
    let pg = await abrir({ datos: conWidgets([{ id: 'w-notas', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} }]) });
    await pg.ev(`(() => { const t = document.querySelector('.notas-texto'); t.focus(); t.value = 'Revisar copias'; t.dispatchEvent(new Event('input')); t.blur(); })()`);
    await pg.esperar(300);
    igual(await pg.ev(`JSON.parse(localStorage.getItem('notas:w-notas'))`), 'Revisar copias', 'nota guardada');

    // El reproductor de Spotify no se recrea al repintar (cortaría la música).
    pg = await abrir({ datos: conWidgets([{ id: 'w-spotify', tipo: 'spotify', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 9 }, config: { url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M' } }]) });
    await pg.ev(`document.querySelector('.widget-spotify iframe').dataset.marca = 'original'`);
    await pg.clic('#btn-editar');
    await pg.clic('#btn-editar');
    igual(await pg.ev(`document.querySelector('.widget-spotify iframe')?.dataset.marca`), 'original', 'iframe de Spotify tras repintar');

    // Más usadas no repite lo que ya está en un grupo (mismo dominio y puerto).
    pg = await abrir({
      datos: conWidgets([{ id: 'w-mas', tipo: 'masUsadas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 6 }, config: { cantidad: 5 } }]),
      topSites: [
        { url: 'http://192.168.1.11/panel', title: 'Ya está en Alfa' },
        { url: 'https://mail.example.com/bandeja', title: 'Ya está en Trabajo' },
        { url: 'chrome://settings/', title: 'Interna de Chrome' },
        { url: 'https://nueva.example.org/', title: 'Nueva' },
        { url: 'https://nueva.example.org/otra', title: 'Mismo sitio' },
      ],
    });
    await pg.esperar(200);
    igual(await pg.ev(`[...document.querySelectorAll('.mas-usadas .nombre')].map(n => n.textContent)`), ['Nueva'], 'webs en Más usadas');
  },
};
