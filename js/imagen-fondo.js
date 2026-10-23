// La imagen de fondo propia: se reduce y se guarda en este equipo (storage.local), nunca en sync.
import { borrar, escribirLocal, leerLocal } from './almacen.js';

const CLAVE_IMAGEN = 'fondo-imagen';
const MAX_BYTES = 3 * 1024 * 1024; // de la data: URL ya codificada
const ANCHOS = [1920, 1440, 1024];
const CALIDADES = [0.8, 0.6, 0.4];
const ALTO_MAX = 4096;
const PESO_MAX = 40 * 1024 * 1024; // de la imagen original

// Solo una data: URL WebP: es lo único que guardamos, y lo que se vuelve a leer se comprueba igual.
export const esImagenGuardable = url => typeof url === 'string' && url.length <= MAX_BYTES && /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(url);

const aUrl = blob => new Promise((resolver, rechazar) => {
  const lector = new FileReader();
  lector.onload = () => resolver(lector.result);
  lector.onerror = () => rechazar(lector.error);
  lector.readAsDataURL(blob);
});

// Devuelve una data: URL WebP de como mucho 1920 px de ancho y 3 MB. Si con la calidad más baja aún no
// cabe, se prueba con anchos menores. Lanza un Error con un mensaje en español si no se puede.
export async function reducirImagen(archivo) {
  if (archivo.size > PESO_MAX) throw new Error('La imagen pesa demasiado (máximo 40 MB)');
  let imagen;
  try {
    imagen = await createImageBitmap(archivo);
  } catch {
    throw new Error('El archivo no es una imagen que se pueda abrir');
  }
  try {
    for (const anchoMax of ANCHOS) {
      const escala = Math.min(1, anchoMax / imagen.width, ALTO_MAX / imagen.height);
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(imagen.width * escala));
      lienzo.height = Math.max(1, Math.round(imagen.height * escala));
      const x = lienzo.getContext('2d');
      if (!x) throw new Error('No se pudo preparar la imagen');
      x.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      for (const calidad of CALIDADES) {
        const blob = await new Promise(resolver => lienzo.toBlob(resolver, 'image/webp', calidad));
        if (!blob || blob.type !== 'image/webp') throw new Error('No se pudo reducir la imagen a WebP');
        const url = await aUrl(blob);
        if (url.length <= MAX_BYTES) return url;
      }
    }
  } finally {
    imagen.close();
  }
  throw new Error('La imagen es demasiado grande incluso reducida');
}

export const guardarImagenFondo = url => escribirLocal(CLAVE_IMAGEN, url);

export async function leerImagenFondo() {
  const url = await leerLocal(CLAVE_IMAGEN);
  return esImagenGuardable(url) ? url : null;
}

export const borrarImagenFondo = () => borrar([CLAVE_IMAGEN]);
export const CLAVE_FONDO_IMAGEN = CLAVE_IMAGEN;
