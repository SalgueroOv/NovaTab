# Rediseño A2 · Fase 1: temas derivados — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea a tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** que cada tema sea un trío de colores (fondo, tinta, acento) del que se derivan todas las superficies, incluidos menús y diálogos; que cada tema traiga su acento, y que el usuario pueda crear, editar y borrar temas propios comunes a todos los perfiles.

**Arquitectura:** un módulo nuevo `js/temas.js` guarda los once temas incluidos, la lista de temas propios (clave común `temas-propios` en `storage.sync`) y la lógica pura (derivar un tema de su fondo y acento, normalizar la lista, elegir el texto sobre el acento). `js/apariencia.js` aplica el tema poniendo `--bg`, `--ink` y `--acento` en `:root`. `style.css` deriva todo lo demás con `color-mix` y mantiene los nombres de variable de hoy (`--texto`, `--superficie`, `--panel`, `--l`…) como alias, para no tocar cientos de reglas. Un diálogo nuevo (`js/editor-tema.js`) crea y edita temas propios con vista previa de la página entera.

**Tecnología:** CSS `color-mix(in oklab, …)` y `@property`, JavaScript de módulos sin dependencias, pruebas en Chrome sin ventana por CDP (`node pruebas/ejecutar.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-24-rediseno-a2-design.md` (§5.1 y §7, fase 1).

## Restricciones globales

- MV3 sin scripts remotos ni `eval`; sin compilación ni dependencias de npm en la extensión.
- Interfaz en español. Ningún dato existente se pierde: los diez ids de tema actuales se conservan tal cual.
- Permisos: ninguno nuevo en esta fase.
- Sin violeta ni índigo, y sin crema con terracota, en los temas incluidos. Contraste AA (4,5:1 en texto normal) para `--texto` y `--texto-2` sobre `--bg`, `--panel` y `--superficie` en los once temas.
- `prefers-reduced-motion: reduce`: sin transición de colores.
- La fase termina con la suite en verde, `empaquetar\empaquetar.ps1` sin fugas, `manifest.json` en **5.2.0** y commit.

## Revisión: lo que más probablemente falle

1. **Un perfil con un tema propio que ya no existe** (se borró en otro equipo, o viene de una copia importada): se ve Bosque, la página no se rompe y el aspecto guardado no se reescribe solo. Lo prueba la tarea 2.
2. **Una lista `temas-propios` corrupta o de otra versión en sync** (no es un array, colores sin `#`, ids repetidos, más de 12, nombres vacíos o de 500 caracteres): se descarta lo inválido y lo demás funciona. Lo prueba la tarea 2.
3. **Cancelar el editor de temas** después de haber movido los colores (vista previa en vivo): la página vuelve exactamente al tema que tenía. Lo prueba la tarea 2.
4. **Contraste en los temas claros nuevos** (Niebla, Menta, Rosa con su acento propio) y del texto sobre el acento: `--sobre-acento` es `#1f1f1f` o `#ffffff`, el de más contraste, también con el acento del tema. Lo prueban la tarea 1 (axe) y la tarea 2 (un tema propio con acento muy claro).
5. **Colores leídos a mitad de la transición** de 0,8 s: las pruebas que comparan colores emulan movimiento reducido, y la de axe espera o emula. Lo cubre la tarea 1.

---

### Task 1 · Tarea 1: tríos de color, superficies derivadas y acento por tema

**Archivos:**
- Crear: `js/temas.js`.
- Modificar: `style.css` (bloque «Temas», cabecera hasta la línea 67, y el `transition` de `body`), `js/apariencia.js` (`TEMAS`, `muestras`, `ponerTema`, `ponerApariencia`, `luminosidad`), `js/comandos.js:50` (temas de la paleta), `pruebas/lib/util.mjs` (`crearAbrir`: opción `reducirMovimiento`).
- Pruebas: `pruebas/temas.prueba.mjs` (reescrita), `pruebas/apariencia.prueba.mjs:31` y `:57` (acentos nuevos), `pruebas/paleta.prueba.mjs:32` (11 temas), `pruebas/accesibilidad.prueba.mjs` (11 temas y movimiento reducido).

**Interfaces:**
- Produce, en `js/temas.js`:
  - `TEMAS: Tema[]`, con `Tema = { id, nombre, modo: 'oscuro'|'claro', bg, ink, acento }` (hex `#rrggbb` en minúsculas), en este orden y con estos valores:

    | id | nombre | modo | bg | ink | acento |
    | --- | --- | --- | --- | --- | --- |
    | bosque | Bosque | oscuro | #18221d | #e3ece5 | #a8d672 |
    | noche | Noche | oscuro | #111316 | #e6eaf0 | #f2b35b |
    | medianoche | Medianoche | oscuro | #14171c | #e4e9f1 | #7fb0e8 |
    | grafito | Grafito | oscuro | #1b1b1d | #ebebed | #d6b25e |
    | carbon | Carbón | oscuro | #18181b | #ececec | #ff7a45 |
    | abismo | Abismo | oscuro | #0b191d | #dcecef | #4fd1c5 |
    | papel | Papel | claro | #f5f0e6 | #1d1c19 | #2a4fb0 |
    | glaciar | Glaciar | claro | #eaf2f6 | #0f2029 | #0a7099 |
    | niebla | Niebla | claro | #eef1f5 | #18202b | #3d6a9e |
    | menta | Menta | claro | #eef6f2 | #122219 | #1b7d4c |
    | rosa | Rosa | claro | #fbf1f2 | #2a1418 | #bd2d57 |

    Si axe señala un contraste insuficiente con estos valores, se ajusta el mínimo imprescindible (normalmente la tinta o el acento de ese tema) y se anota en el commit.
  - `luminosidad(hex: string): number` (se mueve aquí desde `apariencia.js`).
  - `sobreAcento(hex: string): '#1f1f1f' | '#ffffff'`: el de más contraste (la fórmula que ya usa `ponerApariencia`).
  - `buscarTema(id: string): Tema`: el tema con ese id (incluido o propio) o, si no existe, el de `bosque`.
  - `todosLosTemas(): Tema[]`: los incluidos y después los propios.
- Produce, en `js/apariencia.js`:
  - `ponerTema(id: string, { animar = true } = {}): void`: `temaActual = id` **aunque el id no exista** (así no se reescribe el aspecto de un perfil con un tema borrado). Aplica `buscarTema(id)`: `--bg`, `--ink` y `--acento` en `document.documentElement.style`, más `dataset.tema` (el id del tema aplicado) y `dataset.modo`. Con `animar: false` añade la clase `sin-transicion` a `<html>` y la quita dos `requestAnimationFrame` después; el arranque (`main.js`) llama con `animar: false`.
  - `ponerApariencia`: el acento efectivo es `apariencia.acento ?? buscarTema(temaActual).acento`. Pone `--acento` y `--sobre-acento` (siempre, con `sobreAcento`) y deja `#acento-libre` con ese valor.
  - `pintarMuestras(): void`: rehace `#muestras` desde `todosLosTemas()`. Cada muestra es `button.muestra[data-tema]` con un círculo del color de fondo y un punto del acento (sin `conic-gradient`). `muestras` deja de ser una constante exportada; quien la usaba (`comandos.js`) pasa a `todosLosTemas()` más `ponerTema` y `guardarOpciones`.
- CSS (`style.css`):
  - `@property --bg` y `@property --ink` con `syntax: '<color>'`, `inherits: true` y los valores de Bosque como `initial-value`. **`--acento` no se registra**: así `getPropertyValue('--acento')` sigue devolviendo el hex que leen las pruebas.
  - `:root { transition: --bg .8s, --ink .8s; }` y `.sin-transicion, .sin-transicion * { transition: none !important; }`. Con movimiento reducido, sin transición. Se quita `transition: background-color .3s, color .3s` de `body`.
  - Derivadas (las de `mockups/v2/comun.css`): `--s1` a `--s4` (5, 9, 14 y 21 % de `--ink` sobre `--bg`), `--linea` (11 %) y `--linea-fuerte` (24 %) sobre transparente, `--suave` (70 %), `--tenue` (56 %) y `--velo` (`--bg` al 84 % sobre transparente).
  - Alias de lo existente: `--texto: var(--ink)`, `--texto-2: var(--suave)`, `--hover` (6 % de tinta sobre transparente), `--borde` (9 %), `--borde-fuerte` (22 %), `--l` (8 % de tinta sobre `--bg`) y `--l2` (16 %).
  - Por modo:
    - oscuro: `--superficie: var(--s2)`, `--superficie-2: var(--s3)`, `--panel` = `--s1` al 86 % sobre transparente.
    - claro: `--superficie` = `#ffffff` al 70 % sobre `--bg`, `--superficie-2: var(--s2)`, `--panel` = (`#ffffff` al 55 % sobre `--bg`) al 84 % sobre transparente.
    - `--peligro`, `--peligro-fondo` y las sombras conservan sus valores por modo.
  - Se borran los diez bloques `[data-tema="…"]` y los valores fijos de `--superficie`, `--acento` y demás de los bloques `[data-modo]`.
- Produce, en `pruebas/lib/util.mjs`: `abrir({ …, reducirMovimiento = false })` → `navegador.newPage({ width, height, reducedMotion: reducirMovimiento })`.

- [ ] **Paso 1: reescribir `pruebas/temas.prueba.mjs`** con `abrir({ reducirMovimiento: true })`:
  - `IDS = ['bosque', 'noche', 'medianoche', 'grafito', 'carbon', 'abismo', 'papel', 'glaciar', 'niebla', 'menta', 'rosa']` igual a las muestras de `#muestras` (en orden).
  - Para cada tema, tras su clic:
    - `dataset.tema` y `dataset.modo` son los de la tabla;
    - `getComputedStyle(raíz).getPropertyValue('--bg')` es `rgb(…)` del `bg` de la tabla (comparar con una función `rgb(hex)` de la prueba);
    - `--acento` es el hex de la tabla;
    - `--sobre-acento` es `sobreAcento(acento)` (calculado en la prueba con la misma fórmula);
    - la muestra tiene `aria-pressed="true"`.
  - El color de fondo calculado de `#panel-tema` cambia entre Bosque y Noche y nunca es `rgb(42, 45, 51)` (el gris fijo de antes).
  - Once fondos distintos. Menta se recuerda tras recargar. La prueba de la ventana de 560 px de alto se conserva.
- [ ] **Paso 2: ejecutar** `node pruebas/ejecutar.mjs temas`. Esperado: FALLA (hay diez muestras y el acento es `#8ab4f8`).
- [ ] **Paso 3: implementar** `js/temas.js`, los cambios de `apariencia.js`, `comandos.js`, `style.css` y `crearAbrir`, como en «Interfaces».
- [ ] **Paso 4: actualizar las pruebas afectadas.**
  - `apariencia.prueba.mjs:31`: el acento sin apariencia guardada es el de Bosque, `#a8d672`.
  - `apariencia.prueba.mjs:57`: Restaurar vuelve a `#2a4fb0` (Papel).
  - `paleta.prueba.mjs:32`: 11 comandos «Tema: ».
  - `accesibilidad.prueba.mjs`: lista de 11 temas, nombre «…en los once temas…» y `abrir({ …, reducirMovimiento: true })` (la espera de 450 ms se queda).
- [ ] **Paso 5: ejecutar** `node pruebas/ejecutar.mjs temas`, `apariencia`, `paleta`, `opciones` y `perfiles-aspecto`. Esperado: PASAN. Después, `node pruebas/ejecutar.mjs accesibilidad`. Esperado: PASA, o se ajustan los colores de la tabla como dice «Interfaces» hasta que pase.
- [ ] **Paso 6: mirar** la página y el panel de personalizar en Bosque, Papel y Abismo (captura con el arnés o abriendo la extensión): las superficies llevan el tinte del tema y no queda ningún gris neutro de los de antes.
- [ ] **Paso 7: commit** «Temas: tríos de color con superficies derivadas y acento propio por tema».

### Task 2 · Tarea 2: temas propios

**Archivos:**
- Crear: `js/editor-tema.js`, `pruebas/temas-propios.prueba.mjs`.
- Modificar: `js/temas.js`, `js/apariencia.js` (`pintarMuestras`: muestras propias con botón Editar y una carta «Crear tema»), `js/main.js` (leer los temas propios antes de `ponerTema` y escuchar sus cambios), `newtab.html` (diálogo `#dlg-tema`), `style.css` (muestra propia y diálogo), `README.md`.

**Interfaces:**
- Consume: `buscarTema`, `todosLosTemas`, `sobreAcento`, `luminosidad` (tarea 1); `ponerTema`, `guardarOpciones`, `temaActual`, `pintarMuestras` (`apariencia.js`); `leer`, `escribir`, `recordar`, `esLoUltimo`, `alCambiar` (`almacen.js`); `abrirDialogo` (`edicion.js`).
- Produce, en `js/temas.js`:
  - `CLAVE_TEMAS_PROPIOS = 'temas-propios'`, `MAX_TEMAS_PROPIOS = 12`, `MAX_NOMBRE_TEMA = 20`.
  - `temaDesde(nombre: string, bg: string, acento: string, id?: string): Tema`:
    - `modo` es `'claro'` si `luminosidad(bg) > 0.3`; si no, `'oscuro'`;
    - `ink` es `bg` mezclado con `#000000` al 88 % (claro) o con `#ffffff` al 90 % (oscuro), por canales;
    - además lleva `propio: true`.
  - `normalizarTemasPropios(lista: unknown): Tema[]`:
    - descarta los elementos que no sean `{ id, nombre, bg, acento }` con `id` que cumpla `/^propio-[a-z0-9]{4,12}$/`, `nombre` recortado de 1 a 20 caracteres y colores que cumplan `/^#[0-9a-f]{6}$/i` (pasados a minúsculas);
    - descarta ids repetidos (gana el primero) y corta en 12;
    - devuelve los temas completos con `temaDesde`.
    - Lo que no es un array da `[]`.
  - `ponerTemasPropios(lista: Tema[]): void` (sustituye la lista en memoria) y `temasPropios(): Tema[]`.
  - `leerTemasPropios(): Promise<Tema[]>`: lee la clave, la normaliza y la pone.
  - `guardarTemasPropios(lista: Tema[]): Promise<void>`: guarda solo `{ id, nombre, bg, acento }` de cada tema, con `recordar` antes de `escribir`.
  - `nuevoIdTema(): string`: `'propio-' +` 8 caracteres `[a-z0-9]` de `crypto.randomUUID`.
- Produce, en `js/editor-tema.js`:
  - `abrirEditorTema(id?: string): void`. Sin `id`, crea; con `id`, edita ese tema propio.
  - El diálogo `#dlg-tema` tiene Nombre (`input`, `maxlength=20`, obligatorio), Fondo (`input[type=color]`), Acento (`input[type=color]`), una muestra y, al editar, el botón «Borrar tema».
  - Cada `input` aplica a la página entera `temaDesde(…)` como vista previa: se usa la misma función que aplica `--bg`, `--ink` y `--acento` (sacarla de `ponerTema` como `aplicarColores(tema: Tema)`). La vista previa no guarda nada.
  - **Guardar** sustituye o añade el tema en la lista, la guarda, llama a `pintarMuestras()` y deja el tema elegido en el perfil con `ponerTema(id)` y `guardarOpciones()`. Con 12 temas, «Crear tema» está desactivado y dice por qué en su `title`.
  - **Cancelar**, Esc o cerrar vuelven a `ponerTema(temaActual)` y a la apariencia de antes (el acento libre incluido).
  - **Borrar tema** pide confirmación con `confirm()` («¿Borrar el tema “Nombre”?»), lo quita de la lista y lo guarda. Si es el tema del perfil activo, `ponerTema('bosque')` y `guardarOpciones()`. Los demás perfiles no se tocan: al abrirlos se ve Bosque (por `buscarTema`).
- Muestras (`pintarMuestras`):
  - Una muestra propia es un `div.muestra-propia` con su `button.muestra` y un `button.editar-tema`, cuyo `aria-label` es «Editar el tema Nombre», con el icono `lapiz` de `util.js`.
  - Al final hay un `button.crear-tema` que dice «Crear tema».
- Arranque y sincronización (`main.js`):
  - `leerTemasPropios()` entra en el mismo `Promise.all` que el aspecto, antes de `ponerTema(aspecto?.tema, { animar: false })`.
  - `alCambiar`: si llega `temas-propios` y no es un eco (`esLoUltimo`), se hace `ponerTemasPropios(normalizarTemasPropios(nuevo))`, `pintarMuestras()` y `ponerTema(temaActual)`.

- [ ] **Paso 1: escribir `pruebas/temas-propios.prueba.mjs`** con `abrir({ reducirMovimiento: true })`. Los temas se leen de `localStorage['temas-propios']` (JSON), como lo guarda el almacén sin `chrome.storage`.
  - (a) Crear «Arena» con fondo `#2b2a26` y acento `#e8c547`:
    - hay una muestra nueva con `data-tema` que cumple `/^propio-/`;
    - la página tiene `--bg` = `rgb(43, 42, 38)` y `--acento` = `#e8c547`, y `dataset.modo` es `oscuro`;
    - `--sobre-acento` es `#1f1f1f`;
    - la lista guardada tiene 1 elemento `{ id, nombre: 'Arena', bg: '#2b2a26', acento: '#e8c547' }`.
  - (b) Tras recargar, el tema sigue aplicado y su muestra está marcada.
  - (c) Editar «Arena», cambiar el fondo a `#f4f1ea` (vista previa: `dataset.modo` pasa a `claro`) y **Cancelar**: el tema vuelve al de antes (`--bg` = `rgb(43, 42, 38)`) y la lista guardada no cambia.
  - (d) Un segundo perfil (crearlo con `import('/js/perfiles-ops.js')` como en `perfiles-aspecto.prueba.mjs`) ve la muestra de «Arena» y puede elegirla.
  - (e) Borrar «Arena» desde su editor, aceptando el `confirm`, estando en uso en el perfil activo:
    - la página pasa a Bosque;
    - la lista guardada queda vacía;
    - el aspecto del otro perfil sigue diciendo `tema: <id de Arena>`, sin reescribirse;
    - al cambiar a él se ve Bosque.
  - (f) Guardar en `temas-propios` antes de abrir la página: `'hola'`; después una lista con un tema válido, uno con `bg: 'rojo'`, uno repetido, uno sin nombre y uno con un nombre de 500 caracteres. La página abre sin errores en la consola y solo hay una muestra propia.
  - (g) Con 12 temas propios guardados, `button.crear-tema` está `disabled`.
  - (h) Un cambio de `temas-propios` desde «otra pestaña» (escribir la clave y lanzar el evento de cambio que usa `chrome-falso.js`, o abrir una segunda página y crear el tema allí) añade la muestra sin recargar.
- [ ] **Paso 2: ejecutar** `node pruebas/ejecutar.mjs temas-propios`. Esperado: FALLA (no existe `.crear-tema`).
- [ ] **Paso 3: implementar** lo de «Interfaces».
- [ ] **Paso 4: ejecutar** `node pruebas/ejecutar.mjs temas` (las dos pruebas) y `node pruebas/ejecutar.mjs accesibilidad`, añadiendo a la de accesibilidad el estado «diálogo de tema abierto». Esperado: PASAN.
- [ ] **Paso 5: `README.md`**: en la lista de funciones, «Temas: once incluidos y los tuyos propios (fondo y acento), comunes a todos los perfiles». En la tabla de estructura, `js/temas.js` y `js/editor-tema.js`.
- [ ] **Paso 6: commit** «Temas propios: crear, editar y borrar, comunes a todos los perfiles».

### Task 3 · Tarea 3: cierre de la fase

**Archivos:** `manifest.json` (versión), `docs/superpowers/specs/2026-10-24-rediseno-a2-design.md` (marcar la fase 1 como hecha en §7).

- [ ] **Paso 1:** `node pruebas/ejecutar.mjs`. Esperado: todas pasan; solo se salta alguna si falta `herramientas/node_modules`, y entonces se dice así.
- [ ] **Paso 2:** `powershell -ExecutionPolicy Bypass -File empaquetar\empaquetar.ps1`. Esperado: el zip no contiene `mockups/`, `docs/`, `pruebas/`, `herramientas/` ni `.taste-skill/`.
- [ ] **Paso 3:** `manifest.json` en `"version": "5.2.0"`; en el spec, «(hecha)» tras la fase 1 de §7.
- [ ] **Paso 4: commit** «Fase 1 del rediseño A2 terminada: versión 5.2.0».
