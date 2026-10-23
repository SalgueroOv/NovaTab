# Fase 4: editor de apariencia — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases anteriores). Los pasos usan casillas (`- [ ]`).

**Objetivo:** que cada persona pueda dejar NovaTab a su gusto sin tocar código: color de acento libre, uno de diez dibujos de fondo (o liso, o una imagen propia), densidad, esquinas y reloj.

**Arquitectura:** los ajustes viven en `opciones.apariencia` (la clave `opciones` que ya se sincroniza). `js/apariencia.js` los normaliza y los aplica como variables CSS en `:root` y clases en `body`. Los dibujos de fondo salen de `js/fondos.js`, que exporta una función por dibujo. La imagen propia se guarda reducida en `storage.local` (clave `fondo-imagen`), nunca en sync. El panel de la paleta pasa a tener tres pestañas: Tema, Fondo y Diseño.

**Tecnología:** módulos ES nativos (sin compilación), SVG generado con un generador pseudoaleatorio con semilla fija (el dibujo no parpadea al repintar), `canvas` para reducir la imagen, Node 22+ para las pruebas.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 4) y las respuestas del usuario del 2026-10-23:
- **Acento:** se mantiene al cambiar de tema; un botón «Restaurar» vuelve al acento propio de cada tema.
- **Esquinas:** tres opciones fijas: recto, medio y redondo.
- **Imagen propia:** con un velo del color del tema cuya intensidad se ajusta.
- **Fondos:** «grafo» y «teselas» salen de `mockups/a-grafo.html` y `mockups/c-teselas.html`, y se diseñan otros 7 para llegar a **10 dibujos diferentes** (junto con «curvas»). El usuario dejó el diseño de esos 7 a criterio del implementador.

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado.
- Formato de `opciones.apariencia` (lo que ya haya en `opciones` no se toca):
  `{ acento: null | '#rrggbb', fondo: id, intensidad: 0-100, intensidadImagen: 0-100, densidad: 'comoda' | 'compacta', esquinas: 'recto' | 'medio' | 'redondo', hora24: boolean, segundos: boolean, fecha: boolean }`.
- Valores por defecto: `acento: null`, `fondo: 'curvas'`, `intensidad: 100`, `intensidadImagen: 40`, `densidad: 'comoda'`, `esquinas: 'medio'`, `hora24: true`, `segundos: false`, `fecha: true`. Con esos valores la página se ve exactamente igual que en la versión 4.2.0.
- Ids de fondo: `curvas`, `grafo`, `teselas`, `ondas`, `puntos`, `rayas`, `cuadricula`, `hexagonos`, `anillos`, `montanas`, `liso` e `imagen`.
- Cualquier valor no válido (acento que no sea `#rrggbb`, id de fondo desconocido, número fuera de rango) se sustituye por su valor por defecto al leer; nunca lanza.
- La imagen: máximo 1920 px de ancho, WebP, guardada en `storage.local` con la clave `fondo-imagen` como `data:` URL de como mucho 3 MB (se baja la calidad 0,8 → 0,6 → 0,4 hasta que quepa). Si es imposible, se avisa y no cambia nada.
- «Restablecer todo» no toca la apariencia (igual que hoy no toca el tema ni las opciones).
- Los dibujos usan los colores del tema (`--l` y `--l2`), así que sirven para los cuatro temas.
- Un `fondo: 'imagen'` sin imagen guardada en este equipo (por ejemplo en otro equipo con la misma cuenta) se muestra como `curvas` sin modificar el ajuste guardado.
- Versión final: 4.3.0.

## Revisión: lo que más probablemente falle

1. **Acento claro sobre texto claro:** un acento amarillo o blanco deja ilegibles los botones que llevan texto encima; el texto sobre el acento debe cambiar solo a oscuro o claro según la luminosidad (tarea 1).
2. **Opciones guardadas antes de esta fase, o con basura:** una `opciones` sin `apariencia`, con `apariencia: null` o con valores raros no rompe la página ni cambia su aspecto (tarea 1).
3. **Compacta y arrastre:** al cambiar la altura de las filas, mover y redimensionar bloques con el ratón sigue cayendo en la celda correcta y los bloques no se solapan (tarea 2).
4. **Reloj con segundos:** se actualiza cada segundo solo mientras está activo; sin segundos sigue cada 10 s (tarea 2).
5. **Cambiar el tamaño de la ventana:** el dibujo se redibuja entero sin mezclar capas ni acumular elementos (tarea 3).
6. **Imagen enorme, formato no válido o archivo que no es una imagen:** se reduce, o se rechaza con un aviso claro, sin dejar el fondo a medias (tarea 4).
7. **Imagen guardada y almacenamiento local lleno:** si falla el guardado, el fondo anterior sigue intacto y se avisa (tarea 4).
8. **Dos equipos con la misma cuenta:** el que no tiene la imagen no se queda en negro (tarea 4).

---

### Task 1 · Tarea 1: modelo de ajustes, pestañas y acento libre

**Archivos:** modificar `js/apariencia.js`, `newtab.html` (panel `#panel-tema` con tres pestañas Tema, Fondo y Diseño; en Tema, además de las muestras, un `<input type="color" id="acento-libre">` y un botón «Restaurar»), `style.css`; crear `pruebas/apariencia.prueba.mjs`.

**Interfaces:**
- `js/apariencia.js` exporta `APARIENCIA` (los valores por defecto), `normalizarApariencia(a: unknown) → Apariencia` (aplica las reglas de «Restricciones globales») y `ponerApariencia(a: Apariencia): void` (guarda el resultado en la variable de módulo `apariencia`, exportada, y aplica a `document.documentElement` y `document.body`). `ponerOpciones` llama a `ponerApariencia(opciones.apariencia)` y `OPCIONES` incluye `apariencia: APARIENCIA`.
- Cada cambio de un ajuste llama a `cambiarApariencia(parcial: Partial<Apariencia>): void`: hace `ponerOpciones({ ...opciones, apariencia: { ...opciones.apariencia, ...parcial } })` y `escribir(CLAVE_OPCIONES, opciones)`.
- Acento: con `acento` distinto de `null`, `:root` lleva la variable `--acento` con ese valor y `--sobre-acento` con `#1f1f1f` si la luminosidad relativa del color pasa de 0,5 y `#ffffff` si no. `style.css` usa `var(--sobre-acento, var(--bg))` como color del texto sobre fondos de acento (los botones primarios y `.icono-boton[aria-pressed="true"]`). «Restaurar» pone `acento: null` y quita las dos variables en línea.
- Las pestañas son botones con `role="tab"`, `aria-selected` y paneles `role="tabpanel"`; la pestaña abierta se recuerda solo mientras la página está abierta.

- [ ] **Paso 1:** escribir `apariencia.prueba.mjs` y ejecutarla → falla:
  - (a) `normalizarApariencia(undefined)`, `(null)`, `('x')` y `({ acento: 'rojo', fondo: 'nada', intensidad: 500, densidad: 'x', esquinas: 3, hora24: 'sí' })` devuelven los valores por defecto (los ajustes válidos se conservan, los inválidos vuelven a su valor por defecto uno a uno).
  - (b) con `guardados: { opciones: { sobrio: true } }` (sin `apariencia`) la página arranca sin errores, `getComputedStyle(document.documentElement).getPropertyValue('--acento')` es el del tema y el modo sobrio sigue activo.
  - (c) el panel tiene tres pestañas; pulsar «Fondo» muestra su panel y oculta el de Tema; Escape cierra el panel.
  - (d) poner el acento `#e0245e` con `acento-libre` (valor y evento `input`) → `--acento` es `#e0245e` en `:root`, `opciones.apariencia.acento` se guarda, cambiar de tema (`[data-tema="papel"]`) no lo cambia; «Restaurar» deja `--acento` con el del tema y `acento: null`.
  - (e) `--sobre-acento` es `#1f1f1f` con el acento `#ffeb3b` y `#ffffff` con `#1a237e`.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Editor de apariencia: ajustes, pestañas y acento libre».

### Task 2 · Tarea 2: diseño (densidad, esquinas y reloj)

**Archivos:** modificar `js/apariencia.js`, `newtab.html` (pestaña Diseño: dos botones de opción «Cómoda» y «Compacta»; tres «Recto», «Medio» y «Redondo»; casillas «Reloj de 24 horas», «Mostrar segundos» y «Mostrar la fecha»), `style.css`; ampliar `pruebas/apariencia.prueba.mjs`.

**Interfaces:**
- Densidad: `body` lleva la clase `compacta` con `densidad: 'compacta'`. `style.css` define `--alto-fila` (40 px cómoda, 32 px compacta) para `grid-auto-rows` de las rejillas, y en compacta los iconos de `.fila .icono` bajan de 30 a 24 px y el texto de 14 a 13 px. Cualquier cálculo de la rejilla en JavaScript (`medidas()` en `js/edicion.js`) debe leer la altura real de la fila del DOM, no un 40 fijo.
- Esquinas: `body` lleva la clase `esquinas-recto`, `esquinas-medio` o `esquinas-redondo`, y `style.css` define `--radio-bloque` (grupos y widgets: 4, 14 y 24 px), `--radio-panel` (la tarjeta derecha: 8, 28 y 36 px) y `--radio-control` (cajas, diálogos y botones de texto: 6, 12 y 20 px) que sustituyen a los `border-radius` fijos de esos elementos. Los círculos (iconos, `.icono-boton`) no cambian.
- Reloj: `reloj()` usa `hora24` (`hour12: !hora24`), muestra los segundos si `segundos`, y oculta `#fecha` (con `hidden`) si no `fecha`. Con `segundos` activo el intervalo es de 1 s; si no, de 10 s (`main.js` llama a `programarReloj()`, exportada, cada vez que cambian los ajustes).

- [ ] **Paso 1:** ampliar la prueba y ejecutarla → falla:
  - (a) con densidad compacta, `getComputedStyle(rejilla).gridAutoRows` es `32px`; con cómoda, `40px`.
  - (b) con compacta, arrastrar un grupo con ratón al hueco libre y ensanchar otro por su borde (reutilizando las acciones de `rejilla.prueba.mjs`) deja a los bloques en las celdas esperadas y sin solaparse.
  - (c) la clase de esquinas cambia el `border-radius` calculado de un `.grupo` (4, 14 y 24 px) y no el de un `.icono-boton` (`50%`).
  - (d) con `hora24: false` el texto de `#hora` contiene `a. m.` o `p. m.`; con `hora24: true`, no; con `segundos: true` tiene tres bloques `:` separados de dos cifras (`hh:mm:ss`); con `fecha: false`, `#fecha` está oculto.
  - (e) con `segundos: true` el texto de `#hora` cambia en menos de 2,2 s; con `segundos: false`, no cambia en 2,2 s.
  - (f) los cinco ajustes sobreviven a una recarga (`pg.recargar()`).
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Editor de apariencia: densidad, esquinas y reloj».

### Task 3 · Tarea 3: diez dibujos de fondo, liso e intensidad

**Archivos:** crear `js/fondos.js`; modificar `js/apariencia.js` (`pintarFondo` pasa a usar `fondos.js`), `newtab.html` (pestaña Fondo: una rejilla de muestras con el nombre de cada dibujo, «Liso» y «Imagen propia», y un deslizador `#intensidad` de 0 a 100), `style.css`; crear `pruebas/fondos.prueba.mjs`.

**Interfaces:**
- `fondos.js` exporta `FONDOS: { [id: string]: { nombre: string, dibujar(ancho: number, alto: number): string } }` con los diez ids de dibujo (más adelante `liso` e `imagen` los trata `apariencia.js`). `dibujar` devuelve el contenido de un `<svg viewBox="0 0 ancho alto">` como texto, solo con elementos `path`, `circle`, `line` y `polygon`, sin atributos de color (los colorea `style.css`: trazos en `var(--l)` y los marcados con `class="maestra"` en `var(--l2)`), y es **determinista**: la misma llamada devuelve siempre el mismo texto (el generador aleatorio usa una semilla fija).
- Los dibujos: `curvas` (el actual, movido tal cual desde `apariencia.js`), `grafo` y `teselas` (adaptados de `mockups/a-grafo.html` y `mockups/c-teselas.html`), `ondas` (líneas onduladas paralelas), `puntos` (retícula de puntos), `rayas` (diagonales), `cuadricula` (tipo plano técnico, con líneas maestras cada cinco), `hexagonos` (panal), `anillos` (círculos concéntricos desde dos centros) y `montanas` (capas de crestas).
- `pintarFondo()` escribe en `#fondo` el SVG del dibujo elegido; con `liso` lo deja vacío; con `intensidad` aplica `opacity: intensidad / 100` a `#fondo`.

- [ ] **Paso 1:** escribir `fondos.prueba.mjs` y ejecutarla → falla (el módulo no existe):
  - (a) `Object.keys(FONDOS)` son exactamente los diez ids; cada `nombre` es un texto no vacío y distinto.
  - (b) para cada id, `dibujar(1440, 900)` contiene al menos 10 elementos, ningún atributo `fill` ni `stroke` con un color, ninguna etiqueta fuera de `path`, `circle`, `line` y `polygon`, y dos llamadas devuelven el mismo texto.
  - (c) los diez dibujos son distintos entre sí a 1440×900.
  - (d) elegir cada muestra del panel cambia el contenido de `#fondo`, `opciones.apariencia.fondo` se guarda y sobrevive a una recarga; `liso` deja `#fondo` sin elementos `path`.
  - (e) el deslizador `#intensidad` a 30 pone `opacity: 0.3` en `#fondo` y se guarda; a 0 el fondo no se ve.
  - (f) cambiar el tamaño de la ventana (`Emulation.setDeviceMetricsOverride` o `pg.p.setViewport`) deja `#fondo` con un solo `svg`, y su `viewBox` coincide con el nuevo tamaño.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Editor de apariencia: diez fondos, liso e intensidad».

### Task 4 · Tarea 4: imagen de fondo propia

**Archivos:** crear `js/imagen-fondo.js`; modificar `js/apariencia.js`, `newtab.html` (pestaña Fondo: botón «Elegir imagen…» con `<input type="file" id="archivo-fondo" accept="image/png,image/jpeg,image/webp" hidden>` y «Quitar imagen»), `style.css`; crear `pruebas/imagen-fondo.prueba.mjs`.

**Interfaces:**
- `imagen-fondo.js` exporta `reducirImagen(archivo: File): Promise<string>` (devuelve una `data:` URL `image/webp` de como mucho 1920 px de ancho y 3 MB; lanza `Error` con un mensaje en español si el archivo no es una imagen decodificable o no se puede dejar en 3 MB), `guardarImagenFondo(url: string): Promise<void>` y `leerImagenFondo(): Promise<string | null>`, con la clave `fondo-imagen` de `storage.local` (`escribirLocal` y `leerLocal`), y `borrarImagenFondo(): Promise<void>`.
- Con `fondo: 'imagen'` y una imagen guardada, `#fondo` lleva la imagen como `background-image` (`cover`, centrada) y un velo del color de fondo del tema (`var(--bg)`) con opacidad `1 - intensidadImagen / 100`. Sin imagen guardada en este equipo se pinta `curvas` y el ajuste guardado no cambia.
- Al elegir un archivo: se reduce, se guarda, se pone `fondo: 'imagen'` y se avisa; si algo falla, no cambia nada y se avisa con el mensaje del error. «Quitar imagen» borra la clave y vuelve a `curvas`. El deslizador `#intensidad` controla `intensidadImagen` mientras el fondo es `imagen`.

- [ ] **Paso 1:** escribir `imagen-fondo.prueba.mjs` (con `abrir({ chrome: {} })`) y ejecutarla → falla:
  - (a) un archivo de más de 8 MB (un `canvas` de 2400×1800 con ruido, exportado como PNG) se reduce: el resultado empieza por `data:image/webp`, mide como mucho 3 MB y su ancho es 1920 como mucho; se guarda en `chrome.storage.local` con la clave `fondo-imagen` y **no** en `sync`.
  - (b) tras elegir el archivo en `#archivo-fondo`, `opciones.apariencia.fondo` es `imagen`, `#fondo` tiene `background-image` y la imagen sobrevive a una recarga.
  - (c) el velo: con `intensidadImagen` 40 la opacidad del velo es `0.6`; el deslizador a 100 la deja en `0`.
  - (d) un archivo de texto con nombre `foto.png` se rechaza con aviso y deja `opciones` y `fondo-imagen` sin cambios.
  - (e) con el almacenamiento local fallando (el interruptor `chrome-falso/localFalla` de `chrome-falso.js`), elegir una imagen avisa y el fondo anterior sigue igual.
  - (f) con `fondo: 'imagen'` en `opciones` y sin `fondo-imagen` guardada, la página se pinta como `curvas` y el ajuste guardado sigue siendo `imagen`.
  - (g) «Quitar imagen» borra `fondo-imagen` y vuelve a `curvas`.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Editor de apariencia: imagen de fondo propia».

### Task 5 · Tarea 5: cierre de la fase

- [ ] **Paso 1:** `version` 4.3.0 en `manifest.json`; `README.md` (filas de `js/fondos.js` y `js/imagen-fondo.js`, y una línea sobre el editor de apariencia).
- [ ] **Paso 2:** comprobar a mano una vez en Chrome real: cambiar el acento, un fondo, la densidad y elegir una foto de más de 8 MB.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar\empaquetar.ps1` → `dist/novatab-4.3.0.zip` con `js/fondos.js` y `js/imagen-fondo.js` y sin IPs de redes reales.
- [ ] **Paso 4:** marcar la fase 4 en la hoja de ruta y commit «Fase 4 terminada: versión 4.3.0».
