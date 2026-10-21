// Datos propios de las pruebas: no dependen de datos-defecto.js, que puede cambiar.
// Alfa ocupa las filas 1-5 (4 enlaces + título) y Gamma empieza en la 7, debajo de Alfa.
export const DATOS_PRUEBA = {
  version: 3,
  titulos: { local: 'Pruebas' },
  grupos: [
    {
      id: 'g-alfa', nombre: 'Alfa', zona: 'local', color: '#6aa7e0', pos: { x: 1, y: 1, w: 6 },
      enlaces: [
        { id: 'e-a1', nombre: 'Proxmox Alfa', url: 'http://192.168.1.11/' },
        { id: 'e-a2', nombre: 'Portainer Alfa', url: 'http://192.168.1.12:9000/' },
        { id: 'e-a3', nombre: 'Jellyfin Alfa', url: 'http://192.168.1.13:8096/' },
        { id: 'e-a4', nombre: 'Grafana Alfa', url: 'http://192.168.1.14:3000/' },
      ],
    },
    {
      id: 'g-beta', nombre: 'Beta', zona: 'local', color: '#63b6c7', pos: { x: 7, y: 1, w: 6 },
      enlaces: [
        { id: 'e-b1', nombre: 'Router Beta', url: 'http://192.168.1.1/' },
        { id: 'e-b2', nombre: 'NAS Beta', url: 'https://192.168.1.30:5001/' },
        { id: 'e-b3', nombre: 'Pihole Beta', url: 'http://192.168.1.2/admin/' },
      ],
    },
    {
      id: 'g-gamma', nombre: 'Gamma', zona: 'local', color: '#d685b0', pos: { x: 1, y: 7, w: 6 }, privado: true,
      enlaces: [
        { id: 'e-g1', nombre: 'Secreto Uno', url: 'http://192.168.1.40/' },
        { id: 'e-g2', nombre: 'Secreto Dos', url: 'http://192.168.1.41/' },
      ],
    },
    {
      id: 'g-trabajo', nombre: 'Trabajo', zona: 'online', color: '#c9c9cc',
      enlaces: [
        { id: 'e-t1', nombre: 'Correo', url: 'https://mail.example.com/' },
        { id: 'e-t2', nombre: 'Documentos', url: 'https://docs.example.com/' },
      ],
    },
    {
      id: 'g-ocio', nombre: 'Ocio', zona: 'online', color: '#c9c9cc', privado: true,
      enlaces: [
        { id: 'e-o1', nombre: 'Videos', url: 'https://videos.example.com/' },
        { id: 'e-o2', nombre: 'Juegos', url: 'https://juegos.example.com/' },
      ],
    },
  ],
  widgets: [],
};

// Copia con widgets añadidos, para no modificar DATOS_PRUEBA entre pruebas.
export const conWidgets = widgets => ({ ...structuredClone(DATOS_PRUEBA), widgets });
