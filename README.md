# NovaTab

Extensión de Chrome que sustituye la pestaña nueva por una página de inicio para tus servicios de casa o del trabajo (servidores, NAS, router…) y tus webs favoritas.

- Buscador de Google (con Modo IA, imágenes, vídeos, noticias y Maps) que también busca en tus enlaces.
- Grupos de enlaces que colocas y redimensionas en una cuadrícula, con logos de [Dashboard Icons](https://github.com/homarr-labs/dashboard-icons) o iconos de [Lucide](https://lucide.dev).
- Widgets: tiempo, notas, Google Calendar, Spotify y tus webs más visitadas.
- Fondos animados: el relieve de cada perfil dibujado de nueve formas (curvas, cotas, rayas, galaxia…), que se mueve despacio y se ilumina bajo el ratón, o tu imagen.
- Temas: once incluidos y los tuyos propios (fondo y acento), comunes a todos los perfiles; menús y paneles se tiñen con el tema.
- Un solo mando, la isla, encima del panel derecho: el perfil (con su terreno), «Buscar o mandar» (Ctrl+K), reunión, editar y personalizar; se convierte en el menú de perfiles o en la barra de edición.
- Paleta Ctrl+K sobre la isla: búsqueda difusa por grupos (perfiles, vista, servicios, Internet, aspecto, datos) que también encuentra los enlaces de tus otros perfiles.
- Personalizar es un estudio a la derecha (Aspecto, Disposición, Buscador y Datos) que dice qué ajustes son del perfil y cuáles comunes.
- Tres estilos de página por perfil: Mapa (filas con la dirección debajo), Baldosas (fichas) y Compacto. Los grupos en vista «Automática» lo siguen.
- Opcional por grupo: «Comprobar si responden» pone un punto de estado y los milisegundos en cada enlace, y un resumen en la cabecera.
- Carpeta de copias: elige una carpeta (por ejemplo Documentos\NovaTab) y Exportar y la copia diaria sobrescriben ahí un solo archivo por perfil.
- Modo sobrio, modo reunión (oculta los grupos privados) y paneles plegables.
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
node pruebas/ejecutar.mjs --hilos=1    # una a una (por defecto van 4 a la vez, cada una en su Chrome)
```

Cada prueba abre `newtab.html` en Chrome sin ventana con sus propios datos (`pruebas/lib/datos-prueba.mjs`).

### Auditoría de accesibilidad

`herramientas/` (fuera del paquete de la extensión) lleva axe-core y Lighthouse como dependencias de desarrollo:

```bash
cd herramientas && npm install     # una vez
node ../pruebas/ejecutar.mjs accesibilidad   # axe-core en los once temas y cada estado (se salta si falta npm install)
node lighthouse.mjs                # informe de Lighthouse
```

Detalles y resultados en `herramientas/LEEME.md`.

## Mover bloques con el teclado

En modo edición, con el foco en la cabecera de un grupo o widget (Tab): flechas = mover una celda; Mayús + flechas = ancho (y alto en widgets); Alt + ←/→ = pasar un widget al otro panel. Cada pulsación se anuncia y se deshace con Ctrl+Z.

## Estructura

| Archivo | Qué hace |
|---|---|
| `manifest.json` | Extensión MV3: sustituye la pestaña nueva |
| `newtab.html`, `style.css` | La página y su aspecto (temas, cuadrícula, diálogos) |
| `js/main.js` | Arranque: carga los datos y escucha los cambios de otras pestañas |
| `js/datos.js`, `js/almacen.js` | Modelo de datos y todo el acceso a `chrome.storage` |
| `js/rejilla.js`, `js/pintado.js` | Cuadrícula (posiciones, colisiones y alto según la vista: lista, iconos o compacta) y pintado de grupos |
| `js/edicion.js` | Modo edición: diálogos, importar/exportar, restablecer, arrastrar y deshacer/rehacer (Ctrl+Z, Ctrl+Y) |
| `js/terreno.js`, `js/fondos.js`, `js/imagen-fondo.js` | El relieve de cada perfil, sus nueve dibujos animados en canvas (con luz bajo el ratón) y la imagen de fondo propia (reducida y guardada solo en el equipo) |
| `js/motores.js`, `js/ajustes-buscador.js` | Motores de búsqueda y atajos `!clave`, y su pestaña «Buscador» (con sugerencias de Google opcionales) |
| `js/perfiles.js`, `js/perfiles-ops.js`, `js/selector-perfiles.js` | Perfiles: registro y migración, crear/duplicar/borrar/cambiar, y el selector de la cabecera (con el ojo del modo reunión, que pasa al perfil Demo) |
| `js/isla.js` | La isla: sus capas (barra, menú de perfiles y barra de edición) y su alto |
| `js/widgets/*.js` | Los widgets nuevos, uno por archivo, registrados con `registrar()` de `js/widgets.js`: reloj mundial, cuenta atrás, tareas (sus datos en `tareas-datos.js`), RSS y estado de servicios |
| `js/separador.js` | Franja arrastrable entre los paneles (el izquierdo del 25 al 50 %, doble clic para restaurar) |
| `js/comandos.js`, `js/atajos.js` | Paleta de comandos (Ctrl+K) y Alt+1…Alt+9 para los nueve primeros enlaces locales, Alt+P y Alt+Mayús+P para cambiar de perfil |
| `js/importar.js` | Importar marcadores de Chrome como grupos (permiso `bookmarks` opcional, pedido al pulsar) |
| `js/historial.js`, `js/copias.js` | Pila de deshacer (20 pasos) y copia automática diaria (7 últimas, en Opciones) |
| `js/buscador.js`, `js/apariencia.js` | Buscador y editor de apariencia: tema, acento, fondo, densidad, esquinas, reloj y paneles |
| `js/temas.js`, `js/editor-tema.js` | Temas (fondo, tinta y acento; el resto de colores se deriva en `style.css`) y el editor de temas propios |
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
