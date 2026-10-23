# Fase 6: vistas por grupo y separador de paneles — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases anteriores). Los pasos usan casillas (`- [x]`).

**Objetivo:** que cada grupo local pueda mostrarse como lista (como ahora), cuadrícula de iconos o compacta a dos columnas sin IPs, y que el ancho del panel izquierdo se pueda cambiar arrastrando una franja entre los dos paneles.

**Arquitectura:** cada grupo guarda `vista` (`'lista' | 'iconos' | 'compacta'`) junto a su color y zona (dentro de `datos`, sin cambiar la versión del formato). `alto(b)` de `js/rejilla.js` calcula las filas de un grupo según su vista y su ancho en columnas, sin medir píxeles, y `resolver()` ya empuja a los vecinos cuando el alto cambia. El separador es un elemento con `role="separator"` entre los paneles; su valor vive en `opciones.anchoIzq` (la clave `opciones` que ya se sincroniza) y se aplica como la variable CSS `--ancho-izq`.

**Tecnología:** módulos ES nativos (sin compilación), CSS grid, eventos de puntero, Node 22+ para las pruebas.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 6) y las respuestas del usuario del 2026-10-23:
- **Iconos:** un icono por cada 2 columnas de ancho del grupo (6 columnas = 3 iconos por fila, 12 = 6); cada fila de iconos ocupa 2 filas de la cuadrícula; icono con el nombre debajo y sin IP.
- **Compacta:** dos enlaces por fila, sin IP.
- **Separador:** una franja entre los paneles que se arrastra (siempre, no solo en modo edición); el panel izquierdo va del 25 % al 50 % de la página (hoy el 36 %, con mínimo de 400 px); doble clic vuelve al 36 %.
- **Elegir la vista:** en el diálogo «Editar grupo», con un selector Lista / Iconos / Compacta.

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado.
- Filas de un grupo (sin contar la del título), con `n` enlaces y `w` columnas de ancho: lista `max(1, n)`; compacta `max(1, ceil(n / 2))`; iconos `max(1, ceil(n / max(1, floor(w / 2)))) * 2`. Plegado sigue ocupando solo la fila del título. `alto(b)` = 1 + esas filas.
- Un grupo sin `vista` (guardado antes de esta fase, importado o de una copia) o con un valor desconocido es `'lista'`. Los datos guardados no cambian de versión (sigue la 4); `fusionar` ya compara cada grupo entero, así que no necesita cambios.
- Con todos los grupos en lista y el separador sin tocar, la página se ve exactamente igual que en la versión 4.4.0.
- `opciones.anchoIzq`: `null` (por defecto: el ancho de siempre, `minmax(400px, 36%)`) o un número entero de 25 a 50 (porcentaje del ancho de la página; entonces `minmax(320px, X%)`). Cualquier otro valor se lee como `null`.
- El separador no existe con un panel oculto ni con la pantalla estrecha (cuando los paneles se apilan, `max-width: 1000px`).
- Las vistas respetan la densidad (`--alto-fila`) y las esquinas de la fase 4, y el número de Alt+1…9 de la fase 5 se sigue viendo en las tres vistas.
- Versión final: 4.5.0.

## Revisión: lo que más probablemente falle

1. **Ensanchar o estrechar un grupo en iconos cambia su alto:** los vecinos se apartan y nada se solapa (tarea 1).
2. **Grupo sin enlaces en cualquier vista:** una fila con «Sin enlaces», no un hueco de cero filas (tarea 1).
3. **Grupo plegado con cualquier vista:** ocupa una fila (tarea 1).
4. **Grupos de antes de la fase, importaciones y copias sin `vista`:** se ven como lista y no fallan (tarea 1).
5. **Borrar, arrastrar y reordenar enlaces en iconos y compacta:** siguen funcionando en modo edición (tarea 2).
6. **Nombres larguísimos:** no desbordan el icono ni la columna (tarea 2).
7. **Contenido que sobra del recuadro del grupo:** con 7 enlaces, ninguna vista desborda su alto calculado (tarea 2).
8. **`anchoIzq` guardado con basura (90, «x», negativo):** vale el ancho de siempre (tarea 3).
9. **Panel oculto, pantalla estrecha o cambio de tamaño de la ventana con el separador movido:** nada se rompe y el separador no aparece donde no debe (tarea 3).
10. **Un cambio de `opciones` llegado de otra pestaña mientras se arrastra el separador:** no pisa el valor que se está arrastrando (tarea 3).

---

### Task 1 · Tarea 1: la vista de un grupo, su alto y el selector

**Archivos:** modificar `js/datos.js` (`normalizar`, `VISTAS`), `js/rejilla.js` (`alto`), `js/edicion.js` (`dialogoGrupo`, `nuevoGrupo`, `editarGrupo`), `newtab.html` (selector `name="vista"` en `#dlg-grupo`), `js/importar.js` (grupos nuevos con `vista: 'lista'`); crear `pruebas/vistas.prueba.mjs`.

**Interfaces:**
- `datos.js` exporta `VISTAS = ['lista', 'iconos', 'compacta']`; `normalizar` pone `vista` en cada grupo (`VISTAS.includes(g.vista) ? g.vista : 'lista'`).
- `rejilla.js` exporta `filasDe(b: Grupo | Widget): number` (las filas de contenido según «Restricciones globales») y `alto(b)` pasa a ser `b.plegado ? 1 : b.tipo ? b.pos.h : 1 + filasDe(b)`. Para un grupo sin `pos` (aún sin colocar) se usa `w = 6`.
- `dialogoGrupo(titulo, valores)` admite `vista` y devuelve `vista` en su resultado; `nuevoGrupo` crea grupos con `vista: 'lista'`; `editarGrupo` aplica la vista elegida y llama a `guardarYPintar(g)` (el grupo editado manda y los vecinos se apartan).
- Etiquetas del selector: «Lista», «Iconos», «Compacta».

- [x] **Paso 1:** escribir `vistas.prueba.mjs` (con `abrir({ datos })`, datos de prueba con un grupo de 8 enlaces) y ejecutarla → falla:
  - (a) `normalizar` (vía `novatab.datos`): grupos sin `vista`, con `'nada'` o con `5` quedan en `'lista'`; `'iconos'` y `'compacta'` se conservan.
  - (b) `import('/js/rejilla.js').filasDe`: con 8 enlaces, `lista` 8; `compacta` 4; `iconos` con `pos.w` 6 → `2 * ceil(8 / 3)` = 6, con `pos.w` 4 → `2 * ceil(8 / 2)` = 8, con `pos.w` 12 → `2 * ceil(8 / 6)` = 4; con 0 enlaces las tres dan 1 (lista) / 1 (compacta) / 2 (iconos); `alto` de un grupo plegado es 1 con cualquier vista.
  - (c) en modo edición, `Editar grupo` muestra el selector con los tres valores y el actual marcado; elegir `compacta` guarda `vista: 'compacta'`, sobrevive a una recarga y el grupo ocupa las filas esperadas (`gridRow` con `span 5`).
  - (d) con un grupo de 8 enlaces en `lista` (alto 9, filas 1 a 9) y otro justo debajo empezando en la fila 10: pasar el de arriba a `iconos` con `w` 6 (alto 7) deja al de abajo donde estaba; pasarlo a `iconos` con `w` 4 (alto 9) tampoco lo mueve; con 14 enlaces y `iconos` w 4 (alto 15) el de abajo baja a la fila 16 y no se solapan.
  - (e) estrechar con el asa un grupo en `iconos` (de 6 a 4 columnas con 8 enlaces: alto 7 → 9) aparta al vecino de debajo sin solapar.
  - (f) un grupo importado de un JSON sin `vista` y uno creado con «Añadir grupo» quedan en `lista`; los grupos creados por «Importar marcadores» también.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Vistas de grupo: modelo, alto y selector».

### Task 2 · Tarea 2: pintar las tres vistas

**Archivos:** modificar `js/pintado.js` (`pintarGrupoLocal`), `style.css`; ampliar `pruebas/vistas.prueba.mjs`.

**Interfaces:**
- El contenedor `.enlaces` de un grupo lleva la clase `vista-lista`, `vista-iconos` o `vista-compacta`.
- Lista: igual que ahora (icono, nombre, IP, cifra de Alt+número y botón de borrar).
- Compacta: rejilla de 2 columnas iguales; cada celda es un `a.fila.enlace` con icono pequeño y nombre, sin `.dir`; alto de cada fila `var(--alto-fila)`.
- Iconos: rejilla de `max(1, floor(w / 2))` columnas iguales (se pone en una variable CSS `--columnas-iconos` del grupo); cada celda es un `a.fila.enlace` en vertical: icono centrado y el nombre debajo (una línea, con elipsis), sin `.dir`; el alto de cada celda es `calc(2 * var(--alto-fila))` más el hueco de fila de la cuadrícula, de modo que dos filas de iconos ocupan exactamente las filas que calcula `filasDe`.
- En las tres vistas siguen: `dataset.id`, `title` con la dirección completa, `draggable` en edición, el botón de borrar (en iconos y compacta, posicionado en la esquina de la celda y visible solo en edición) y la cifra de Alt+número.

- [x] **Paso 1:** ampliar la prueba y ejecutarla → falla:
  - (a) con 7 enlaces, en cada vista `.enlaces` mide como mucho lo que mide su grupo menos la cabecera (`scrollHeight <= clientHeight`, sin desbordar) y sin conflictos con la densidad compacta de la fase 4.
  - (b) en `compacta` no hay `.dir` y hay 2 columnas (la `x` de la primera y la segunda celda difieren, y la tercera vuelve a la `x` de la primera); en `iconos` con `w` 6 hay 3 columnas y con `w` 12 hay 6.
  - (c) el nombre de un enlace de 120 caracteres no desborda en `iconos` ni en `compacta` (`scrollWidth <= clientWidth` de la celda).
  - (d) en modo edición, en `iconos` y en `compacta`: el botón de borrar de un enlace lo borra (con `confirm` aceptado), y arrastrar un enlace a otro grupo lo mueve (como en la lista).
  - (e) la cifra de Alt+número está en las tres vistas y Alt+1 sigue abriendo el primer enlace.
  - (f) `title` de cada celda es la dirección completa aunque la IP no se vea.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Vistas de grupo: lista, iconos y compacta».

### Task 3 · Tarea 3: separador entre paneles

**Archivos:** modificar `newtab.html` (`<div class="separador-paneles" id="separador-paneles" role="separator" aria-orientation="vertical" aria-valuemin="25" aria-valuemax="50" tabindex="0" title="Arrastra para cambiar el ancho; doble clic para restaurar">` dentro de `.pagina`), `style.css`, `js/apariencia.js` (`anchoIzq` en `OPCIONES` y su normalización), crear `js/separador.js` (importado desde `main.js`); crear `pruebas/separador.prueba.mjs`.

**Interfaces:**
- `apariencia.js` exporta `normalizarAnchoIzq(v: unknown): number | null` (entero de 25 a 50, o `null`), y `ponerOpciones` lo aplica: con un número, `document.documentElement.style` recibe `--ancho-izq: X%`, y `.pagina` usa `grid-template-columns: minmax(320px, var(--ancho-izq)) 1fr` solo con la clase `ancho-izq` en `body`; con `null` se quita la variable y la clase y vale `minmax(400px, 36%)`.
- `separador.js`: `pointerdown` en el separador captura el puntero; `pointermove` calcula `round(x / innerWidth * 100)` limitado a 25–50, lo aplica al momento (variable y `aria-valuenow`) y lo guarda al soltar con `guardarOpciones()` (una sola escritura); `ArrowLeft`/`ArrowRight` con el foco en el separador cambian 1 punto (diferido 250 ms, como los controles que se arrastran); `dblclick` vuelve a `null`. El separador se coloca en el borde derecho del panel izquierdo (sigue al redimensionar la ventana) y no se muestra con `body.sin-izq`, `body.sin-der` ni con la pantalla estrecha. Los ecos de `opciones` recibidos mientras se arrastra no se aplican (se filtran con `esLoUltimo`, como ya hace `main.js`).

- [x] **Paso 1:** escribir `separador.prueba.mjs` y ejecutarla → falla:
  - (a) `normalizarAnchoIzq`: `30` → 30; `25` y `50` valen; `24`, `51`, `90`, `-5`, `'x'`, `null`, `undefined`, `33.6` (se redondea a 34) → los fuera de rango y los no numéricos dan `null`.
  - (b) `guardados: { opciones: { anchoIzq: 90 } }` arranca sin errores y con el ancho de siempre (`minmax(400px, 36%)`, `body` sin la clase `ancho-izq`).
  - (c) arrastrar el separador con el ratón desde su posición hasta el 30 % del ancho de la ventana deja `--ancho-izq` en `30%`, `aria-valuenow` 30 y la columna izquierda midiendo el 30 % del ancho disponible; hacia el 10 % se queda en 25; hacia el 80 % se queda en 50; durante el arrastre hay cero escrituras de `opciones` en `sync` y al soltar, una (`__chromeFalso.escritas()`).
  - (d) tras recargar, el ancho se conserva; doble clic en el separador vuelve a `null` y al ancho de siempre.
  - (e) con el foco en el separador, `ArrowRight` aumenta 1 punto y `ArrowLeft` lo reduce 1, sin pasar de 25 ni de 50.
  - (f) con `body.sin-izq`, con `body.sin-der` y con la ventana de 900 px de ancho el separador no se ve (`display: none`).
  - (g) tras cambiar el tamaño de la ventana de 1440 a 1200 px de ancho, el separador sigue pegado al borde derecho del panel izquierdo (su `left` coincide con el borde del panel con un margen de 2 px).
  - (h) en modo edición, mover y redimensionar bloques con el ratón sigue cayendo en la celda correcta con el separador movido (se reutiliza la acción de `rejilla.prueba.mjs`).
  - (i) un eco de `opciones` con `anchoIzq: 40` recibido (`__chromeFalso.remoto`) mientras se arrastra no cambia el valor que se está arrastrando.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Separador arrastrable entre los paneles».

### Task 4 · Tarea 4: cierre de la fase

- [x] **Paso 1:** `version` 4.5.0 en `manifest.json`; `README.md` (fila de `js/separador.js` y una línea sobre las vistas de grupo); `empaquetar/LEEME.txt` con las vistas y el separador en su lista de funciones.
- [x] **Paso 2:** comprobar a mano una vez en Chrome real: cambiar un grupo a iconos y a compacta, ensancharlo y arrastrar el separador.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar\empaquetar.ps1` → `dist/novatab-4.5.0.zip` con `js/separador.js` y sin IPs de redes reales.
- [x] **Paso 4:** marcar la fase 6 en la hoja de ruta y commit «Fase 6 terminada: versión 4.5.0».
