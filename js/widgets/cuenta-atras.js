// Widget «Cuenta atrás»: los días, horas y minutos que faltan para una fecha con nombre.
import { avisar, crear } from '../util.js';
import { campo, registrar, vacioWidget } from '../widgets.js';

const MAX_NOMBRE = 40;

// «fecha» es AAAA-MM-DDThh:mm en hora local (lo que da un <input type="datetime-local">). null si no vale.
export function restante(fecha, ahora) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(fecha ?? ''));
  if (!m) return null;
  const [a, mes, d, h, min] = m.slice(1).map(Number);
  const objetivo = new Date(a, mes - 1, d, h, min);
  // Fechas imposibles (mes 13, hora 99) se corrigen solas en Date: se descartan comparando.
  if (objetivo.getFullYear() !== a || objetivo.getMonth() !== mes - 1 || objetivo.getDate() !== d || objetivo.getHours() !== h) return null;
  const ms = objetivo - ahora;
  if (ms <= 0) return { hecho: true, dias: 0, horas: 0, minutos: 0, segundos: 0 };
  return {
    hecho: false,
    dias: Math.floor(ms / 86400000),
    horas: Math.floor(ms % 86400000 / 3600000),
    minutos: Math.floor(ms % 3600000 / 60000),
    segundos: Math.floor(ms % 60000 / 1000),
  };
}

const dos = n => String(n).padStart(2, '0');

function textoDe(r) {
  if (r.hecho) return 'Hecho';
  if (r.dias > 0) return `${r.dias} d ${r.horas} h ${dos(r.minutos)} min`;
  if (r.horas > 0) return `${r.horas} h ${dos(r.minutos)} min`;
  return `${r.minutos} min ${r.segundos} s`;
}

function actualizar(cont) {
  const r = restante(cont.dataset.fecha, new Date());
  const tiempo = cont.querySelector('.tiempo');
  tiempo.textContent = r ? textoDe(r) : '';
  cont.classList.toggle('hecha', !!r?.hecho);
}

function pintar(w, cuerpo) {
  const fecha = w.config.fecha;
  if (restante(fecha, new Date()) === null) return vacioWidget(cuerpo, 'Elige una fecha y hora.');
  const cont = crear('div', 'cuenta-atras');
  cont.dataset.fecha = fecha;
  cont.append(
    crear('div', 'nombre', String(w.config.nombre ?? '').slice(0, MAX_NOMBRE)),
    crear('div', 'tiempo mono'),
    crear('div', 'objetivo', new Date(fecha).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' })),
  );
  actualizar(cont);
  cuerpo.append(cont);
}

setInterval(() => document.querySelectorAll('.cuenta-atras').forEach(actualizar), 1000);

function configurador(actual) {
  return (cuerpo, ctx) => {
    const [lNombre, nombre] = campo('Nombre', { type: 'text', maxLength: MAX_NOMBRE, value: actual.nombre ?? '', placeholder: 'Vacaciones' });
    const [lFecha, fecha] = campo('Fecha y hora', { type: 'datetime-local', value: restante(actual.fecha, new Date()) ? actual.fecha : '' });
    cuerpo.append(lNombre, lFecha);
    ctx.validar = () => {
      if (restante(fecha.value, new Date()) !== null) return true;
      avisar('Elige una fecha y hora');
      return false;
    };
    return () => ({ nombre: nombre.value.trim().slice(0, MAX_NOMBRE), fecha: fecha.value });
  };
}

registrar('cuentaAtras', {
  def: { nombre: 'Cuenta atrás', descripcion: 'Lo que falta para una fecha', w: 4, h: 4, configurable: true },
  pintar,
  configurador,
});
