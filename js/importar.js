// Importar los marcadores de Chrome como grupos.
import { $, avisar, avisarConAccion, crear, nuevoId, partes, dominio, urlSegura } from './util.js';
import { claveGrupo, clavesSoloLocal } from './almacen.js';
import { datos } from './datos.js';
import { colocarSinPosicion } from './rejilla.js';
import { claveSitio } from './widgets.js';
import { deshacerUltimo, guardarYPintar } from './edicion.js';

const RAICES = ['Barra de marcadores', 'Otros marcadores', 'Marcadores móviles'];
const NOMBRE_DE_TIPO = { 'bookmarks-bar': RAICES[0], other: RAICES[1], mobile: RAICES[2] };
const MAX_NOMBRE = 40;

// Localhost o una IPv4 de red privada: 10/8, 172.16/12, 192.168/16.
export function esLocal(url) {
  const { host } = partes(url);
  if (host === 'localhost') return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

// Aplana el árbol de getTree() en carpetas con sus enlaces propios (solo http y https). Las raíces se
// nombran por su «folderType» (puede haber una barra local y otra de la cuenta; la gestionada se salta);
// si Chrome no lo da, por posición: barra, «Otros marcadores» y móviles. Una carpeta sin enlaces no aparece.
export function carpetasDeArbol(arbol) {
  const carpetas = [];
  const recorrer = (nodo, nombre, esRaiz) => {
    const enlaces = (nodo.children || [])
      .filter(h => h.url && urlSegura(h.url))
      .map(h => ({ nombre: h.title || '', url: h.url }));
    if (enlaces.length) carpetas.push({ id: nodo.id, nombre, enlaces });
    for (const hijo of nodo.children || []) {
      if (!hijo.url) recorrer(hijo, esRaiz ? hijo.title : `${nombre} / ${hijo.title}`, false);
    }
  };
  (arbol?.[0]?.children || []).forEach((raiz, i) => {
    if (raiz.folderType === 'managed') return;
    const nombre = NOMBRE_DE_TIPO[raiz.folderType] ?? (raiz.folderType ? raiz.title : RAICES[i]);
    if (nombre) recorrer(raiz, nombre, true);
  });
  return carpetas;
}

// Los grupos nuevos de las carpetas elegidas, sin los enlaces cuyo sitio (dominio y puerto) ya está
// en «guardados» o ya salió antes en esta importación. «omitidos» cuenta esos repetidos.
export function gruposDeCarpetas(carpetas, elegidas, guardados) {
  const vistos = new Set(guardados);
  let omitidos = 0;
  const grupos = [];
  for (const carpeta of carpetas.filter(c => elegidas.has(c.id))) {
    const enlaces = [];
    for (const e of carpeta.enlaces) {
      const clave = claveSitio(e.url);
      if (!clave || vistos.has(clave)) {
        omitidos++;
        continue;
      }
      vistos.add(clave);
      enlaces.push({ id: nuevoId(), nombre: e.nombre.trim() || dominio(e.url), url: e.url });
    }
    if (!enlaces.length) continue;
    const locales = enlaces.filter(e => esLocal(e.url)).length;
    grupos.push({
      id: nuevoId(),
      nombre: carpeta.nombre.trim().slice(0, MAX_NOMBRE) || 'Sin nombre',
      zona: locales * 2 > enlaces.length ? 'local' : 'online',
      color: '#8a8c92',
      privado: false,
      vista: 'lista',
      pos: null,
      enlaces,
    });
  }
  return { grupos, omitidos };
}

// ---------- Interfaz ----------

let carpetasOfrecidas = [];

const pedirPermiso = () => new Promise(resolver => chrome.permissions.request({ permissions: ['bookmarks'] }, resolver));
const leerArbol = () => new Promise((resolver, rechazar) => chrome.bookmarks.getTree(arbol => {
  if (chrome.runtime?.lastError || !arbol) rechazar(new Error('sin árbol'));
  else resolver(arbol);
}));

const elegidas = () => new Set([...document.querySelectorAll('#lista-marcadores input:checked')].map(i => i.value));
const actualizarBoton = () => { $('#importar-marcadores-ok').disabled = !elegidas().size; };

function abrirDialogo(carpetas) {
  carpetasOfrecidas = carpetas;
  $('#lista-marcadores').replaceChildren(...carpetas.map(c => {
    const li = crear('li');
    const etiqueta = crear('label');
    const casilla = crear('input');
    casilla.type = 'checkbox';
    casilla.value = c.id;
    casilla.addEventListener('change', actualizarBoton);
    etiqueta.append(casilla, crear('span', 'nombre', c.nombre), crear('span', 'cuenta', `${c.enlaces.length} ${c.enlaces.length === 1 ? 'enlace' : 'enlaces'}`));
    li.append(etiqueta);
    return li;
  }));
  actualizarBoton();
  $('#dlg-marcadores').returnValue = '';
  $('#dlg-marcadores').showModal();
}

async function importar() {
  const guardados = new Set(datos.grupos.flatMap(g => g.enlaces.map(e => claveSitio(e.url))));
  const { grupos, omitidos } = gruposDeCarpetas(carpetasOfrecidas, elegidas(), guardados);
  if (!grupos.length) {
    avisar('No hay nada nuevo que importar: todos los enlaces ya están en tus grupos');
    return;
  }
  datos.grupos.push(...grupos);
  colocarSinPosicion(datos);
  await guardarYPintar();
  const grande = grupos.some(g => clavesSoloLocal.has(claveGrupo(g.id)))
    ? '. Algún grupo es demasiado grande para sincronizar y solo estará en este equipo'
    : '';
  const repetidos = omitidos ? ` (${omitidos} ${omitidos === 1 ? 'repetido omitido' : 'repetidos omitidos'})` : '';
  avisarConAccion(`${grupos.length} ${grupos.length === 1 ? 'grupo importado' : 'grupos importados'}${repetidos}${grande}`, 'Deshacer', deshacerUltimo);
}

// El permiso se pide dentro del clic: sin nada asíncrono antes, o Chrome lo rechaza.
let cargando = false;
$('#btn-importar-marcadores').addEventListener('click', async () => {
  if (typeof chrome === 'undefined' || !chrome.permissions) {
    avisar('Disponible al usarlo como extensión de Chrome');
    return;
  }
  if (cargando) return; // un segundo clic mientras Chrome pregunta no vuelve a pedir nada
  cargando = true;
  try {
    if (!(await pedirPermiso())) {
      avisar('Sin permiso para leer tus marcadores');
      return;
    }
    const carpetas = carpetasDeArbol(await leerArbol());
    if (!carpetas.length) {
      avisar('No hay marcadores http o https que importar');
      return;
    }
    abrirDialogo(carpetas);
  } catch {
    avisar('No se pudieron leer los marcadores');
  } finally {
    cargando = false;
  }
});

$('#dlg-marcadores').addEventListener('close', ev => {
  if (ev.target.returnValue === 'ok') importar();
});
