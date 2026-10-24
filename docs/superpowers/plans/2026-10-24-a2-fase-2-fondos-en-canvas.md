# Rediseño A2 · Fase 2: fondos en canvas — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, elegida por el usuario) o superpowers:subagent-driven-development. Los pasos usan casillas (`- [ ]`).

**Objetivo:** sustituir los dibujos SVG quietos del fondo por un canvas animado. Cada perfil tendrá su propio relieve (sacado de su semilla), dibujado de nueve formas minimalistas. El relieve se mueve despacio, se ilumina bajo el ratón con una luz difuminada y se transforma al cambiar de perfil.

**Arquitectura:**
- `js/terreno.js`: el motor. Contiene el ruido con semilla, la clase `Terreno` (campo, morfosis, bucle con tope de 30 dibujos/s, ratón) y `miniatura()` para las vistas fijas.
- `js/fondos.js` (se reescribe): los nueve estilos de dibujo y las capas de luz. Los algoritmos se copian de `mockups/v2/comun.js` (`ESTILOS`, `nivelLuz`, `capasLuz`, `pintarLuz`, `fijo`, `TABLA`, `borde`, `ruido`, `azar`, `hashStr`, `suave`), pasados a módulos.
- `#fondo` sigue siendo el `div` que ya existe: lleva dentro el `<canvas id="terreno">`, conserva la imagen propia como `background-image` con su `.velo` y aplica la intensidad con su `opacity`. Así la imagen propia y sus pruebas no cambian.
- `js/apariencia.js` gobierna el motor según el aspecto del perfil.

**Tecnología:** Canvas 2D, `requestAnimationFrame`, `Path2D`, JavaScript de módulos sin dependencias y pruebas en Chrome sin ventana por CDP.

**Spec:** `docs/superpowers/specs/2026-10-24-rediseno-a2-design.md`, §5.2 y §7 (fase 2).

## Restricciones globales

- MV3 sin scripts remotos ni `eval`; sin compilación ni dependencias de npm.
- Los fondos son minimalistas: solo líneas y puntos, a pantalla completa, sin rellenos. En Crestas solo se iluminan los tramos cercanos al ratón.
- La luz bajo el ratón tiene un radio de 190 px y 10 capas con curva suave. La capa exterior es casi transparente: no puede verse un círculo de borde nítido.
- Rendimiento:
  - como mucho 30 dibujos por segundo, también al mover el ratón;
  - sin dibujar con la pestaña oculta;
  - con `quieto`, solo se dibuja al cambiar algo (ajustes, tamaño o ratón con luz);
  - **en Chrome sin ventana a 1440×900, ningún estilo pasa de 40 ms por dibujo en la prueba** (el spec pide aligerar lo que pase de 20 ms; la prueba deja margen por la variación de la máquina, y el informe de la fase da los tiempos medidos).
- `prefers-reduced-motion: reduce`: fondo quieto, sin morfosis ni titileo.
- Los ids antiguos migran en `normalizarApariencia`: `teselas`→`rombos`, `ondas`→`crestas`, `puntos`→`cotas`, `cuadricula`→`trama`, `hexagonos`→`trama`, `anillos`→`curvas`, `montanas`→`crestas`.
- La fase termina con la suite en verde, `empaquetar\empaquetar.ps1` sin fugas, `manifest.json` en **5.3.0** y commit.

**Desviación del spec decidida en este plan:** la imagen propia no se pinta en el canvas, sigue siendo el `background-image` de `#fondo` con su velo. Se ve igual (tipo *cover*, velo del color del tema, sin movimiento ni luz), ahorra código y conserva las diez pruebas de `imagen-fondo.prueba.mjs`. El canvas solo la dibuja en la miniatura de su muestra. Hay que anotarlo en el spec en la tarea 4.

## Revisión: lo que más probablemente falle

1. **Un aspecto guardado con un fondo antiguo, o con valores raros** (`densidadFondo: 'mucha'`, `relieve: 7`, `movimiento: 'rapido'`, `semilla` de 500 caracteres o no texto): se normaliza a valores válidos y la página dibuja. Lo prueba la tarea 1.
2. **Cambiar de perfil, de semilla o de estilo muchas veces seguidas** (Alt+P repetido) durante una morfosis: no se queda a medias ni lanza errores, y termina en el relieve del último perfil. Lo prueba la tarea 2.
3. **Pestaña en segundo plano o fondo `quieto`**: el contador de dibujos no sube. Lo prueba la tarea 2.
4. **Redimensionar la ventana o cambiar el zoom** (`devicePixelRatio`): el canvas se rehace al tamaño nuevo, sin estirarse. Lo prueba la tarea 1.
5. **Tema claro y tema oscuro**: el dibujo usa la tinta del tema (se lee `--ink` del estilo calculado en cada dibujo) y se ve en ambos. Lo prueba la tarea 1, comparando píxeles en Bosque y en Papel.

---

### Task 1 · Tarea 1: motor y nueve fondos dibujados en canvas

**Archivos:**
- Crear: `js/terreno.js`.
- Reescribir: `js/fondos.js`.
- Modificar:
  - `js/apariencia.js`: `APARIENCIA`, `IDS_FONDO`, `normalizarApariencia` y `pintarFondo`;
  - `newtab.html`: `<canvas id="terreno">` dentro de `#fondo`;
  - `style.css`: se borran las reglas `.fondo line/path/circle/polygon/.f1…`; se añade `#terreno { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }`.
- Pruebas:
  - `pruebas/fondos.prueba.mjs` (reescrita);
  - `pruebas/apariencia.prueba.mjs` (`DEFECTO` y casos de normalizar);
  - `pruebas/imagen-fondo.prueba.mjs`: (f) comprueba el canvas en vez de `svg path`, y (h) e (i) usan `trama` en vez de `hexagonos`.

**Interfaces:**
- Produce, en `js/terreno.js`:
  - `hashStr(s: string): number`, `azar(semilla: number): () => number` y `ruido(semilla: string): (x: number, y: number) => number`, como en el mockup.
  - `class Terreno`:
    - `constructor(canvas, { estatico = false, colores = null } = {})`. `colores` es `{ bg, ink, acento, modo }`; si es `null`, se leen del estilo calculado de `<html>` en cada dibujo.
    - `config(op)`. `op` puede tener `{ semilla, estilo, densidad, relieve, movimiento, brillo }`; se marca un dibujo pendiente.
    - `dibujar()`.
    - `medir()`: rehace el tamaño interno con `devicePixelRatio`, que se limita a 2.
    - `valor(x, y): number`.
    - Contador público `dibujos: number`, que suma 1 en cada `dibujar()`, y `estadistica: { luz: number }`, con los elementos iluminados del último dibujo.
    - **En esta tarea, sin bucle de animación ni ratón**: dibuja en `config` (en el siguiente `requestAnimationFrame`) y al cambiar el tamaño de la ventana.
  - `miniatura(canvas, { semilla, estilo, densidad, relieve, tema }): void`. `tema` es `{ bg, ink, acento, modo }` y la escala es proporcional a `innerWidth`.
- Produce, en `js/fondos.js`:
  - `FONDOS: Record<id, { nombre, dibujar(T, ctx, args) }>` con estos ids y nombres, en este orden:
    - `curvas` Curvas, `cotas` Cotas, `sombreado` Sombreado, `crestas` Crestas;
    - `grafo` Grafo, `rayas` Rayas, `rombos` Rombos, `trama` Trama, `galaxia` Galaxia.
  - `POR_SEMILLA = new Set(['grafo', 'trama', 'galaxia'])`.
  - `nivelLuz`, `capasLuz` y `pintarLuz`. `args` es `{ g, cols, filas, min, max, ink, acento, bg, base, r, luz, semilla }`, como en el mockup.
- En `js/apariencia.js`:
  - `IDS_FONDO = [...Object.keys(FONDOS), 'liso', 'imagen']` y `FONDOS_ANTIGUOS` con la migración de «Restricciones globales».
  - `APARIENCIA` gana `semilla: null`, `densidadFondo: 0.55`, `relieve: 0.45`, `movimiento: 'lento'` y `brillo: true`.
  - `normalizarApariencia`:
    - `semilla`: texto de 1 a 40 caracteres o `null`;
    - `densidadFondo` y `relieve`: números de 0 a 1 redondeados a dos decimales;
    - `movimiento`: `quieto`, `lento` o `vivo`;
    - `brillo`: booleano;
    - `fondo`: primero se traduce con `FONDOS_ANTIGUOS` y después se valida.
  - `pintarFondo()`:
    - con imagen, oculta el canvas (`hidden`) y deja lo de hoy;
    - con `liso`, oculta el canvas;
    - si no, `terreno.config({ semilla: apariencia.semilla ?? perfilActivo(), estilo, densidad: densidadFondo, relieve, movimiento, brillo })` y la `opacity` de intensidad en `#fondo`.

- [ ] **Paso 1: reescribir `pruebas/fondos.prueba.mjs`** con `abrir({ reducirMovimiento: true })`. Las funciones de ayuda de la prueba son:
  - `pixeles()`: cuenta los píxeles de `#terreno` con alfa > 0 (con `getImageData`);
  - `huella()`: un hash del `getImageData` completo.

  Casos:
  - (a) `Object.keys(FONDOS)` es igual a los nueve ids, en orden, y los nombres son distintos y no vacíos.
  - (b) Por cada id, elegido desde su muestra `[data-fondo]`: `pixeles() > 2000`, el ajuste guardado es ese id, y las nueve huellas son distintas.
  - (c) Determinista: tras `terreno.dibujar()` dos veces seguidas, la huella es la misma.
  - (d) `liso` deja `#terreno` oculto. Rayas sobrevive a la recarga.
  - (e) Intensidad 30 da `opacity` 0.3 en `#fondo`, y se guarda.
  - (f) La ventana de 1000×700 deja `#terreno` con `width` = 1000 × `devicePixelRatio`.
  - (g) Bosque y Papel dan huellas distintas con el mismo fondo (se lee la tinta del tema).
  - (h) Rendimiento: para cada estilo, la media de 5 `dibujar()` es menor de 40 ms. La prueba imprime los tiempos con `console.log`.

  En `apariencia.prueba.mjs`:
  - `DEFECTO` incluye los cinco campos nuevos;
  - `normalizarApariencia({ fondo: 'teselas' }).fondo` es `'rombos'` (y lo mismo con los otros seis antiguos);
  - `{ densidadFondo: 'mucha', relieve: 7, movimiento: 'rapido', semilla: 'x'.repeat(500), brillo: 'sí' }` normaliza a `0.55`, `1`, `'lento'`, `null` y `true`.
- [ ] **Paso 2: ejecutar** `node pruebas/ejecutar.mjs fondos` y `node pruebas/ejecutar.mjs apariencia`. Esperado: FALLAN (`FONDOS` tiene los diez ids antiguos y no existe `#terreno`).
- [ ] **Paso 3: implementar** lo de «Interfaces».
- [ ] **Paso 4: ejecutar** `fondos`, `apariencia` e `imagen-fondo`. Esperado: PASAN, con los tiempos de (h) en la salida.
- [ ] **Paso 5: commit** «Fondos: nueve dibujos minimalistas en canvas, sacados del relieve del perfil».

### Task 2 · Tarea 2: movimiento, luz bajo el ratón y cambio de perfil

**Archivos:**
- Modificar: `js/terreno.js` (bucle, ratón, morfosis y fundido).
- Pruebas: `pruebas/fondos-movimiento.prueba.mjs` (nueva).

**Interfaces:**
- Consume `Terreno`, `FONDOS`, `POR_SEMILLA` y los helpers de luz de la tarea 1.
- Comportamiento que se añade a `Terreno` (los valores son los del mockup):
  - **Bucle**: `requestAnimationFrame` continuo que no hace nada con `document.hidden`. `t` avanza a `VELOCIDAD = { quieto: 0, lento: 0.45, vivo: 1.5 }` por segundo (0 con movimiento reducido). Se dibuja si hay pendiente o si `vel > 0`, siempre que hayan pasado 33 ms desde el último dibujo. Durante una morfosis se dibuja en cada fotograma.
  - **Ratón**:
    - `pointermove` en `window` guarda la posición relativa al canvas y marca un dibujo pendiente solo si `brillo`;
    - `pointerleave` en `document` la quita;
    - `r` (en los `args`) es la posición si `brillo`; si no, `null`.
  - **Morfosis**:
    - una semilla nueva en `config` crea `campoB = ruido(semilla)`, guarda `semAnt` y pone `k = 0`, o `k = 1` con movimiento reducido;
    - `k` sube `dt / 1.3` por fotograma; al llegar a 1, `campoA = campoB` y `campoB = null`;
    - una semilla nueva en mitad de una morfosis toma `campoA = campoB` y empieza otra.
    - Al arrancar, `campoA` es un llano (0,5): el relieve «sube».
    - Los estilos de `POR_SEMILLA` se funden: se dibujan con la semilla vieja a `base·(1−k)` y con la nueva a `base·k`.

- [ ] **Paso 1: escribir `pruebas/fondos-movimiento.prueba.mjs`**:
  - (a) `quieto` y sin ratón: `terreno.dibujos` no cambia en 1 s.
  - (b) `lento`: sube al menos 10 en 1 s, y no más de 35.
  - (c) Movimiento reducido emulado con `vivo`: no sube en 1 s.
  - (d) Pestaña oculta (`Emulation.setFocusEmulationEnabled` no basta, así que se fuerza `document.hidden` con `Object.defineProperty(document, 'hidden', { get: () => true })` y se lanza `visibilitychange`): no sube en 1 s.
  - (e) Con `brillo` y un `Input.dispatchMouseEvent` (`mouseMoved`) en (400, 600), `estadistica.luz > 0`. Con `brillo` desactivado, 0 tras otro movimiento.
  - (f) La luz no tiene borde nítido: con el ratón en (400, 600) y `curvas`, la opacidad de las capas crece del borde al centro y la capa exterior pinta con alfa < 0,05. Se comprueba sobre el resultado de una función pura `alfaLuz(i, tope)` que exporta `fondos.js`.
  - (g) Cambiar de perfil (con dos perfiles en `guardados`) lanza la morfosis: durante 1,3 s hay dibujos en cada fotograma, al terminar `campoB` es `null` y la huella es distinta a la de antes.
  - (h) Pulsar Alt+P ocho veces seguidas con 50 ms entre medias: sin errores en la consola y, 2 s después, la semilla del motor es la del perfil activo.
- [ ] **Paso 2: ejecutar** `node pruebas/ejecutar.mjs fondos-movimiento`. Esperado: FALLA (no hay bucle: `dibujos` no sube con `lento`).
- [ ] **Paso 3: implementar** lo de «Interfaces».
- [ ] **Paso 4: ejecutar** `fondos-movimiento`, `fondos`, `perfiles-interfaz` y `perfiles-operaciones`. Esperado: PASAN.
- [ ] **Paso 5: commit** «Fondos: movimiento, luz bajo el ratón y transformación al cambiar de perfil».

### Task 3 · Tarea 3: controles del fondo en Personalizar

**Archivos:**
- Modificar:
  - `newtab.html`: pestaña Fondo;
  - `js/apariencia.js`: muestras con miniatura y controles nuevos;
  - `style.css`.
- Pruebas: `pruebas/fondos-controles.prueba.mjs` (nueva) y `pruebas/accesibilidad.prueba.mjs` (pestaña Fondo con los controles nuevos).

**Interfaces:**
- **Muestras**: cada `[data-fondo]` lleva un `<canvas class="mini-fondo">` (48×32 en CSS) pintado con `miniatura()` con la semilla, el estilo y el tema actuales. «Liso» va sin dibujo y «Imagen propia» sin canvas, como hoy.
- **Controles nuevos** debajo de las muestras, dentro de `#ajustes-terreno`:
  - `input[type=range]#densidad-fondo` y `#relieve` (0–100; guardan con `cambiarApariencia(…, true)`);
  - el grupo `.eleccion[aria-label="Movimiento"]` con `button[data-movimiento]` (Quieto, Lento y Vivo, con `aria-pressed`);
  - `input[type=checkbox]#opt-brillo`, «Iluminar bajo el ratón»;
  - `button#otro-terreno`, «Generar otro terreno»: `cambiarApariencia({ semilla: perfilActivo() + '-' + 5 caracteres al azar })`.
- **Visibilidad**:
  - `#ajustes-terreno` se oculta con `liso` o con la imagen en uso;
  - con la imagen en uso se ve `p#nota-imagen`: «Con una imagen el fondo no se mueve ni se ilumina con el ratón.»
- Al cambiar de tema, de perfil o de semilla se repintan las miniaturas.

- [ ] **Paso 1: escribir `pruebas/fondos-controles.prueba.mjs`**:
  - (a) Las nueve muestras dibujadas tienen un canvas con píxeles pintados.
  - (b) Los deslizadores y el movimiento guardan `densidadFondo`, `relieve` y `movimiento` en el aspecto del perfil, y `terreno.op` los refleja.
  - (c) «Generar otro terreno» cambia `apariencia.semilla`, la huella del canvas y la de las miniaturas.
  - (d) Con `liso`, `#ajustes-terreno` está oculto. Con una imagen guardada y elegida, la nota se ve, `#ajustes-terreno` está oculto y `terreno.dibujos` no sube en 1 s.
  - (e) Cada perfil tiene su semilla: dos perfiles sin semilla guardada dan huellas distintas (la semilla por defecto es el id).
- [ ] **Paso 2: ejecutar.** Esperado: FALLA (no existe `#ajustes-terreno`).
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4: ejecutar** `fondos-controles`, `fondos` y `accesibilidad`. Esperado: PASAN.
- [ ] **Paso 5: commit** «Fondos: miniaturas y ajustes del terreno en Personalizar».

### Task 4 · Tarea 4: cierre de la fase

- [ ] **Paso 1:** `node pruebas/ejecutar.mjs`. Esperado: todas pasan.
- [ ] **Paso 2:** `empaquetar\empaquetar.ps1`. Esperado: el zip lleva `js/terreno.js` y `js/fondos.js`, y nada de desarrollo.
- [ ] **Paso 3:**
  - `manifest.json` en `"version": "5.3.0"`.
  - En el spec: fase 2 «(hecha, versión 5.3.0)» y, en §5.2, la imagen propia como `background-image` de `#fondo`.
  - En el `README.md`: la línea de funciones de los fondos («Fondos animados: el relieve de cada perfil dibujado de nueve formas, con luz bajo el ratón, o tu imagen») y `js/terreno.js` en la tabla.
- [ ] **Paso 4: commit** «Fase 2 del rediseño A2 terminada: versión 5.3.0».
