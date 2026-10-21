// Datos iniciales: una red doméstica de ejemplo. Solo se usan la primera vez o al pulsar "Restaurar";
// después todo se edita desde la propia página (icono del lápiz).
// zona: 'local' (servicios de tu red) u 'online' (sitios de Internet).
// pos: sitio del grupo local en la rejilla de 12 columnas (x = columna, y = fila, w = ancho).
const DATOS_DEFECTO = {
  version: 3,
  titulos: { local: 'Mi red' },
  grupos: [
    {
      nombre: 'Servidor',
      zona: 'local',
      color: '#6aa7e0',
      pos: { x: 1, y: 1, w: 6 },
      enlaces: [
        { nombre: 'Proxmox', url: 'https://192.168.1.10:8006/', icono: { set: 'apps', nombre: 'proxmox', formato: 'svg' } },
        { nombre: 'Portainer', url: 'http://192.168.1.10:9000/', icono: { set: 'apps', nombre: 'portainer', formato: 'svg' } },
        { nombre: 'Jellyfin', url: 'http://192.168.1.10:8096/', icono: { set: 'apps', nombre: 'jellyfin', formato: 'svg' } },
        { nombre: 'Home Assistant', url: 'http://192.168.1.20:8123/', icono: { set: 'apps', nombre: 'home-assistant', formato: 'svg' } },
      ],
    },
    {
      nombre: 'Red y almacenamiento',
      zona: 'local',
      color: '#63b6c7',
      pos: { x: 7, y: 1, w: 6 },
      enlaces: [
        { nombre: 'Router', url: 'http://192.168.1.1/', icono: { set: 'lucide', nombre: 'router' } },
        { nombre: 'NAS', url: 'https://192.168.1.30:5001/', icono: { set: 'lucide', nombre: 'hard-drive' } },
        { nombre: 'Pi-hole', url: 'http://192.168.1.2/admin/', icono: { set: 'apps', nombre: 'pi-hole', formato: 'svg' } },
      ],
    },
    {
      nombre: 'Online',
      zona: 'online',
      color: '#c9c9cc',
      enlaces: [
        { nombre: 'YouTube', url: 'https://www.youtube.com/' },
        { nombre: 'Gmail', url: 'https://mail.google.com/' },
        { nombre: 'WhatsApp', url: 'https://web.whatsapp.com/' },
        { nombre: 'Discord', url: 'https://discord.com/app' },
      ],
    },
  ],
  widgets: [
    { tipo: 'masUsadas', panel: 'izq', pos: { x: 1, y: 1, w: 6, h: 6 }, config: { cantidad: 5 } },
  ],
};
