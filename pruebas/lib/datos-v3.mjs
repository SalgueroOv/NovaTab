// Datos en formato v3 (todo en la clave «datos», con los enlaces dentro de cada grupo), parecidos a los de
// un usuario real: grupos plegados y privados, de las dos zonas, y widgets con notas y configuración.
export const DATOS_V3 = {
  version: 3,
  titulos: { local: 'Mi laboratorio' },
  grupos: [
    {
      id: 'g1', nombre: 'Servidores', zona: 'local', color: '#6aa7e0', pos: { x: 1, y: 1, w: 6 },
      enlaces: [
        { id: 'e1', nombre: 'Proxmox', url: 'https://192.168.1.10:8006/', icono: { set: 'apps', nombre: 'proxmox', formato: 'svg' } },
        { id: 'e2', nombre: 'Portainer', url: 'http://192.168.1.10:9000/' },
        { id: 'e3', nombre: 'Grafana', url: 'http://192.168.1.10:3000/', icono: { set: 'lucide', nombre: 'chart-line' } },
      ],
    },
    {
      id: 'g2', nombre: 'Bases de datos', zona: 'local', color: '#9cc3e6', pos: { x: 7, y: 1, w: 6 }, plegado: true,
      enlaces: [
        { id: 'e4', nombre: 'Neo4j', url: 'http://192.168.1.11:7474/browser/' },
        { id: 'e5', nombre: 'Postgres admin', url: 'http://192.168.1.11:5050/' },
      ],
    },
    {
      id: 'g3', nombre: 'Privado local', zona: 'local', color: '#d685b0', pos: { x: 1, y: 6, w: 6 }, privado: true,
      enlaces: [{ id: 'e6', nombre: 'Copias', url: 'http://192.168.1.12/' }],
    },
    {
      id: 'g4', nombre: 'Trabajo', zona: 'online', color: '#c9c9cc',
      enlaces: [
        { id: 'e7', nombre: 'Correo', url: 'https://mail.example.com/' },
        { id: 'e8', nombre: 'Documentos', url: 'https://docs.example.com/' },
      ],
    },
    {
      id: 'g5', nombre: 'Ocio', zona: 'online', color: '#c9c9cc', privado: true,
      enlaces: [{ id: 'e9', nombre: 'Videos', url: 'https://videos.example.com/' }],
    },
  ],
  widgets: [
    { id: 'w-n1', tipo: 'notas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 4 }, config: {} },
    { id: 'w-n2', tipo: 'notas', panel: 'der', pos: { x: 7, y: 6, w: 6, h: 4 }, config: {} },
    { id: 'w-t', tipo: 'tiempo', panel: 'izq', pos: { x: 1, y: 6, w: 6, h: 6 }, config: { nombre: 'Ciudad', lat: 40.4, lon: -3.7 } },
  ],
};

export const NOTAS_V3 = { 'chrome.sync/nota:w-n1': 'nota uno', 'chrome.sync/nota:w-n2': 'nota dos' };

// Resumen comparable de unos datos (lo que no debe cambiar al migrar).
export const resumen = d => ({
  titulo: d.titulos?.local, // la normalización añade el título «Internet» por defecto: no cuenta
  grupos: d.grupos.map(g => [g.id, g.nombre, g.zona, g.pos ?? null, !!g.plegado, !!g.privado, g.enlaces.map(e => [e.id, e.nombre, e.url, e.icono ?? null])]),
  widgets: d.widgets.map(w => [w.id, w.tipo, w.panel, w.pos, w.config]),
});
