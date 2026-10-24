// Tema, opciones, paneles, fondo y reloj.
import { $, $$, avisar, crear, svg } from './util.js';
import { alCambiar, escribir, recordar } from './almacen.js';
import { claveAspecto, migracionFallida, perfilActivo, perfilesDeLaLista } from './perfiles.js';
import { datos } from './datos.js';
import { pintar, pintarLocal } from './pintado.js';
import { resolver } from './rejilla.js';
import { editando } from './edicion.js';
import { FONDOS } from './fondos.js';
import { Terreno, miniatura } from './terreno.js';
import { BUSCADOR, normalizarBuscador } from './motores.js';
import { MAX_TEMAS_PROPIOS, TEMAS, buscarTema, sobreAcento, temasPropios, todosLosTemas } from './temas.js';
import { CLAVE_FONDO_IMAGEN, borrarImagenFondo, guardarImagenFondo, leerImagenFondo, reducirImagen } from './imagen-fondo.js';

export const CLAVE_TEMA = 'tema';
export const CLAVE_OPCIONES = 'opciones';
// Ajustes de aspecto: si falta alguno o es inválido, vale el de aquí (la página queda como en la versión 4.2.0).
export const APARIENCIA = {
  acento: null, fondo: 'curvas', intensidad: 100, intensidadImagen: 40, densidad: 'comoda',
  esquinas: 'medio', hora24: true, segundos: false, fecha: true,
  // El terreno del fondo: semilla (null = el id del perfil), densidad y relieve de 0 a 1, movimiento y luz bajo el ratón.
  semilla: null, densidadFondo: 0.55, relieve: 0.45, movimiento: 'lento', brillo: true,
  // El estilo de la página: no mueve los bloques, cambia el reloj y cómo se ven los grupos con vista «auto».
  estilo: 'mapa',
  direcciones: true, // la dirección bajo cada enlace (Mapa y Baldosas)
};
export const IDS_FONDO = [...Object.keys(FONDOS), 'liso', 'imagen'];
// Los dibujos de la versión 5.2 que ya no existen pasan al nuevo más parecido.
export const FONDOS_ANTIGUOS = { teselas: 'rombos', ondas: 'crestas', puntos: 'cotas', cuadricula: 'trama', hexagonos: 'trama', anillos: 'curvas', montanas: 'crestas' };

export const OPCIONES = { fondoGrupos: true, sobrio: false, ocultos: { izq: false, der: false }, apariencia: APARIENCIA, buscador: BUSCADOR, anchoIzq: null };

// Las muestras de la pestaña Tema: un círculo con el fondo del tema y un punto con su acento. Las de los
// temas propios llevan un botón para editarlas, y al final está «Crear tema» (ver editor-tema.js).
const editarTema = id => document.dispatchEvent(new CustomEvent('novatab:editar-tema', { detail: { id } }));
export function pintarMuestras() {
  const piezas = todosLosTemas().map(t => {
    const b = crear('button', 'muestra');
    b.type = 'button';
    b.dataset.tema = t.id;
    b.style.setProperty('--m-bg', t.bg);
    b.style.setProperty('--m-acento', t.acento);
    const mini = crear('canvas', 'mini-tema');
    mini.setAttribute('aria-hidden', 'true');
    b.append(mini, crear('i'), t.nombre);
    b.addEventListener('click', () => {
      ponerTema(t.id);
      guardarOpciones();
    });
    if (!t.propio) return b;
    const editar = crear('button', 'editar-tema');
    editar.type = 'button';
    editar.innerHTML = svg('lapiz');
    editar.setAttribute('aria-label', `Editar el tema ${t.nombre}`);
    editar.title = editar.getAttribute('aria-label');
    editar.addEventListener('click', () => editarTema(t.id));
    const caja = crear('div', 'muestra-propia');
    caja.append(b, editar);
    return caja;
  });
  const crearTema = crear('button', 'crear-tema', 'Crear tema');
  crearTema.type = 'button';
  crearTema.disabled = temasPropios().length >= MAX_TEMAS_PROPIOS;
  crearTema.title = crearTema.disabled ? `Ya tienes ${MAX_TEMAS_PROPIOS} temas propios: borra uno para crear otro` : 'Un tema con tu fondo y tu acento, para todos los perfiles';
  crearTema.addEventListener('click', () => editarTema(null));
  $('#muestras').replaceChildren(...piezas, crearTema);
  marcarMuestras();
  requestAnimationFrame(pintarMinisTema);
}
const marcarMuestras = () => {
  const aplicado = buscarTema(temaActual).id;
  for (const m of $$('#muestras .muestra')) m.setAttribute('aria-pressed', String(m.dataset.tema === aplicado));
};

// El tema guardado en el perfil, aunque no exista (un tema propio borrado en otro equipo): así no se
// reescribe su aspecto; lo que se ve es buscarTema(temaActual), que en ese caso es Bosque.
export let temaActual = TEMAS[0].id;
export function ponerTema(id, { animar = true } = {}) {
  temaActual = typeof id === 'string' && id ? id : TEMAS[0].id;
  if (!animar) sinTransicion();
  aplicarColores(buscarTema(temaActual));
  marcarMuestras();
  document.dispatchEvent(new Event('novatab:tema')); // las miniaturas con el terreno del perfil se repintan
  pintarMinisFondo();
}

// Pone los tres colores del tema (y el acento libre, si lo hay) en :root; lo demás se deriva en style.css.
export function aplicarColores(t, acento = apariencia.acento ?? t.acento) {
  const raiz = document.documentElement;
  raiz.style.setProperty('--bg', t.bg);
  raiz.style.setProperty('--ink', t.ink);
  raiz.style.setProperty('--acento', acento);
  raiz.style.setProperty('--sobre-acento', sobreAcento(acento));
  raiz.dataset.tema = t.id;
  raiz.dataset.modo = t.modo;
  $('#acento-libre').value = acento;
  // El fondo sigue a los colores durante su transición (0,8 s), solo si cambian de verdad.
  const colores = `${t.bg}${t.ink}${acento}`;
  if (colores !== coloresPintados) {
    coloresPintados = colores;
    terreno.pedirDurante(900);
  }
}
let coloresPintados = '';

// Sin la transición de colores durante un instante (al arrancar no debe verse el paso desde Bosque).
function sinTransicion() {
  const raiz = document.documentElement;
  raiz.classList.add('sin-transicion');
  requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('sin-transicion')));
}

export let opciones = { ...OPCIONES };

const entre = (n, min, max, defecto) => Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : defecto;
const uno = (v, validos, defecto) => validos.includes(v) ? v : defecto;
const booleano = (v, defecto) => typeof v === 'boolean' ? v : defecto;
const fraccion = (v, defecto) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(1, Math.max(0, v)) * 100) / 100 : defecto;

export const ESTILOS = ['mapa', 'baldosas', 'compacto'];

export function normalizarApariencia(a) {
  const x = a && typeof a === 'object' ? a : {};
  return {
    acento: typeof x.acento === 'string' && /^#[0-9a-f]{6}$/i.test(x.acento) ? x.acento.toLowerCase() : APARIENCIA.acento,
    fondo: uno(FONDOS_ANTIGUOS[x.fondo] ?? x.fondo, IDS_FONDO, APARIENCIA.fondo),
    intensidad: entre(x.intensidad, 0, 100, APARIENCIA.intensidad),
    intensidadImagen: entre(x.intensidadImagen, 0, 100, APARIENCIA.intensidadImagen),
    densidad: uno(x.densidad, ['comoda', 'compacta'], APARIENCIA.densidad),
    esquinas: uno(x.esquinas, ['recto', 'medio', 'redondo'], APARIENCIA.esquinas),
    hora24: booleano(x.hora24, APARIENCIA.hora24),
    segundos: booleano(x.segundos, APARIENCIA.segundos),
    fecha: booleano(x.fecha, APARIENCIA.fecha),
    semilla: typeof x.semilla === 'string' && x.semilla.length >= 1 && x.semilla.length <= 40 ? x.semilla : APARIENCIA.semilla,
    densidadFondo: fraccion(x.densidadFondo, APARIENCIA.densidadFondo),
    relieve: fraccion(x.relieve, APARIENCIA.relieve),
    movimiento: uno(x.movimiento, ['quieto', 'lento', 'vivo'], APARIENCIA.movimiento),
    brillo: booleano(x.brillo, APARIENCIA.brillo),
    estilo: uno(x.estilo, ESTILOS, APARIENCIA.estilo),
    direcciones: booleano(x.direcciones, APARIENCIA.direcciones),
  };
}

// Aplica los ajustes al documento: variables en :root y clases en body.
export let apariencia = { ...APARIENCIA };
export function ponerApariencia(a) {
  const estiloAntes = apariencia.estilo;
  apariencia = normalizarApariencia(a);
  aplicarColores(buscarTema(temaActual));
  const clases = document.body.classList;
  // Compacto lleva la densidad compacta sin tocar el ajuste guardado.
  clases.toggle('compacta', apariencia.densidad === 'compacta' || apariencia.estilo === 'compacto');
  for (const e of ESTILOS) clases.toggle(`estilo-${e}`, apariencia.estilo === e);
  clases.toggle('sin-direcciones', !apariencia.direcciones);
  for (const b of $$('[data-estilo]')) b.setAttribute('aria-pressed', String(b.dataset.estilo === apariencia.estilo));
  // Con otro estilo los grupos «auto» cambian de vista (y de alto): lo que se pise baja y se repinta.
  if (estiloAntes !== apariencia.estilo && datos?.grupos) { resolver(); pintar(); }
  document.dispatchEvent(new Event('novatab:apariencia')); // los widgets con hora (reloj mundial) se repintan
  for (const e of ['recto', 'medio', 'redondo']) clases.toggle(`esquinas-${e}`, apariencia.esquinas === e);
  for (const d of ['comoda', 'compacta']) $(`#densidad-${d}`).setAttribute('aria-pressed', String(apariencia.densidad === d));
  for (const e of ['recto', 'medio', 'redondo']) $(`#esquinas-${e}`).setAttribute('aria-pressed', String(apariencia.esquinas === e));
  $('#opt-hora24').checked = apariencia.hora24;
  $('#opt-segundos').checked = apariencia.segundos;
  $('#opt-fecha').checked = apariencia.fecha;
  $('#opt-direcciones').checked = apariencia.direcciones;
  muestrasFondo.forEach(m => m.setAttribute('aria-pressed', String(m.dataset.fondo === apariencia.fondo)));
  $('#intensidad').value = String(usaImagen() ? apariencia.intensidadImagen : apariencia.intensidad);
  pintarAjustesTerreno();
  pintarFondo();
  pintarMinisFondo();
  reloj();
  programarReloj();
}

// Ancho del panel izquierdo, en % de la página: un entero de 25 a 50, o null (el ancho de siempre, el 36 %).
export const ANCHO_IZQ_DEFECTO = 36;
export function normalizarAnchoIzq(v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  return n >= 25 && n <= 50 ? n : null;
}

function aplicarAnchoIzq() {
  const n = opciones.anchoIzq;
  document.body.classList.toggle('ancho-izq', n !== null);
  if (n !== null) document.documentElement.style.setProperty('--ancho-izq', `${n}%`);
  else document.documentElement.style.removeProperty('--ancho-izq');
  if (n !== null) {
    $('#separador-paneles').setAttribute('aria-valuenow', String(n));
    $('#separador-paneles').setAttribute('aria-valuetext', `${n} %`);
  }
}

// Mientras se arrastra el separador se aplica al momento sin guardar; al soltar se guarda una vez.
export function ponerAnchoIzqVivo(v) {
  opciones = { ...opciones, anchoIzq: normalizarAnchoIzq(v) };
  tocadas.add('anchoIzq');
  aplicarAnchoIzq();
}

export function cambiarAnchoIzq(v, diferir = false) {
  ponerAnchoIzqVivo(v);
  guardarCambio(diferir);
}

// Mientras se arrastra (o hay un guardado pendiente), un eco de otra pestaña no se aplica: se retiene y, al
// guardar, se funde con lo propio (gana lo que se tocó aquí, lo demás se toma del eco).
let pausaEcos = false;
let ecoRetenido = null;
const tocadas = new Set();
export const pausarEcos = pausa => { pausaEcos = pausa; };

export function recibirEco(nuevo) {
  if (guardadoPendiente || pausaEcos) ecoRetenido = nuevo;
  else ponerOpciones(nuevo);
}

// Al cambiar de perfil: lo pendiente del anterior (un guardado diferido, un eco retenido) no debe acabar en el nuevo.
export function descartarEco() {
  clearTimeout(temporizadorGuardado);
  guardadoPendiente = false;
  ecoRetenido = null;
  tocadas.clear();
}

export function fusionarEco() {
  if (ecoRetenido) {
    const mias = Object.fromEntries([...tocadas].map(k => [k, opciones[k]]));
    const eco = ecoRetenido;
    ecoRetenido = null;
    ponerOpciones({ ...eco, ...mias });
  }
  tocadas.clear();
}

// Guarda las opciones; lo recuerda antes para reconocer su eco como propio (ver almacen.recordar).
// Hay un cambio aplicado que aún no se guardó (controles que se arrastran): un eco ajeno no debe pisarlo.
export const hayGuardadoPendiente = () => guardadoPendiente || pausaEcos;

export function guardarOpciones() {
  clearTimeout(temporizadorGuardado);
  guardadoPendiente = false;
  fusionarEco();
  if (migracionFallida) return Promise.resolve(); // sin migrar no se escribe nada en las claves nuevas
  // Lo común (el buscador) va en «opciones»; el resto, con el tema, en el aspecto del perfil activo.
  const { buscador, tema, ...resto } = opciones; // «tema» viene del aspecto leído: manda el tema actual
  const comunes = { buscador };
  const aspecto = { tema: temaActual, ...resto };
  recordar(CLAVE_OPCIONES, comunes);
  recordar(claveAspecto(perfilActivo()), aspecto);
  return Promise.all([escribir(CLAVE_OPCIONES, comunes), escribir(claveAspecto(perfilActivo()), aspecto)]);
}
let temporizadorGuardado;
let guardadoPendiente = false;
// Con «diferir» (controles que se arrastran o campos de texto) se aplica al instante y se guarda al dejar de mover.
function guardarCambio(diferir) {
  if (!diferir) {
    guardarOpciones();
    return;
  }
  guardadoPendiente = true;
  clearTimeout(temporizadorGuardado);
  temporizadorGuardado = setTimeout(guardarOpciones, 250);
}

export function cambiarApariencia(parcial, diferir = false) {
  opciones = { ...opciones, apariencia: normalizarApariencia({ ...opciones.apariencia, ...parcial }) };
  tocadas.add('apariencia');
  ponerApariencia(opciones.apariencia);
  guardarCambio(diferir);
}

// Motor y atajos del buscador (ver motores.js).
export function cambiarBuscador(parcial, diferir = false) {
  opciones = { ...opciones, buscador: normalizarBuscador({ ...opciones.buscador, ...parcial }) };
  tocadas.add('buscador');
  guardarCambio(diferir);
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && guardadoPendiente) guardarOpciones();
});
document.addEventListener('novatab:volcar', () => { if (guardadoPendiente) guardarOpciones(); });

export function ponerOpciones(o) {
  aspectoListo = true;
  const nuevas = o && typeof o === 'object' ? o : {};
  opciones = { ...OPCIONES, ...nuevas, ocultos: { ...OPCIONES.ocultos, ...(nuevas.ocultos || {}) }, apariencia: normalizarApariencia(nuevas.apariencia), buscador: normalizarBuscador(nuevas.buscador), anchoIzq: normalizarAnchoIzq(nuevas.anchoIzq) };
  ponerApariencia(opciones.apariencia);
  aplicarAnchoIzq();
  document.body.classList.toggle('grupos-con-fondo', !!opciones.fondoGrupos);
  $('#opt-fondo-grupos').checked = !!opciones.fondoGrupos;
  document.body.classList.toggle('sobrio', !!opciones.sobrio);
  $('#opt-sobrio').checked = !!opciones.sobrio;
  if (datos) pintar();
  for (const [panel, nombre] of [['izq', 'el panel izquierdo'], ['der', 'la red local']]) {
    const oculto = !!opciones.ocultos[panel];
    document.body.classList.toggle(`sin-${panel}`, oculto);
    const b = $(`#btn-panel-${panel}`);
    b.setAttribute('aria-pressed', String(!oculto));
    b.title = `${oculto ? 'Mostrar' : 'Ocultar'} ${nombre}`;
  }
}

// Ocultar o mostrar un panel entero. Nunca quedan los dos ocultos.
for (const panel of ['izq', 'der']) {
  $(`#btn-panel-${panel}`).addEventListener('click', () => {
    const ocultos = { ...opciones.ocultos, [panel]: !opciones.ocultos[panel] };
    if (ocultos.izq && ocultos.der) ocultos[panel === 'izq' ? 'der' : 'izq'] = false;
    ponerOpciones({ ...opciones, ocultos });
    guardarOpciones();
    if (editando) pintarLocal();
  });
}

$('#opt-sobrio').addEventListener('change', ev => {
  ponerOpciones({ ...opciones, sobrio: ev.target.checked });
  guardarOpciones();
});

$('#opt-fondo-grupos').addEventListener('change', ev => {
  ponerOpciones({ ...opciones, fondoGrupos: ev.target.checked });
  guardarOpciones();
});

export const panelTema = $('#panel-tema');

// Pestañas Aspecto, Disposición, Buscador y Datos del estudio; el indicador se desliza a la elegida.
const moverIndicador = () => {
  const b = $('#panel-tema [role="tab"][aria-selected="true"]');
  const ind = $('#panel-tema .indicador-pestana');
  ind.style.width = `${b.offsetWidth}px`;
  ind.style.transform = `translateX(${b.offsetLeft}px)`;
};
for (const pestana of document.querySelectorAll('#panel-tema [role="tab"]')) {
  pestana.addEventListener('click', () => {
    for (const otra of document.querySelectorAll('#panel-tema [role="tab"]')) {
      const activa = otra === pestana;
      otra.setAttribute('aria-selected', String(activa));
      $(`#pestana-${otra.dataset.pestana}`).hidden = !activa;
    }
    moverIndicador();
  });
}

// Las miniaturas de las muestras: el terreno del perfil en los colores de cada tema.
export function pintarMinisTema() {
  if (panelTema.hidden) return;
  for (const c of $$('#muestras canvas.mini-tema')) {
    const t = buscarTema(c.parentElement.dataset.tema);
    miniatura(c, { semilla: apariencia.semilla ?? perfilActivo(), estilo: apariencia.fondo in FONDOS ? apariencia.fondo : 'curvas', densidad: apariencia.densidadFondo, relieve: apariencia.relieve, tema: t });
  }
}

// El estudio: abrirlo encoge la página a la izquierda (salvo en pantalla estrecha, donde es una hoja abajo).
const ajustarEscala = () => {
  document.documentElement.style.setProperty('--k', String(Math.max(0.3, (innerWidth - 480 - 96) / innerWidth)));
};
export function abrirEstudio() {
  const nombre = perfilesDeLaLista().find(p => p.id === perfilActivo())?.nombre ?? 'este perfil';
  for (const em of $$('#panel-tema .nombre-ambito')) em.textContent = nombre;
  ajustarEscala();
  panelTema.hidden = false;
  document.documentElement.classList.add('estudio');
  $('#btn-tema').setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => { moverIndicador(); pintarMinisTema(); pintarMinisFondo(); });
}
export function cerrarEstudio() {
  if (panelTema.hidden) return;
  const volver = panelTema.contains(document.activeElement);
  panelTema.hidden = true;
  document.documentElement.classList.remove('estudio');
  $('#btn-tema').setAttribute('aria-expanded', 'false');
  if (volver) $('#btn-tema').focus();
}
addEventListener('resize', ajustarEscala);
document.addEventListener('novatab:apariencia', () => requestAnimationFrame(pintarMinisTema));
document.addEventListener('novatab:perfil', () => { if (!panelTema.hidden) abrirEstudio(); });

$('#acento-libre').addEventListener('input', ev => cambiarApariencia({ acento: ev.target.value }, true));
for (const b of document.querySelectorAll('[data-densidad]')) b.addEventListener('click', () => cambiarApariencia({ densidad: b.dataset.densidad }));
for (const b of document.querySelectorAll('[data-esquinas]')) b.addEventListener('click', () => cambiarApariencia({ esquinas: b.dataset.esquinas }));
for (const b of document.querySelectorAll('[data-estilo]')) b.addEventListener('click', () => cambiarApariencia({ estilo: b.dataset.estilo }));
$('#opt-hora24').addEventListener('change', ev => cambiarApariencia({ hora24: ev.target.checked }));
$('#opt-segundos').addEventListener('change', ev => cambiarApariencia({ segundos: ev.target.checked }));
$('#opt-fecha').addEventListener('change', ev => cambiarApariencia({ fecha: ev.target.checked }));
$('#opt-direcciones').addEventListener('change', ev => cambiarApariencia({ direcciones: ev.target.checked }));
$('#acento-restaurar').addEventListener('click', () => cambiarApariencia({ acento: null }));
$('#btn-tema').addEventListener('click', () => (panelTema.hidden ? abrirEstudio() : cerrarEstudio()));
$('#estudio-cerrar').addEventListener('click', cerrarEstudio);
$('#estudio-hecho').addEventListener('click', cerrarEstudio);
document.addEventListener('click', ev => {
  if (ev.target.isConnected && !ev.target.closest('#isla, #panel-tema, dialog')) cerrarEstudio();
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && !document.querySelector('dialog[open]')) cerrarEstudio();
});

// El fondo: el terreno del perfil dibujado en el canvas (o nada, con «liso») a la intensidad elegida.
// Con «imagen» y una imagen guardada en este equipo se pone la imagen con su velo y el canvas se oculta; sin
// ella, las curvas (el ajuste guardado no cambia: en otro equipo de la misma cuenta puede que la imagen exista).
let imagenFondo = null;
let claveFondo = '';
const usaImagen = () => apariencia.fondo === 'imagen' && !!imagenFondo;
export const terreno = new Terreno($('#terreno'));
const velo = crear('div', 'velo');
$('#fondo').append(velo);
// Hasta tener el aspecto del perfil no se dibuja nada: con los valores por defecto el relieve empezaría en
// el de Principal y luego se transformaría en el del perfil abierto.
let aspectoListo = false;
export function pintarFondo() {
  const fondo = $('#fondo'), lienzo = $('#terreno');
  const imagen = usaImagen();
  const clave = imagen ? imagenFondo : '';
  if (claveFondo !== clave) {
    claveFondo = clave;
    fondo.style.backgroundImage = imagen ? `url("${imagenFondo}")` : '';
  }
  velo.hidden = !imagen;
  if (imagen) {
    lienzo.hidden = true;
    fondo.style.opacity = '1';
    velo.style.opacity = String(1 - apariencia.intensidadImagen / 100);
  } else {
    const id = FONDOS[apariencia.fondo] ? apariencia.fondo : apariencia.fondo === 'imagen' ? 'curvas' : null;
    lienzo.hidden = !id || !aspectoListo || apariencia.intensidad === 0; // con intensidad 0 no se vería
    if (!lienzo.hidden) {
      terreno.config({
        semilla: apariencia.semilla ?? perfilActivo(), estilo: id, densidad: apariencia.densidadFondo,
        relieve: apariencia.relieve, movimiento: apariencia.movimiento, brillo: apariencia.brillo,
      });
    }
    fondo.style.opacity = String(apariencia.intensidad / 100);
  }
  $('#quitar-imagen').hidden = !imagenFondo;
  // La imagen puede llegar después (o de otra pestaña): los controles del panel la siguen.
  $('#intensidad').value = String(imagen ? apariencia.intensidadImagen : apariencia.intensidad);
  pintarAjustesTerreno();
}

leerImagenFondo().then(url => { imagenFondo = url; pintarFondo(); }).catch(() => {});
// La imagen cambió en esta u otra pestaña.
alCambiar(cambios => {
  if (!(CLAVE_FONDO_IMAGEN in cambios)) return;
  leerImagenFondo().then(url => { imagenFondo = url; pintarFondo(); }).catch(() => {});
});

// Las muestras de la pestaña Fondo.
// Cada imagen elegida es una petición: si mientras se reduce se pide otra cosa, el resultado viejo se descarta.
let peticionImagen = 0;
const muestrasFondo = Object.entries(FONDOS).concat([['liso', { nombre: 'Liso' }], ['imagen', { nombre: 'Imagen propia' }]]).map(([id, f]) => {
  const b = crear('button');
  b.type = 'button';
  b.dataset.fondo = id;
  if (FONDOS[id]) {
    const mini = crear('canvas', 'mini-fondo');
    mini.setAttribute('aria-hidden', 'true');
    b.append(mini);
  }
  b.append(f.nombre);
  b.addEventListener('click', () => {
    peticionImagen++; // elegir un fondo cancela una imagen que aún se esté reduciendo
    // «Imagen propia»: sin imagen, o si ya está elegida, abre el selector de archivos (así se cambia la imagen).
    if (id === 'imagen' && (!imagenFondo || apariencia.fondo === 'imagen')) $('#archivo-fondo').click();
    else cambiarApariencia({ fondo: id });
  });
  return b;
});
$('#muestras-fondo').append(...muestrasFondo);

// Las miniaturas de las muestras: el terreno del perfil en cada estilo, con los colores del tema. Solo se
// pintan si se ven (con el panel cerrado no miden nada), así que también al abrir la pestaña Fondo.
export function pintarMinisFondo() {
  const t = buscarTema(temaActual);
  const tema = { bg: t.bg, ink: t.ink, acento: apariencia.acento ?? t.acento, modo: t.modo };
  for (const c of $$('#muestras-fondo canvas.mini-fondo')) {
    miniatura(c, { semilla: apariencia.semilla ?? perfilActivo(), estilo: c.parentElement.dataset.fondo, densidad: apariencia.densidadFondo, relieve: apariencia.relieve, tema });
  }
}
$('#panel-tema [data-pestana="tema"]').addEventListener('click', () => requestAnimationFrame(() => { pintarMinisTema(); pintarMinisFondo(); }));

// Los ajustes del terreno, solo cuando se dibuja (no con «liso» ni con la imagen, que avisa de que no se mueve).
function pintarAjustesTerreno() {
  $('#ajustes-terreno').hidden = apariencia.fondo === 'liso' || usaImagen();
  $('#nota-imagen').hidden = !usaImagen();
  $('#densidad-fondo').value = String(Math.round(apariencia.densidadFondo * 100));
  $('#relieve').value = String(Math.round(apariencia.relieve * 100));
  for (const b of $$('[data-movimiento]')) b.setAttribute('aria-pressed', String(b.dataset.movimiento === apariencia.movimiento));
  $('#opt-brillo').checked = apariencia.brillo;
}
$('#densidad-fondo').addEventListener('input', ev => cambiarApariencia({ densidadFondo: Number(ev.target.value) / 100 }, true));
$('#relieve').addEventListener('input', ev => cambiarApariencia({ relieve: Number(ev.target.value) / 100 }, true));
for (const b of $$('[data-movimiento]')) b.addEventListener('click', () => cambiarApariencia({ movimiento: b.dataset.movimiento }));
$('#opt-brillo').addEventListener('change', ev => cambiarApariencia({ brillo: ev.target.checked }));
$('#otro-terreno').addEventListener('click', () => {
  cambiarApariencia({ semilla: `${perfilActivo()}-${Math.random().toString(36).slice(2, 7).padEnd(5, '0')}` });
});
// El deslizador gobierna la intensidad del dibujo, o la de la imagen cuando el fondo es la imagen.
$('#intensidad').addEventListener('input', ev => {
  const valor = Number(ev.target.value);
  cambiarApariencia(usaImagen() ? { intensidadImagen: valor } : { intensidad: valor }, true);
});

$('#archivo-fondo').addEventListener('change', async ev => {
  const archivo = ev.target.files[0];
  ev.target.value = '';
  if (!archivo) return;
  const mia = ++peticionImagen;
  avisar('Reduciendo la imagen…');
  let url;
  try {
    url = await reducirImagen(archivo);
  } catch (err) {
    if (mia === peticionImagen) avisar(err.message);
    return;
  }
  if (mia !== peticionImagen) return;
  try {
    await guardarImagenFondo(url);
  } catch (err) {
    avisar(`No se pudo guardar la imagen: ${err.message}`);
    return;
  }
  if (mia !== peticionImagen) return;
  imagenFondo = url;
  cambiarApariencia({ fondo: 'imagen' });
  avisar('Imagen de fondo guardada');
});
$('#quitar-imagen').addEventListener('click', async () => {
  try {
    await borrarImagenFondo();
  } catch (err) {
    avisar(`No se pudo quitar la imagen: ${err.message}`);
    return;
  }
  peticionImagen++;
  imagenFondo = null;
  if (apariencia.fondo === 'imagen') cambiarApariencia({ fondo: 'curvas' });
  else pintarFondo();
});

// La hora, un span por carácter: los dígitos que cambian caen desde arriba (sin movimiento reducido no se anima,
// ver style.css). El texto del reloj sigue siendo la hora entera.
function ponerHora(texto) {
  const hora = $('#hora');
  const antes = hora.textContent;
  if (antes === texto) return;
  hora.replaceChildren(...[...texto].map((c, i) => crear('span', antes && antes[i] !== c ? 'digito cae' : 'digito', c)));
}

export function reloj() {
  const d = new Date();
  const formato = { hour: '2-digit', minute: '2-digit', hour12: !apariencia.hora24 };
  if (apariencia.segundos) formato.second = '2-digit';
  ponerHora(d.toLocaleTimeString('es-ES', formato));
  $('#fecha').textContent = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  $('#fecha').hidden = !apariencia.fecha;
}

// Cada segundo solo si se muestran los segundos; si no, cada 10 s.
let temporizadorReloj;
export function programarReloj() {
  clearTimeout(temporizadorReloj);
  // Con segundos, justo después de cada cambio de segundo.
  const espera = apariencia.segundos ? 1000 - Date.now() % 1000 + 5 : 10000;
  temporizadorReloj = setTimeout(() => { reloj(); programarReloj(); }, espera);
}

pintarMuestras();
