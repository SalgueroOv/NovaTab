// Widget «Reloj mundial»: la hora de hasta 6 ciudades de una lista fija.
import { $, avisar, crear } from '../util.js';
import { apariencia } from '../apariencia.js';
import { campo, registrar } from '../widgets.js';

export const ZONAS = [
  { id: 'Europe/Madrid', nombre: 'Madrid' },
  { id: 'Atlantic/Canary', nombre: 'Canarias' },
  { id: 'Europe/Lisbon', nombre: 'Lisboa' },
  { id: 'Europe/London', nombre: 'Londres' },
  { id: 'Atlantic/Reykjavik', nombre: 'Reikiavik' },
  { id: 'Europe/Paris', nombre: 'París' },
  { id: 'Europe/Berlin', nombre: 'Berlín' },
  { id: 'Europe/Rome', nombre: 'Roma' },
  { id: 'Europe/Amsterdam', nombre: 'Ámsterdam' },
  { id: 'Europe/Athens', nombre: 'Atenas' },
  { id: 'Europe/Istanbul', nombre: 'Estambul' },
  { id: 'Europe/Moscow', nombre: 'Moscú' },
  { id: 'Africa/Cairo', nombre: 'El Cairo' },
  { id: 'Africa/Johannesburg', nombre: 'Johannesburgo' },
  { id: 'Africa/Nairobi', nombre: 'Nairobi' },
  { id: 'Asia/Dubai', nombre: 'Dubái' },
  { id: 'Asia/Kolkata', nombre: 'Mumbai' },
  { id: 'Asia/Bangkok', nombre: 'Bangkok' },
  { id: 'Asia/Singapore', nombre: 'Singapur' },
  { id: 'Asia/Hong_Kong', nombre: 'Hong Kong' },
  { id: 'Asia/Shanghai', nombre: 'Shanghái' },
  { id: 'Asia/Tokyo', nombre: 'Tokio' },
  { id: 'Asia/Seoul', nombre: 'Seúl' },
  { id: 'Australia/Sydney', nombre: 'Sídney' },
  { id: 'Pacific/Auckland', nombre: 'Auckland' },
  { id: 'Pacific/Honolulu', nombre: 'Honolulu' },
  { id: 'America/Anchorage', nombre: 'Anchorage' },
  { id: 'America/Los_Angeles', nombre: 'Los Ángeles' },
  { id: 'America/Denver', nombre: 'Denver' },
  { id: 'America/Chicago', nombre: 'Chicago' },
  { id: 'America/New_York', nombre: 'Nueva York' },
  { id: 'America/Toronto', nombre: 'Toronto' },
  { id: 'America/Mexico_City', nombre: 'Ciudad de México' },
  { id: 'America/Havana', nombre: 'La Habana' },
  { id: 'America/Bogota', nombre: 'Bogotá' },
  { id: 'America/Lima', nombre: 'Lima' },
  { id: 'America/Caracas', nombre: 'Caracas' },
  { id: 'America/Santiago', nombre: 'Santiago' },
  { id: 'America/Argentina/Buenos_Aires', nombre: 'Buenos Aires' },
  { id: 'America/Sao_Paulo', nombre: 'São Paulo' },
];

const MAX_ZONAS = 6;
const POR_DEFECTO = ['Europe/Madrid', 'America/New_York', 'Asia/Tokyo'];
const nombreDe = id => ZONAS.find(z => z.id === id)?.nombre ?? id;

// Solo ids de la lista, sin repetir y como mucho 6; si no queda ninguna, las de por defecto.
export function zonasValidas(v) {
  const ids = Array.isArray(v) ? v.filter(id => typeof id === 'string' && ZONAS.some(z => z.id === id)) : [];
  const unicos = [...new Set(ids)].slice(0, MAX_ZONAS);
  return unicos.length ? unicos : [...POR_DEFECTO];
}

// La fecha de un instante en una zona, como número de día (para comparar con la del equipo).
const diaEn = (ahora, zona) => {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-US', { ...(zona ? { timeZone: zona } : {}), year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(ahora).map(p => [p.type, Number(p.value)]));
  return Date.UTC(partes.year, partes.month - 1, partes.day) / 86400000;
};

export function formatoZona(id, ahora, hora24) {
  const hora = ahora.toLocaleTimeString('es-ES', { timeZone: id, hour: '2-digit', minute: '2-digit', hour12: !hora24 });
  const diferencia = diaEn(ahora, id) - diaEn(ahora);
  const desfase = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'longOffset' }).formatToParts(ahora)
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT';
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(desfase);
  const utc = m ? `UTC${m[1]}${Number(m[2])}${m[3] && m[3] !== '00' ? `:${m[3]}` : ''}` : 'UTC+0';
  return { hora, dia: diferencia > 0 ? 'mañana' : diferencia < 0 ? 'ayer' : 'hoy', utc };
}

function pintarFilas(contenedor, zonas) {
  const ahora = new Date();
  contenedor.replaceChildren(...zonas.map(id => {
    const f = formatoZona(id, ahora, apariencia.hora24);
    const fila = crear('div', 'reloj-zona');
    fila.dataset.zona = id;
    const nombre = crear('div', 'nombre', nombreDe(id));
    const detalle = crear('div', 'detalle mono', `${f.dia} · ${f.utc}`);
    const izq = crear('div', 'reloj-zona-texto');
    izq.append(nombre, detalle);
    fila.append(izq, crear('div', 'hora mono', f.hora));
    return fila;
  }));
}

function pintar(w, cuerpo) {
  const cont = crear('div', 'reloj-mundial');
  cont.dataset.zonas = JSON.stringify(zonasValidas(w.config.zonas));
  pintarFilas(cont, zonasValidas(w.config.zonas));
  cuerpo.append(cont);
}

// Los relojes de la página se actualizan solos cada 10 s y al cambiar el reloj de 12/24 h.
function actualizarTodos() {
  for (const cont of document.querySelectorAll('.reloj-mundial')) pintarFilas(cont, JSON.parse(cont.dataset.zonas));
}
setInterval(actualizarTodos, 10000);
document.addEventListener('novatab:apariencia', actualizarTodos);

function configurador(actual) {
  return (cuerpo, ctx) => {
    const elegidas = new Set(zonasValidas(actual.zonas));
    const lista = crear('div', 'lista-zonas');
    for (const z of ZONAS) {
      const [label, input] = campo(z.nombre, { type: 'checkbox', value: z.id, checked: elegidas.has(z.id) });
      label.className = 'opcion opcion-dialogo';
      label.prepend(input);
      input.addEventListener('change', () => {
        if (lista.querySelectorAll('input:checked').length > MAX_ZONAS) {
          input.checked = false;
          avisar(`Como mucho ${MAX_ZONAS} ciudades`);
        }
      });
      lista.append(label);
    }
    cuerpo.append(lista);
    ctx.validar = () => {
      if (lista.querySelector('input:checked')) return true;
      avisar('Elige al menos una ciudad');
      return false;
    };
    return () => ({ zonas: [...lista.querySelectorAll('input:checked')].map(i => i.value) });
  };
}

registrar('relojMundial', {
  def: { nombre: 'Reloj mundial', descripcion: 'La hora en hasta 6 ciudades', w: 4, h: 5, configurable: true },
  pintar,
  configurador,
});
