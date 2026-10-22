// Simulador de chrome.storage para las pruebas. Se inyecta antes de cargar la página, con
// window.__configChromeFalso = { cuotaPorClave, escriturasPorMinuto } definido justo antes.
// Guarda en localStorage («chrome.sync/clave», «chrome.local/clave») para sobrevivir a las recargas.
(() => {
  const config = window.__configChromeFalso || {};
  const CUOTA = config.cuotaPorClave ?? 8192;
  const RITMO = config.escriturasPorMinuto ?? 120;
  const oyentes = [];
  const recientes = { sync: [], local: [] };
  const cuenta = { sync: 0, local: 0 };

  const avisar = (cambios, area) => {
    if (Object.keys(cambios).length) setTimeout(() => oyentes.forEach(fn => fn(cambios, area)), 0);
  };

  const guardar = (nombre, obj) => {
    const prefijo = `chrome.${nombre}/`;
    const cambios = {};
    for (const [clave, valor] of Object.entries(obj)) {
      const antes = localStorage.getItem(prefijo + clave);
      localStorage.setItem(prefijo + clave, JSON.stringify(valor));
      cambios[clave] = { oldValue: antes == null ? undefined : JSON.parse(antes), newValue: valor };
    }
    return cambios;
  };

  function area(nombre, conLimites) {
    const prefijo = `chrome.${nombre}/`;
    const todo = () => Object.fromEntries(Object.keys(localStorage)
      .filter(k => k.startsWith(prefijo))
      .map(k => [k.slice(prefijo.length), JSON.parse(localStorage.getItem(k))]));
    return {
      async get(claves) {
        const valores = todo();
        if (claves == null) return valores;
        const lista = typeof claves === 'string' ? [claves] : Array.isArray(claves) ? claves : Object.keys(claves);
        return Object.fromEntries(lista.filter(k => k in valores).map(k => [k, valores[k]]));
      },
      async set(obj) {
        if (conLimites) {
          const ahora = Date.now();
          recientes[nombre] = recientes[nombre].filter(t => ahora - t < 60000);
          if (recientes[nombre].length >= RITMO) throw new Error('This request exceeds the MAX_WRITE_OPERATIONS_PER_MINUTE quota.');
          for (const [clave, valor] of Object.entries(obj)) {
            if (clave.length + JSON.stringify(valor).length > CUOTA) throw new Error('QUOTA_BYTES_PER_ITEM quota exceeded');
          }
          recientes[nombre].push(ahora);
        }
        cuenta[nombre]++;
        avisar(guardar(nombre, obj), nombre);
      },
      async remove(claves) {
        const cambios = {};
        for (const clave of typeof claves === 'string' ? [claves] : claves) {
          const antes = localStorage.getItem(prefijo + clave);
          if (antes == null) continue;
          localStorage.removeItem(prefijo + clave);
          cambios[clave] = { oldValue: JSON.parse(antes) };
        }
        avisar(cambios, nombre);
      },
    };
  }

  window.chrome = Object.assign(window.chrome || {}, {
    storage: {
      sync: area('sync', true),
      local: area('local', false),
      onChanged: { addListener: fn => oyentes.push(fn) },
    },
  });

  window.__chromeFalso = {
    // Lo que haría otra pestaña u otro equipo: guarda sin límites y avisa a esta página.
    remoto(nombre, clave, valor) {
      const prefijo = `chrome.${nombre}/`;
      if (valor === undefined) {
        const antes = localStorage.getItem(prefijo + clave);
        localStorage.removeItem(prefijo + clave);
        avisar({ [clave]: { oldValue: antes == null ? undefined : JSON.parse(antes) } }, nombre);
      } else {
        avisar(guardar(nombre, { [clave]: valor }), nombre);
      }
    },
    escrituras: nombre => cuenta[nombre],
    reiniciarRitmo() { recientes.sync = []; },
  };
})();
