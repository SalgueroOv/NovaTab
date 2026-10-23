# Fase 9: pulido y accesibilidad — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases anteriores). Los pasos usan casillas (`- [x]`).

**Objetivo:** que toda la interfaz se pueda usar con el teclado y con lector de pantalla, con contraste suficiente en los diez temas y sin desbordes en pantallas estrechas, y que eso quede comprobado por pruebas automáticas.

**Arquitectura:** las herramientas de auditoría (axe-core y Lighthouse) viven en `herramientas/`, con su propio `package.json` y su `node_modules` ignorado por git; **no** forman parte del paquete de la extensión (el script de empaquetado solo copia los archivos de la extensión). La prueba `pruebas/accesibilidad.prueba.mjs` inyecta `axe.min.js` en la página por CDP y falla con cualquier violación de impacto «serious» o «critical»; se salta con un aviso si las herramientas no están instaladas. Mover y redimensionar bloques con el teclado se añade a `js/edicion.js` reutilizando `resolver()`, `guardarYPintar()` y el historial de deshacer.

**Tecnología:** axe-core 4.x y Lighthouse 13.x como dependencias de desarrollo (`npm install` dentro de `herramientas/`), Chrome sin ventana por CDP (el arnés de pruebas de siempre), Node 22+.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 9) y las decisiones del usuario del 2026-10-23, que delegó el resto en el criterio del implementador mientras estaba fuera:
- **Incluye:** auditoría con axe-core y Lighthouse, mover y redimensionar bloques con el teclado, y una pasada de diseño.
- **No incluye:** la interfaz en inglés (`_locales/`).
- **Herramientas:** se pueden instalar con npm, solo para desarrollo.

## Restricciones globales

- La extensión sigue sin compilación ni dependencias de npm: `herramientas/` y su `node_modules` no se empaquetan ni se cargan desde la página.
- `node pruebas/ejecutar.mjs` sigue funcionando recién clonado: sin `herramientas/node_modules`, la prueba de accesibilidad se salta (`saltada: falta npm install en herramientas/`) y las demás no cambian. (La suite entera tarda ya unos 10 minutos: se ejecutan pruebas sueltas durante el trabajo y la completa al cerrar cada tarea grande.)
- Ningún arreglo cambia los datos guardados ni las claves de almacenamiento.
- Objetivo medible: axe-core sin violaciones `serious` ni `critical` (contraste, nombres accesibles, roles y etiquetas) en cada tema (los diez), en claro y oscuro, en las vistas de la tabla de estados de abajo; Lighthouse de accesibilidad con 95 o más sobre `newtab.html` servida por HTTP local.
- Estados que se auditan: página principal con los datos de prueba; con el modo edición activo; con la paleta de comandos abierta; con el panel de personalizar abierto en cada una de sus cuatro pestañas; con el diálogo de editar enlace, el de grupo, el de widget, el de marcadores y el de restablecer abiertos; con un grupo en cada vista (lista, iconos, compacta); con cada widget nuevo (reloj mundial, cuenta atrás, tareas, RSS con feed simulado, servicios con permiso simulado); y el selector de perfiles abierto si la fase 8 está unida.
- Teclado: todo lo que se puede hacer con el ratón en modo edición se puede hacer con el teclado; ningún elemento interactivo es inalcanzable con Tab; ningún elemento interactivo pierde el indicador de foco.
- Pantallas: sin desplazamiento horizontal de la página a 400, 800 y 1440 px de ancho.
- Respeta `prefers-reduced-motion`: sin transiciones ni animaciones de más de 0,01 s con esa preferencia.
- Versión final: 5.1.0.

## Revisión: lo que más probablemente falle

1. **Contraste en los diez temas:** textos secundarios (`--texto-2`), cifras de atajos, etiquetas de zona, fechas de RSS, LEDs y bordes sobre fondos claros u oscuros de cada tema; el acento libre del usuario no se puede controlar, así que lo que se comprueba es el texto sobre acento (`--sobre-acento`) (tarea 2).
2. **Nombres accesibles:** botones de solo icono (editar, paneles, reunión, tema, borrar, plegar, asas), campos sin etiqueta (buscador, cuadrículas), iconos decorativos que un lector anuncia dos veces (tareas 1 y 2).
3. **Mover con el teclado en un grupo que choca con otro, en el borde de la rejilla, plegado o en el otro panel:** nada se solapa, nada se sale, se puede deshacer, y se anuncia lo que ha pasado (tarea 3).
4. **Teclas que ya hacen otra cosa:** las flechas en un campo de texto, en un `select`, en el separador del panel, en la paleta o en un diálogo no mueven bloques (tarea 3).
5. **Foco que se pierde al repintar:** tras mover o redimensionar un bloque con el teclado, el foco sigue en ese mismo bloque aunque la página se repinte (tarea 3).
6. **Ventanas estrechas (400 px) con el panel de personalizar, la paleta o un diálogo abiertos:** nada se sale de la pantalla ni se corta (tarea 4).
7. **Zoom de texto al 200 %:** no se solapan textos ni se pierden controles (tarea 4).
8. **`prefers-reduced-motion`:** los LEDs que parpadean, las transiciones y el desplazamiento suave se detienen (tarea 4).

---

### Task 1 · Tarea 1: herramientas de auditoría y prueba de axe

**Archivos:** crear `herramientas/package.json`, `herramientas/.gitignore` (con `node_modules/`), `herramientas/LEEME.md` (cómo instalar y ejecutar), `pruebas/accesibilidad.prueba.mjs`, `pruebas/lib/axe.mjs` (cargar y ejecutar axe por CDP); modificar `.gitignore` si hace falta, `README.md`.

**Interfaces:**
- `pruebas/lib/axe.mjs` exporta `axeDisponible(): boolean` (existe `herramientas/node_modules/axe-core/axe.min.js`) y `auditar(pg, { contexto = 'document', temas = false } = {}): Promise<{ violaciones: { id, impacto, ayuda, nodos: string[] }[] }>`: inyecta `axe.min.js` (por `Runtime.evaluate` del texto del archivo), ejecuta `axe.run` con las reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `best-practice`, y devuelve solo las violaciones de impacto `serious` o `critical`, con como mucho 5 selectores de nodo por violación.
- La prueba recorre los estados de «Restricciones globales» y, para el estado principal y el panel de personalizar abierto, los diez temas (`document.documentElement.dataset.tema`) y su modo, y lanza un `Error` con el listado legible (`regla · impacto · selector`) si hay alguna.

- [x] **Paso 1:** `cd herramientas && npm install --save-dev axe-core lighthouse` (se fijan las versiones exactas en `package.json`); comprobar que `node_modules/` no aparece en `git status`.
- [x] **Paso 2:** escribir `accesibilidad.prueba.mjs` con una tabla de estados y ejecutarla → **falla con las violaciones reales** (las que se arreglan en la tarea 2). Guardar el listado completo en el commit (mensaje) o en `herramientas/LEEME.md` como punto de partida.
- [x] **Paso 3:** comprobar que sin `herramientas/node_modules` la prueba se salta con su aviso y la suite sigue en verde (se renombra la carpeta un momento).
- [x] **Paso 4:** `herramientas/lighthouse.mjs` (script aparte, no es una prueba de la suite): sirve el repositorio por HTTP, lanza Lighthouse (`onlyCategories: ['accessibility', 'best-practices']`, Chrome sin ventana) sobre `newtab.html` y escribe `herramientas/informe-lighthouse.json` (ignorado por git) y un resumen por pantalla; sale con código 1 si accesibilidad < 95.
- [x] **Paso 5:** commit «Herramientas de auditoría: axe-core y Lighthouse» (la prueba de accesibilidad puede quedar fallando solo si va marcada como pendiente hasta la tarea 2; si se prefiere, se commitea junto a la tarea 2).

### Task 2 · Tarea 2: arreglar lo que señala la auditoría

**Archivos:** los que haga falta (`newtab.html`, `style.css`, `js/pintado.js`, `js/widgets/*.js`, `js/apariencia.js`, …).

**Interfaces:** ninguna nueva; los arreglos se limitan a atributos (`aria-label`, `role`, `aria-hidden`, `aria-live`, `for`/`id`), a colores (variables `--texto-2`, `--borde`, etc. por tema, sin cambiar el aspecto de forma apreciable: se ajusta el valor mínimo imprescindible hasta llegar a 4,5:1 para texto normal y 3:1 para texto grande y componentes) y a la estructura (`h1`/`h2`, `main`, regiones con nombre).

- [x] **Paso 1:** con la lista de violaciones de la tarea 1, agrupar por causa (por ejemplo «texto secundario en tema claro», «botón de icono sin nombre») y arreglar cada causa en un solo sitio.
- [x] **Paso 2:** ejecutar `accesibilidad` hasta que quede en verde en los diez temas y todos los estados; si una regla no se puede cumplir sin cambiar la identidad visual (por ejemplo un fondo decorativo), se documenta en `herramientas/LEEME.md` con el motivo y se excluye solo ese selector en `axe.mjs` (con un comentario).
- [x] **Paso 3:** ejecutar `node herramientas/lighthouse.mjs` → accesibilidad 95 o más; anotar la puntuación en `herramientas/LEEME.md`.
- [x] **Paso 4:** pruebas sueltas de las zonas tocadas (`paleta`, `apariencia`, `vistas`, `servicios`, `tareas`…) → `✔`; commit «Accesibilidad: nombres, contraste y estructura».

### Task 3 · Tarea 3: mover y redimensionar bloques con el teclado

**Archivos:** modificar `js/edicion.js`, `js/pintado.js`, `js/widgets.js` (la cabecera de los widgets), `newtab.html` (una región `aria-live` `#anuncios`), `style.css`; crear `pruebas/teclado-bloques.prueba.mjs`.

**Interfaces:**
- En modo edición, la cabecera de cada grupo y de cada widget (`.grupo-cab`, `.widget-cab`) es alcanzable con Tab (`tabindex="0"`, `role="group"` con `aria-label` «Mover <nombre>: flechas para mover, Mayús y flechas para cambiar el tamaño») y responde a: ← → ↑ ↓ (mover una celda), Mayús+← → (ancho −1/+1), Mayús+↑ ↓ (alto −1/+1, solo widgets) y Alt+← → (pasar un widget al otro panel). No actúa si el foco está en un campo de texto, un `select` o un botón de dentro de la cabecera.
- Cada acción: respeta los límites de `ANCHO_MINIMO`, `COLUMNAS`, `ALTO_MINIMO` y `ALTO_MAXIMO`; llama a `resolver(bloque)` (el bloque movido manda y los vecinos se apartan); guarda con `guardarYPintar(bloque)` (un paso de deshacer por pulsación); devuelve el foco a la cabecera del mismo bloque tras repintar; y escribe en `#anuncios` (`aria-live="polite"`) «<nombre>: columna 3, fila 2, ancho 6» (o «…alto 8» en widgets). Si la acción no se puede hacer (borde, mínimo), anuncia «<nombre>: no se puede mover más a la izquierda» y no guarda.

- [x] **Paso 1:** escribir `teclado-bloques.prueba.mjs` y ejecutarla → falla:
  - (a) Tab llega a la cabecera de un grupo en modo edición y no fuera de él; `→` mueve el grupo una columna a la derecha en `datos` y la cabecera conserva el foco; `↓` baja una fila; `←` y `↑` desde la esquina (1, 1) no hacen nada y anuncian que no se puede.
  - (b) Mayús+→ ensancha un grupo hasta `COLUMNAS` sin pasarse; Mayús+← lo estrecha hasta `ANCHO_MINIMO` sin bajar de ahí; en un widget, Mayús+↓ aumenta el alto hasta `ALTO_MAXIMO`.
  - (c) mover un grupo sobre otro aparta al otro sin solapar (se comprueba con la geometría de `datos`); un grupo plegado se mueve igual.
  - (d) Alt+→ pasa un widget del panel izquierdo al derecho (y Alt+← al revés), con su posición válida en el panel nuevo.
  - (e) cada acción se deshace con Ctrl+Z y se rehace con Ctrl+Y; tras mover cinco veces, cinco Ctrl+Z devuelven la posición original.
  - (f) con el foco en un campo (nombre de la nota, buscador, campo de añadir tarea) o en el separador de paneles, las flechas no mueven ningún bloque.
  - (g) `#anuncios` contiene el texto esperado tras mover y tras un intento imposible; fuera del modo edición, las cabeceras no son alcanzables con Tab.
  - (h) el modo edición con ratón sigue funcionando (la prueba de rejilla de siempre en verde).
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** pruebas `rejilla`, `vistas`, `historial`, `teclado-bloques` y `accesibilidad` → `✔`; commit «Mover y redimensionar bloques con el teclado».

### Task 4 · Tarea 4: pasada de diseño y pantallas estrechas

**Archivos:** `style.css`, `newtab.html`, `js/*.js` según lo que se encuentre; crear `pruebas/pulido.prueba.mjs`.

**Interfaces:** la prueba mide cosas concretas; la pasada de diseño se apoya en capturas del arnés (`pg.p.screenshot`) en los diez temas, a 1440 y a 400 px de ancho, y en la skill `design-taste-frontend` para criticar lo que se vea (espaciado, jerarquía, textos cortados, controles diminutos); cada hallazgo se arregla en CSS con el cambio mínimo.

- [x] **Paso 1:** escribir `pulido.prueba.mjs` y ejecutarla → falla donde haya problemas:
  - (a) la página no tiene desplazamiento horizontal (`document.documentElement.scrollWidth <= innerWidth`) a 400, 800 y 1440 px, con los datos de prueba, con el panel de personalizar abierto y con la paleta abierta.
  - (b) los diálogos, el menú de perfiles (si existe) y el panel de personalizar caben dentro de la ventana de 400×700 (sus rectángulos están dentro de `innerWidth` e `innerHeight`, desplazándose por dentro si hace falta).
  - (c) con `Emulation.setEmulatedMedia({ features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })`, ningún elemento tiene `animation-duration` ni `transition-duration` mayores de 0,01 s, y `scroll-behavior` es `auto`.
  - (d) todos los elementos interactivos visibles (`a[href]`, `button`, `input`, `select`, `textarea`, `[role="button"]`, `[tabindex="0"]`) miden al menos 24×24 px (o están excluidos con motivo si son parte de un campo de texto en línea), y tienen un indicador de foco visible: con `:focus-visible` forzado (`DOM.focus` por CDP), `outline-style` no es `none` o hay `box-shadow`.
  - (e) con el texto al 200 % (`document.documentElement.style.fontSize = '200%'`), el reloj, el buscador, un grupo y una tarjeta de widget no se solapan entre sí (sus rectángulos no se intersecan) ni se salen del contenedor.
- [x] **Paso 2:** arreglar lo que falle y hacer la pasada de diseño sobre las capturas; anotar en `herramientas/LEEME.md` los cambios visuales hechos.
- [x] **Paso 3:** `accesibilidad`, `pulido` y las pruebas de las zonas tocadas → `✔`; commit «Pulido: pantallas estrechas, movimiento reducido y controles».

### Task 5 · Tarea 5: cierre de la fase

- [x] **Paso 1:** `version` 5.1.0 en `manifest.json`; `README.md` (carpeta `herramientas/`, cómo ejecutar la auditoría y las pruebas, y los atajos de teclado para mover bloques); `empaquetar/LEEME.txt` con el teclado para mover bloques y la nota de accesibilidad.
- [x] **Paso 2:** `node pruebas/ejecutar.mjs` completo → todas `✔` (en segundo plano); `empaquetar\empaquetar.ps1` → `dist/novatab-5.1.0.zip` sin `herramientas/` ni `node_modules/` dentro y con toda la carpeta `js/`.
- [x] **Paso 3:** marcar la fase 9 en la hoja de ruta y commit «Fase 9 terminada: versión 5.1.0».
