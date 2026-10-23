# NovaTab

Extensión de Chrome que sustituye la pestaña nueva por una página de inicio para tus servicios de casa o del trabajo (servidores, NAS, router…) y tus webs favoritas.

- Buscador de Google (con Modo IA, imágenes, vídeos, noticias y Maps) que también busca en tus enlaces.
- Grupos de enlaces que colocas y redimensionas en una cuadrícula, con logos de [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) o iconos de [Lucide](https://lucide.dev).
- Widgets: tiempo, notas, Google Calendar, Spotify y tus webs más visitadas.
- Temas, modo sobrio, modo reunión (oculta los grupos privados) y paneles plegables.
- Todo se guarda en tu cuenta de Chrome (`chrome.storage.sync`, cada grupo en su propia clave): no hay servidor propio. Si otra pestaña cambia algo mientras editas, se aplica al terminar sin pisar lo tuyo.

## Instalar

1. Descarga o clona este repositorio.
2. En Chrome, abre `chrome://extensions` y activa **Modo de desarrollador**.
3. Pulsa **Cargar extensión sin empaquetar** y elige la carpeta del repositorio.
4. Abre una pestaña nueva.

Para repartirla como `.zip` (con un identificador fijo y sin archivos de desarrollo):

```powershell
powershell -ExecutionPolicy Bypass -File empaquetar\empaquetar.ps1
```

El paquete queda en `dist/` e incluye un `LEEME.txt` con los pasos de instalación.

## Pruebas

Necesitan Node 22 o superior y Chrome instalado; no hay que instalar nada más.

```bash
node pruebas/ejecutar.mjs              # todas
node pruebas/ejecutar.mjs rejilla      # solo las que contienen «rejilla» en el nombre
node pruebas/ejecutar.mjs --sin-red    # sin las que necesitan Internet
```

Cada prueba abre `newtab.html` en Chrome sin ventana con sus propios datos (`pruebas/lib/datos-prueba.mjs`).

## Estructura

| Archivo | Qué hace |
|---|---|
| `manifest.json` | Extensión MV3: sustituye la pestaña nueva |
| `newtab.html`, `style.css` | La página y su aspecto (temas, cuadrícula, diálogos) |
| `js/main.js` | Arranque: carga los datos y escucha los cambios de otras pestañas |
| `js/datos.js`, `js/almacen.js` | Modelo de datos y todo el acceso a `chrome.storage` |
| `js/rejilla.js`, `js/pintado.js` | Cuadrícula (posiciones y colisiones) y pintado de grupos |
| `js/edicion.js` | Modo edición: diálogos, importar/exportar, restablecer, arrastrar y deshacer/rehacer (Ctrl+Z, Ctrl+Y) |
| `js/fondos.js`, `js/imagen-fondo.js` | Diez dibujos de fondo y la imagen de fondo propia (reducida y guardada solo en el equipo) |
| `js/importar.js` | Importar marcadores de Chrome como grupos (permiso `bookmarks` opcional, pedido al pulsar) |
| `js/historial.js`, `js/copias.js` | Pila de deshacer (20 pasos) y copia automática diaria (7 últimas, en Opciones) |
| `js/buscador.js`, `js/apariencia.js` | Buscador y editor de apariencia: diez temas, acento, fondo, densidad, esquinas, reloj y paneles |
| `js/widgets.js`, `js/iconos.js` | Widgets y selector de iconos (Dashboard Icons y Lucide vía jsDelivr) |
| `datos-defecto.js` | Datos de ejemplo de la primera vez |
| `empaquetar/` | Script del `.zip` para repartir y su `LEEME.txt` |
| `mockups/` | Las tres propuestas de diseño iniciales |
| `pruebas/` | Pruebas automáticas en Chrome sin ventana |
| `docs/` | Hoja de ruta de mejoras |

## Créditos

- Fuentes: [Public Sans](https://github.com/uswds/public-sans) y [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), bajo SIL Open Font License (ver `fuentes/`).
- Logos: [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0). Iconos: [Lucide](https://lucide.dev) (ISC).
- Tiempo: [Open-Meteo](https://open-meteo.com).
- Skill de diseño incluida en `.claude/skills/design-taste-frontend`: [taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT).

## Licencia

[MIT](LICENSE).
