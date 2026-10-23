// El árbol que devolvería chrome.bookmarks.getTree(): raíz '0' con barra, otros y móviles.
const enlace = (id, title, url) => ({ id, title, url });
const carpeta = (id, title, children) => ({ id, title, children });

export const ARBOL_PRUEBA = [carpeta('0', '', [
  carpeta('1', 'Barra de marcadores', [
    enlace('10', 'NAS', 'http://192.168.1.50:8080/'),
    carpeta('11', 'Casa', [
      enlace('110', 'Proxmox', 'http://192.168.1.10/'),
      enlace('111', 'Router', 'http://10.0.0.5/'),
      enlace('112', 'Dev', 'http://localhost:3000/'),
      carpeta('113', 'Domótica', [
        enlace('1130', 'Hub', 'http://192.168.1.60/'),
        enlace('1131', 'Nube', 'https://home.example.com/'),
      ]),
    ]),
  ]),
  carpeta('2', 'Otros marcadores', [
    carpeta('20', 'Trabajo', [
      enlace('200', 'Correo', 'https://mail.example.com/'),
      enlace('201', 'Docs', 'https://docs.example.com/'),
      enlace('202', 'Correo otra vez', 'https://mail.example.com/otra-ruta'),
      enlace('203', 'Malo', 'javascript:alert(1)'),
      enlace('204', 'Ajustes', 'chrome://settings'),
      enlace('205', '', 'https://sin-titulo.example.com/'),
    ]),
    carpeta('21', 'Vacía', []),
    carpeta('22', 'Solo malos', [enlace('220', 'Malo', 'javascript:void(0)')]),
  ]),
  carpeta('3', 'Marcadores móviles', []),
])];
