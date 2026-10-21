# Mis servicios

Extensión de Chrome que sustituye la pestaña nueva por una página de inicio para tus servicios de casa o del trabajo (servidores, NAS, router…) y tus webs favoritas.

- Buscador de Google (con Modo IA, imágenes, vídeos, noticias y Maps) que también busca en tus enlaces.
- Grupos de enlaces que colocas y redimensionas en una cuadrícula, con logos de [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) o iconos de [Lucide](https://lucide.dev).
- Widgets: tiempo, notas, Google Calendar, Spotify y tus webs más visitadas.
- Temas, modo sobrio, modo reunión (oculta los grupos privados) y paneles plegables.
- Todo se guarda en tu cuenta de Chrome (`chrome.storage.sync`): no hay servidor propio.

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

## Estructura

| Archivo | Qué hace |
|---|---|
| `manifest.json` | Extensión MV3: sustituye la pestaña nueva |
| `newtab.html`, `style.css` | La página y su aspecto (temas, cuadrícula, diálogos) |
| `app.js` | Datos, almacenamiento, cuadrícula, edición, buscador y temas |
| `widgets.js` | Widgets: tiempo, notas, Calendar, Spotify y más usadas |
| `iconos.js` | Selector de iconos (Dashboard Icons y Lucide vía jsDelivr) |
| `datos-defecto.js` | Datos de ejemplo de la primera vez |
| `empaquetar/` | Script del `.zip` para repartir y su `LEEME.txt` |
| `mockups/` | Las tres propuestas de diseño iniciales |
| `docs/` | Hoja de ruta de mejoras |

## Créditos

- Fuentes: [Public Sans](https://github.com/uswds/public-sans) y [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), bajo SIL Open Font License (ver `fuentes/`).
- Logos: [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) (Apache-2.0). Iconos: [Lucide](https://lucide.dev) (ISC).
- Tiempo: [Open-Meteo](https://open-meteo.com).
- Skill de diseño incluida en `.claude/skills/design-taste-frontend`: [taste-skill](https://github.com/Leonxlnx/taste-skill) (MIT).

## Licencia

[MIT](LICENSE).
