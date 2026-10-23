import { afirmar, igual } from './lib/util.mjs';

const enLocal = `localStorage.getItem('chrome.local/fondo-imagen')`;
const enSync = `localStorage.getItem('chrome.sync/fondo-imagen')`;
const opciones = `JSON.parse(localStorage.getItem('chrome.sync/opciones') || 'null')`;
const aviso = pg => pg.ev(`[...document.querySelectorAll('#aviso, #aviso-accion')].filter(a => !a.hidden).map(a => a.textContent).join('')`);

// Un archivo de imagen enorme: un lienzo con ruido, exportado como PNG (mide más de 8 MB).
const elegirRuido = `(async () => {
  const c = document.createElement('canvas');
  c.width = 2400; c.height = 1800;
  const x = c.getContext('2d');
  const datos = x.createImageData(c.width, c.height);
  for (let i = 0; i < datos.data.length; i++) datos.data[i] = i % 4 === 3 ? 255 : Math.random() * 256;
  x.putImageData(datos, 0, 0);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  window.__tamanoOriginal = blob.size;
  const dt = new DataTransfer();
  dt.items.add(new File([blob], 'enorme.png', { type: 'image/png' }));
  const i = document.getElementById('archivo-fondo');
  i.files = dt.files;
  i.dispatchEvent(new Event('change', { bubbles: true }));
})()`;
const elegirTexto = `(() => {
  const dt = new DataTransfer();
  dt.items.add(new File(['esto no es una imagen'], 'foto.png', { type: 'image/png' }));
  const i = document.getElementById('archivo-fondo');
  i.files = dt.files;
  i.dispatchEvent(new Event('change', { bubbles: true }));
})()`;

export default {
  nombre: 'imagen de fondo: reducida, en local, con velo y a prueba de fallos',
  async ejecutar(abrir) {
    // (a) y (b) Una imagen de más de 8 MB se guarda reducida, en local y nunca en sync.
    let pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(elegirRuido);
    await pg.esperar(6000);
    afirmar(await pg.ev(`window.__tamanoOriginal`) > 8 * 1024 * 1024, 'el archivo de prueba pesa más de 8 MB');
    const guardada = JSON.parse(await pg.ev(enLocal));
    afirmar(/^data:image\/webp;base64,/.test(guardada), 'imagen guardada como WebP');
    afirmar(guardada.length <= 3 * 1024 * 1024, `la imagen guardada cabe en 3 MB (mide ${guardada.length})`);
    igual(await pg.ev(enSync), null, 'la imagen no está en sync');
    const ancho = await pg.ev(`new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth); i.src = ${JSON.stringify(guardada)}; })`);
    afirmar(ancho <= 1920, `ancho como mucho 1920 (es ${ancho})`);
    igual((await pg.ev(opciones)).apariencia.fondo, 'imagen', 'fondo elegido: imagen');
    afirmar((await pg.ev(`getComputedStyle(document.getElementById('fondo')).backgroundImage`)).startsWith('url("data:image/webp'), 'el fondo lleva la imagen');
    await pg.recargar();
    await pg.esperar(500);
    afirmar((await pg.ev(`getComputedStyle(document.getElementById('fondo')).backgroundImage`)).startsWith('url("data:image/webp'), 'la imagen sobrevive a la recarga');

    // (c) Velo: con intensidad de imagen 40, opacidad 0.6; el deslizador a 100 la deja en 0.
    igual(await pg.ev(`getComputedStyle(document.querySelector('#fondo .velo')).opacity`), '0.6', 'velo con intensidad 40');
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    await pg.ev(`(() => { const e = document.getElementById('intensidad'); e.value = '100'; e.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await pg.esperar(450);
    igual(await pg.ev(`getComputedStyle(document.querySelector('#fondo .velo')).opacity`), '0', 'velo con intensidad 100');
    const ap = (await pg.ev(opciones)).apariencia;
    igual([ap.intensidadImagen, ap.intensidad], [100, 100], 'el deslizador movió intensidadImagen');

    // (g) Quitar imagen.
    await pg.clic('#quitar-imagen');
    await pg.esperar(300);
    igual(await pg.ev(enLocal), null, 'imagen borrada de local');
    igual((await pg.ev(opciones)).apariencia.fondo, 'curvas', 'vuelve a curvas');

    // (d) Un archivo que no es una imagen se rechaza y no cambia nada.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(elegirTexto);
    await pg.esperar(500);
    igual(await aviso(pg), 'El archivo no es una imagen que se pueda abrir', 'aviso con un archivo que no es imagen');
    igual(await pg.ev(enLocal), null, 'nada guardado');
    afirmar((await pg.ev(opciones))?.apariencia?.fondo !== 'imagen', 'el fondo no cambió');

    // (e) Con el almacenamiento local fallando se avisa y el fondo anterior sigue.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(`localStorage.setItem('chrome-falso/localFalla', '1')`);
    await pg.ev(elegirRuido);
    let texto = '';
    for (let i = 0; i < 60 && (!texto || texto.startsWith('Reduciendo')); i++) { await pg.esperar(250); texto = await aviso(pg); } // cada aviso dura 3,5 s
    afirmar(texto.startsWith('No se pudo guardar la imagen'), `aviso de fallo al guardar (era: ${texto})`);
    afirmar((await pg.ev(opciones))?.apariencia?.fondo !== 'imagen', 'el fondo anterior sigue');

    // (f) «imagen» en las opciones pero sin imagen guardada en este equipo: se pinta curvas y el ajuste no cambia.
    pg = await abrir({ chrome: {}, guardados: { 'chrome.sync/opciones': { apariencia: { fondo: 'imagen' } } } });
    await pg.esperar(500);
    afirmar(await pg.ev(`!!document.querySelector('#fondo svg path')`), 'sin imagen se pinta un dibujo');
    igual(await pg.ev(`getComputedStyle(document.getElementById('fondo')).backgroundImage`), 'none', 'sin imagen de fondo');

    // (h) Revisión final: elegir un dibujo mientras se reduce la imagen cancela la imagen.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    await pg.ev(elegirRuido);
    await pg.esperar(300);
    await pg.ev(`document.querySelector('[data-fondo="hexagonos"]').click()`);
    await pg.esperar(9000);
    igual((await pg.ev(opciones)).apariencia.fondo, 'hexagonos', 'el dibujo elegido gana a una imagen que aún se reducía');

    // (i) Quitar la imagen no cambia un dibujo que no es la imagen.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(`localStorage.setItem('chrome.local/fondo-imagen', JSON.stringify('data:image/webp;base64,AAAA'))`);
    await pg.recargar();
    await pg.esperar(500);
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    await pg.ev(`document.querySelector('[data-fondo="hexagonos"]').click()`);
    await pg.clic('#quitar-imagen');
    await pg.esperar(300);
    igual((await pg.ev(opciones)).apariencia.fondo, 'hexagonos', 'quitar la imagen no pisa el dibujo elegido');

    // (j) Una imagen altísima se reduce también en altura y no falla.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    await pg.ev(`(async () => {
      const c = document.createElement('canvas');
      c.width = 600; c.height = 12000;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, 12000);
      g.addColorStop(0, '#e04'); g.addColorStop(1, '#04e');
      x.fillStyle = g; x.fillRect(0, 0, 600, 12000);
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'alta.png', { type: 'image/png' }));
      const i = document.getElementById('archivo-fondo');
      i.files = dt.files;
      i.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await pg.esperar(3000);
    const alta = JSON.parse(await pg.ev(enLocal));
    const alto = await pg.ev(`new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalHeight); i.src = ${JSON.stringify(alta)}; })`);
    afirmar(alto <= 4096, `la altura de la imagen guardada es como mucho 4096 (es ${alto})`);

    // (k) No hay botón aparte para elegir imagen: «Imagen propia» abre el selector, también para cambiarla.
    pg = await abrir({ chrome: {} });
    await pg.esperar(300);
    igual(await pg.ev(`document.getElementById('elegir-imagen')`), null, 'no existe el botón Elegir imagen');
    await pg.ev(`localStorage.setItem('chrome.local/fondo-imagen', JSON.stringify('data:image/webp;base64,AAAA'))`);
    await pg.recargar();
    await pg.esperar(500);
    await pg.clic('#btn-tema');
    await pg.ev(`document.querySelector('#panel-tema [data-pestana="fondo"]').click()`);
    await pg.ev(`window.__selectores = 0; document.getElementById('archivo-fondo').click = () => { window.__selectores++; }`);
    await pg.ev(`document.querySelector('[data-fondo="hexagonos"]').click()`);
    await pg.ev(`document.querySelector('[data-fondo="imagen"]').click()`);
    await pg.esperar(200);
    igual(await pg.ev(`window.__selectores`), 0, 'con imagen guardada y otro fondo activo, «Imagen propia» solo la selecciona');
    igual((await pg.ev(opciones)).apariencia.fondo, 'imagen', 'fondo imagen elegido');
    await pg.ev(`document.querySelector('[data-fondo="imagen"]').click()`);
    igual(await pg.ev(`window.__selectores`), 1, 'con la imagen ya elegida, «Imagen propia» abre el selector de archivos');
  },
};
