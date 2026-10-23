// Widget «Tareas»: una lista con casillas que se sincroniza como las notas.
import { avisar, crear, nuevoId } from '../util.js';
import { alCambiar, escribir, leer } from '../almacen.js';
import { registrar } from '../widgets.js';
import { MAX_TAREAS, MAX_TEXTO, borrarUna, claveTareas, memoriaTareas, normalizarTareas, notificarTareas } from './tareas-datos.js';

const ESPERA_GUARDADO = 400;
const pendientes = new Map(); // id → temporizador de un guardado por hacer
const ultimoEscrito = new Map(); // id → JSON de lo último escrito (para reconocer su eco)
const remotos = new Map(); // id → lista llegada de otra pestaña mientras se escribe

// Las hechas van al final, cada grupo en su orden.
const ordenar = lista => [...lista.filter(t => !t.hecha), ...lista.filter(t => t.hecha)];

function volcar(id) {
  clearTimeout(pendientes.get(id));
  pendientes.delete(id);
  const lista = memoriaTareas.get(id) ?? [];
  ultimoEscrito.set(id, JSON.stringify(lista));
  escribir(claveTareas(id), lista);
}

function cambiar(id, lista) {
  memoriaTareas.set(id, lista);
  notificarTareas(id, lista);
  clearTimeout(pendientes.get(id));
  pendientes.set(id, setTimeout(() => volcar(id), ESPERA_GUARDADO));
}

function pintarLista(raiz) {
  const id = raiz.dataset.id;
  const lista = memoriaTareas.get(id) ?? [];
  raiz.querySelector('.tareas-lista').replaceChildren(...lista.map(t => {
    const li = crear('li', `tarea${t.hecha ? ' hecha' : ''}`);
    const casilla = crear('input');
    casilla.type = 'checkbox';
    casilla.checked = t.hecha;
    casilla.setAttribute('aria-label', t.texto);
    casilla.addEventListener('change', () => cambiar(id, ordenar((memoriaTareas.get(id) ?? []).map(x => (x.id === t.id ? { ...x, hecha: casilla.checked } : x)))));
    const borrar = crear('button', 'borrar-tarea', '×');
    borrar.type = 'button';
    borrar.title = 'Borrar tarea';
    borrar.setAttribute('aria-label', `Borrar «${t.texto}»`);
    borrar.addEventListener('click', () => cambiar(id, (memoriaTareas.get(id) ?? []).filter(x => x.id !== t.id)));
    li.append(casilla, crear('span', 'texto', t.texto), borrar);
    return li;
  }));
  raiz.querySelector('.borrar-hechas').hidden = !lista.some(t => t.hecha);
}

function pintar(w, cuerpo) {
  const raiz = crear('div', 'tareas');
  raiz.dataset.id = w.id;
  const form = crear('form', 'tareas-form');
  const entrada = crear('input', 'tareas-nueva');
  entrada.type = 'text';
  entrada.placeholder = 'Añadir tarea…';
  entrada.maxLength = MAX_TEXTO;
  entrada.autocomplete = 'off';
  entrada.setAttribute('aria-label', 'Añadir tarea');
  form.append(entrada);
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const texto = entrada.value.trim();
    const lista = memoriaTareas.get(w.id) ?? [];
    if (!texto) return;
    if (lista.length >= MAX_TAREAS) return avisar(`Máximo ${MAX_TAREAS} tareas`);
    entrada.value = '';
    cambiar(w.id, ordenar([...lista, { id: nuevoId(), texto, hecha: false }]));
  });
  // Al terminar de escribir se aplica lo que llegó de otra pestaña mientras tanto.
  entrada.addEventListener('blur', () => {
    const remoto = remotos.get(w.id);
    if (!remoto) return;
    remotos.delete(w.id);
    memoriaTareas.set(w.id, remoto);
    notificarTareas(w.id, remoto);
  });
  const borrarHechas = crear('button', 'boton-texto borrar-hechas', 'Borrar hechas');
  borrarHechas.type = 'button';
  borrarHechas.hidden = true;
  borrarHechas.addEventListener('click', () => cambiar(w.id, (memoriaTareas.get(w.id) ?? []).filter(t => !t.hecha)));
  raiz.append(form, crear('ul', 'tareas-lista'), borrarHechas);
  cuerpo.append(raiz);
  pintarLista(raiz);
  if (!memoriaTareas.has(w.id)) {
    leer(claveTareas(w.id)).then(v => {
      if (memoriaTareas.has(w.id)) return;
      memoriaTareas.set(w.id, normalizarTareas(v));
      pintarLista(raiz);
    });
  }
}

// Cualquier cambio de una lista (de aquí, de otra pestaña o al deshacer) repinta sus filas.
document.addEventListener('novatab:tareas', ev => {
  const raiz = document.querySelector(`.tareas[data-id="${CSS.escape(ev.detail.id)}"]`);
  if (raiz) pintarLista(raiz);
});

// Una lista editada en otra pestaña u otro equipo: se ve al momento, salvo si aquí se está escribiendo una
// tarea o hay algo sin guardar (lo de aquí gana y se guardará).
alCambiar(cambios => {
  for (const [clave, { newValue }] of Object.entries(cambios)) {
    if (!clave.startsWith('tareas:') || !Array.isArray(newValue)) continue;
    const id = clave.slice(7);
    const lista = normalizarTareas(newValue);
    const json = JSON.stringify(lista);
    if (json === JSON.stringify(memoriaTareas.get(id) ?? []) || json === ultimoEscrito.get(id) || pendientes.has(id)) continue;
    const entrada = document.querySelector(`.tareas[data-id="${CSS.escape(id)}"] .tareas-nueva`);
    if (entrada && entrada === document.activeElement && entrada.value) {
      remotos.set(id, lista);
    } else {
      memoriaTareas.set(id, lista);
      notificarTareas(id, lista);
    }
  }
});

// Al salir de la pestaña no se esperan los 400 ms.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') [...pendientes.keys()].forEach(volcar);
});

registrar('tareas', {
  def: { nombre: 'Tareas', descripcion: 'Una lista con casillas que se sincroniza', w: 4, h: 8, configurable: false },
  pintar,
  alBorrar: w => {
    clearTimeout(pendientes.get(w.id));
    pendientes.delete(w.id);
    borrarUna(w.id);
  },
});
