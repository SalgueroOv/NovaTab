import { DATOS_PRUEBA } from './lib/datos-prueba.mjs';
import { auditar, axeDisponible, describir } from './lib/axe.mjs';

const TEMAS = ['bosque', 'noche', 'medianoche', 'grafito', 'carbon', 'papel', 'glaciar', 'niebla', 'menta', 'rosa'];
const w = (id, tipo, y, config = {}, panel = 'izq') => ({ id, tipo, panel, pos: { x: 1, y, w: 6, h: 6 }, config });
const URL_FEED = 'https://feeds.example.com/x.xml';
const FEED = `<?xml version="1.0"?><rss version="2.0"><channel><title>Noticias</title>${[1, 2, 3].map(i => `<item><title>Titular ${i}</title><link>https://n.example.com/${i}</link><pubDate>Mon, 20 Oct 2026 0${i}:00:00 GMT</pubDate></item>`).join('')}</channel></rss>`;
const DATOS = {
  ...structuredClone(DATOS_PRUEBA),
  grupos: DATOS_PRUEBA.grupos.map((g, i) => ({ ...g, vista: ['lista', 'iconos', 'compacta'][i] ?? 'lista' })),
  widgets: [
    w('w-notas', 'notas', 1), w('w-tareas', 'tareas', 7), w('w-reloj', 'relojMundial', 13), w('w-cuenta', 'cuentaAtras', 19, { nombre: 'Fin de curso', fecha: '2099-06-01T08:00' }),
    w('w-rss', 'rss', 25, { url: URL_FEED, cantidad: 5 }), w('w-serv', 'servicios', 31, { grupos: null }),
  ],
};
const ORIGENES = Object.fromEntries(['http://192.168.1.11', 'http://192.168.1.12:9000', 'http://192.168.1.13:8096', 'http://192.168.1.14:3000', 'http://192.168.1.1', 'https://192.168.1.30:5001', 'http://192.168.1.2', 'http://192.168.1.40', 'http://192.168.1.41'].map(o => [o, 'vivo']));
// Tras cambiar de tema se esperan las transiciones de color (0,3 s): axe leería colores a medio camino.
const tema = async (pg, id) => {
  await pg.ev(`import('/js/apariencia.js').then(m => m.ponerTema('${id}'))`);
  await pg.esperar(450);
};

export default {
  nombre: 'accesibilidad: axe-core sin violaciones graves en los diez temas y en cada estado',
  async ejecutar(abrir) {
    if (!axeDisponible()) return 'saltada: falta «npm install» en herramientas/';
    const fallos = [];
    const revisar = async (estado, pg, opciones) => fallos.push(...describir(estado, (await auditar(pg, opciones)).violaciones));

    const pg = await abrir({ chrome: {}, datos: DATOS, rss: { [URL_FEED]: FEED }, servicios: ORIGENES });
    await pg.esperar(1500);

    // Página principal con cada tema (claros y oscuros).
    for (const id of TEMAS) {
      await tema(pg, id);
      await revisar(`principal [${id}]`, pg);
    }
    await tema(pg, 'bosque');

    // Panel de personalizar: sus cuatro pestañas (y la primera en todos los temas).
    await pg.clic('#btn-tema');
    for (const id of TEMAS) {
      await tema(pg, id);
      await revisar(`panel Tema [${id}]`, pg);
    }
    await tema(pg, 'bosque');
    for (const pestana of ['fondo', 'diseno', 'buscador']) {
      await pg.ev(`document.querySelector('#panel-tema [data-pestana="${pestana}"]').click()`);
      await revisar(`panel ${pestana}`, pg);
    }
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="tema"]').click()`);
    await pg.clic('#btn-tema');

    // Selector de perfiles abierto.
    await pg.clic('#btn-perfil');
    await revisar('selector de perfiles', pg);
    await pg.clic('#btn-perfil');

    // Paleta de comandos.
    await pg.tecla('k', 'ctrl');
    await pg.esperar(200);
    await revisar('paleta de comandos', pg);
    await pg.tecla('Escape');

    // Modo edición y sus diálogos.
    await pg.clic('#btn-editar');
    await pg.esperar(300);
    await revisar('modo edición', pg);
    let actual = 'bosque';
    const dialogo = async (nombre, abrirDlg, cerrar) => {
      await pg.ev(abrirDlg);
      await pg.esperar(300);
      await revisar(`diálogo ${nombre} [${actual}]`, pg);
      await pg.ev(cerrar);
    };
    for (actual of ['bosque', 'papel']) {
      await tema(pg, actual);
          await dialogo('editar enlace', `document.querySelector('#rejilla .grupo .fila').click()`, `document.getElementById('dlg-enlace').close()`);
          await dialogo('editar grupo', `document.querySelector('#rejilla .grupo [data-accion="editar-grupo"]').click()`, `document.getElementById('dlg-grupo').close()`);
          await dialogo('añadir widget', `document.getElementById('btn-nuevo-widget').click()`, `document.getElementById('dlg-widget').close()`);
          await dialogo('marcadores', `document.getElementById('dlg-marcadores').showModal()`, `document.getElementById('dlg-marcadores').close()`);
          await dialogo('perfil', `document.getElementById('dlg-perfil').showModal()`, `document.getElementById('dlg-perfil').close()`);
          await dialogo('restablecer', `document.getElementById('dlg-restablecer').showModal()`, `document.getElementById('dlg-restablecer').close()`);
    }
    await tema(pg, 'bosque');
    await pg.clic('#btn-editar');

    if (fallos.length) throw new Error(`axe-core encontró ${fallos.length} violaciones graves:\n    ${fallos.slice(0, 60).join('\n    ')}`);
  },
};
