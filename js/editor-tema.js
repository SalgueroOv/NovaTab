// Crear, editar y borrar temas propios. Mientras se eligen los colores, la página entera muestra el tema;
// al cancelar vuelve al de antes. Los temas propios son comunes a todos los perfiles (ver temas.js).
import { $, avisar } from './util.js';
import { abrirDialogo } from './edicion.js';
import { aplicarColores, guardarOpciones, pintarMuestras, ponerTema, temaActual } from './apariencia.js';
import { MAX_NOMBRE_TEMA, buscarTema, guardarTemasPropios, normalizarTemasPropios, nuevoIdTema, ponerTemasPropios, temaDesde, temasPropios } from './temas.js';

const dlg = $('#dlg-tema');
const form = dlg.querySelector('form');
let editando = null; // el id del tema propio que se edita, o null al crear uno

// La vista previa usa el acento del tema que se está creando, no el acento libre del perfil.
function vistaPrevia() {
  const { bg, acento } = form.elements;
  aplicarColores(temaDesde(form.elements.nombre.value, bg.value, acento.value, editando ?? 'propio-nuevo'), acento.value);
}
form.addEventListener('input', vistaPrevia);

// Borrar cierra el diálogo con su propio valor; abrirEditorTema lo atiende al cerrarse.
$('#borrar-tema').addEventListener('click', () => {
  const t = temasPropios().find(x => x.id === editando);
  if (t && confirm(`¿Borrar el tema “${t.nombre}”?`)) dlg.close('borrar');
});

async function guardarLista(lista) {
  ponerTemasPropios(lista);
  pintarMuestras();
  try {
    await guardarTemasPropios(lista);
  } catch (err) {
    avisar(`No se pudo guardar el tema: ${err.message}`);
  }
}

export async function abrirEditorTema(id) {
  const tema = id ? temasPropios().find(t => t.id === id) : null;
  if (id && !tema) return;
  editando = tema?.id ?? null;
  const base = tema ?? buscarTema(temaActual);
  dlg.querySelector('h2').textContent = tema ? 'Editar tema' : 'Crear tema';
  $('#borrar-tema').hidden = !tema;
  const valores = await abrirDialogo(dlg, { nombre: tema?.nombre ?? '', bg: base.bg, acento: base.acento });

  if (dlg.returnValue === 'borrar') {
    await guardarLista(temasPropios().filter(t => t.id !== editando));
    if (temaActual === editando) {
      ponerTema('bosque');
      guardarOpciones();
    } else {
      ponerTema(temaActual);
    }
    return;
  }
  if (!valores) {
    ponerTema(temaActual); // cancelar: fuera la vista previa
    return;
  }
  const nuevo = { id: editando ?? nuevoIdTema(), nombre: valores.nombre.trim().slice(0, MAX_NOMBRE_TEMA), bg: valores.bg, acento: valores.acento };
  const lista = tema ? temasPropios().map(t => (t.id === nuevo.id ? nuevo : t)) : [...temasPropios(), nuevo];
  await guardarLista(normalizarTemasPropios(lista));
  ponerTema(nuevo.id);
  guardarOpciones();
}

document.addEventListener('novatab:editar-tema', ev => { abrirEditorTema(ev.detail.id); });
