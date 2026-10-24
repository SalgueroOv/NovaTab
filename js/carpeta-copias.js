// La carpeta de copias: el usuario la elige una vez (por ejemplo Documentos\NovaTab) y Exportar y la copia
// diaria escriben ahí siempre el mismo archivo por perfil, que se sobrescribe, en vez de llenar Descargas.
const BD = 'novatab-carpeta', ALMACEN = 'carpeta', CLAVE = 'copias';
let carpeta; // undefined: sin leer todavía; null: ninguna

const abrirBD = () => new Promise((ok, mal) => {
  const p = indexedDB.open(BD, 1);
  p.onupgradeneeded = () => p.result.createObjectStore(ALMACEN);
  p.onsuccess = () => ok(p.result);
  p.onerror = () => mal(p.error);
});
async function enBD(modo, accion) {
  const bd = await abrirBD();
  return new Promise((ok, mal) => {
    const t = bd.transaction(ALMACEN, modo);
    const p = accion(t.objectStore(ALMACEN));
    t.oncomplete = () => { bd.close(); ok(p.result); };
    t.onerror = () => { bd.close(); mal(t.error); };
  });
}

export const hayCarpetas = 'showDirectoryPicker' in window;
export const archivoDeCopia = perfil => `novatab-${perfil}.json`;
// El mismo formato que Exportar, para poder importarlo.
export const textoDeCopia = ({ datos, notas, tareas }) => JSON.stringify({ ...datos, notas, tareas }, null, 2);

export async function carpetaDeCopias() {
  if (carpeta === undefined) carpeta = (await enBD('readonly', a => a.get(CLAVE)).catch(() => null)) ?? null;
  return carpeta;
}

export async function ponerCarpeta(h) {
  carpeta = h;
  try {
    await enBD('readwrite', a => (h ? a.put(h, CLAVE) : a.delete(CLAVE)));
  } catch { /* se queda solo en memoria */ }
  document.dispatchEvent(new Event('novatab:carpeta'));
}

export async function elegirCarpeta() {
  await ponerCarpeta(await showDirectoryPicker({ id: 'novatab-copias', mode: 'readwrite', startIn: 'documents' }));
}

// Escribe (o sobrescribe) el archivo en la carpeta. Sin permiso solo lo pide si viene de un clic (pedir), porque
// Chrome no deja pedirlo sin uno. Devuelve si lo escribió.
export async function escribirEnCarpeta(nombre, texto, { pedir = false } = {}) {
  const h = await carpetaDeCopias();
  if (!h) return false;
  let permiso = await h.queryPermission({ mode: 'readwrite' });
  if (permiso === 'prompt' && pedir) permiso = await h.requestPermission({ mode: 'readwrite' });
  if (permiso !== 'granted') return false;
  const escritor = await (await h.getFileHandle(nombre, { create: true })).createWritable();
  await escritor.write(texto);
  await escritor.close();
  return true;
}
