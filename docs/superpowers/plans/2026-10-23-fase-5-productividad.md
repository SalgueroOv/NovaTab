# Fase 5: productividad — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases anteriores). Los pasos usan casillas (`- [x]`).

**Objetivo:** que el uso diario sea más rápido con el teclado: motor de búsqueda y atajos `!y` configurables, sugerencias de Google opcionales, Alt+1…Alt+9 para los nueve primeros enlaces locales y una paleta de comandos con Ctrl+K.

**Arquitectura:** `js/motores.js` tiene la lógica pura (tabla de motores, validación de los ajustes del buscador y resolución de lo escrito en una consulta). `js/buscador.js` pinta el desplegable con ella. Los ajustes viven en `opciones.buscador` (la clave `opciones` que ya se sincroniza) y se editan en una cuarta pestaña «Buscador» del panel de personalizar. `js/comandos.js` es la paleta Ctrl+K (un `<dialog>`) y los atajos Alt+número. El permiso de las sugerencias es un `optional_host_permissions` que se pide al marcar la casilla.

**Tecnología:** módulos ES nativos (sin compilación), `chrome.permissions` y `fetch`, Node 22+ para las pruebas.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 5) y las respuestas del usuario del 2026-10-23:
- **Motor distinto de Google:** la primera fila del desplegable busca en tu motor, y Enter y Shift+Enter van a él; las filas Modo IA, Imágenes, Vídeos, Noticias y Maps siguen siendo de Google.
- **Dónde se ajusta:** una pestaña «Buscador» nueva en el panel de personalizar, con motor, atajos (`!clave` + dirección con `%s`) y la casilla de sugerencias.
- **Paleta:** una entrada por tema («Tema: Papel»…) y «Nuevo enlace» pide en un segundo paso el grupo y abre el diálogo de siempre.
- **Alt+1…Alt+9:** cada uno de los nueve primeros enlaces locales muestra su cifra, discreta, al pasar el ratón o tener el foco.

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado.
- `optional_host_permissions: ["https://suggestqueries.google.com/*"]` en el manifest; nunca en `host_permissions`, y el permiso solo se pide al marcar la casilla de sugerencias, dentro del clic.
- Formato de `opciones.buscador`: `{ motor: id, atajos: [{ clave, nombre, url }], sugerencias: boolean }`.
- Motores (`id`: dirección de búsqueda): `google`: `https://www.google.com/search?q=%s`; `duckduckgo`: `https://duckduckgo.com/?q=%s`; `bing`: `https://www.bing.com/search?q=%s`; `perplexity`: `https://www.perplexity.ai/search?q=%s`; `chatgpt`: `https://chatgpt.com/?q=%s`.
- Atajos por defecto: `y` YouTube `https://www.youtube.com/results?search_query=%s`; `gh` GitHub `https://github.com/search?q=%s`; `w` Wikipedia `https://es.wikipedia.org/w/index.php?search=%s`; `m` Maps `https://www.google.com/maps/search/%s`. Valores por defecto del buscador: `motor: 'google'`, `sugerencias: false`.
- Un atajo válido: `clave` de 1 a 10 caracteres entre `a-z0-9`, única (sin distinguir mayúsculas); `url` `http:` o `https:` (`urlSegura`) que contiene exactamente un `%s`; `nombre` de 1 a 30 caracteres; como mucho 20 atajos. Un motor desconocido vuelve a `google`. Lo inválido se descarta al leer, nunca lanza.
- Se escribe `!clave texto` (la clave con `!` delante, un espacio y el texto): `%s` se sustituye por el texto con `encodeURIComponent`.
- Sugerencias: `https://suggestqueries.google.com/complete/search?client=firefox&q=<texto>` (devuelve `[texto, [sugerencias…]]`), con una espera de 200 ms tras dejar de escribir, descartando respuestas viejas, como mucho 5, y solo con permiso concedido y la casilla marcada. Un fallo de red no muestra nada ni lanza.
- Alt+1…Alt+9 abren los nueve primeros enlaces **locales visibles** (grupos de la zona local, en el orden de la cuadrícula: por `pos.y` y luego `pos.x`; los enlaces de cada grupo en su orden; sin los grupos plegados ni los privados en modo reunión).
- Los datos guardados no cambian de formato (sigue la versión 4); la paleta no guarda nada.
- Versión final: 4.4.0.

## Revisión: lo que más probablemente falle

1. **Ctrl+K y Alt+número mientras se escribe en una nota, el buscador o un diálogo:** Alt+número no debe abrir nada con un diálogo abierto o escribiendo en un campo con texto; Ctrl+K no se abre con otro diálogo abierto (tarea 4 y 5).
2. **Un atajo editado con basura (`!`, clave vacía, `%s` repetido, URL `javascript:`):** se descarta al guardar y nunca llega a abrirse (tarea 1).
3. **Texto que empieza por `!` pero no es un atajo (`!hola`, `!` solo):** se busca tal cual en el motor, sin error (tarea 1).
4. **Sugerencias con la red caída, la respuesta mal formada o el permiso revocado:** el desplegable funciona igual, solo sin ellas (tarea 3).
5. **Permiso denegado al marcar la casilla de sugerencias:** la casilla vuelve a desmarcarse y se avisa (tarea 3).
6. **Menos de nueve enlaces locales, o ninguno:** Alt+número sin enlace asociado no hace nada (tarea 4).
7. **Modo reunión:** ni la paleta ni Alt+número muestran ni abren enlaces de grupos privados (tareas 4 y 5).
8. **Texto de la consulta con `&`, `#`, `%` o espacios:** va codificado en la dirección y no rompe otros parámetros (tarea 1).
9. **Nuevo enlace desde la paleta sin ningún grupo:** se avisa en lugar de abrir un diálogo roto (tarea 5).

---

### Task 1 · Tarea 1: motores, atajos y desplegable del buscador

**Archivos:** crear `js/motores.js`, `pruebas/motores.prueba.mjs`; modificar `js/buscador.js`, `js/apariencia.js` (`opciones.buscador` en `OPCIONES` y en `ponerOpciones`).

**Interfaces:**
- `motores.js` exporta `MOTORES: { [id]: { nombre: string, url: string } }` (los cinco de «Restricciones globales», con nombres «Google», «DuckDuckGo», «Bing», «Perplexity» y «ChatGPT»), `BUSCADOR` (los valores por defecto), `normalizarBuscador(b: unknown): Buscador` (aplica las reglas de «Restricciones globales» y nunca lanza) y `resolverConsulta(texto: string, buscador: Buscador): { q: string, destino: { etiqueta: string, url: string } }`. Si `texto` es `!clave resto` con una clave que existe en `buscador.atajos` y `resto` no vacío, `destino` es ese atajo (`etiqueta` su `nombre`, `url` con `%s` sustituido por `encodeURIComponent(resto)`) y `q` es `resto`; en cualquier otro caso `destino` es el motor elegido y `q` es el texto recortado.
- `opciones.buscador` se normaliza con `normalizarBuscador` en `ponerOpciones`; `buscador.js` lee `opciones.buscador` (importada de `apariencia.js`).
- El desplegable: la primera fila de «buscar» es `destino` con título `Buscar «q» en <etiqueta>` (por ejemplo `Buscar «gatos» en YouTube`) y etiqueta de fila igual a `<etiqueta>`; las filas Modo IA, Imágenes, Vídeos, Noticias y Maps (`GOOGLE[1..]`) siguen detrás, siempre con etiqueta «Google». `primeraGoogle` pasa a ser el índice de la fila del destino (Shift+Enter va a él).

- [x] **Paso 1:** escribir `motores.prueba.mjs` (evalúa `import('/js/motores.js')` en la página) y ejecutarla → falla:
  - (a) `normalizarBuscador(undefined)`, `(null)`, `('x')` devuelven `{ motor: 'google', atajos: [los cuatro por defecto], sugerencias: false }`; un motor `'altavista'` vuelve a `google`; un atajo con `clave: ''`, `clave: 'A B'`, `url` sin `%s`, con dos `%s`, o `javascript:alert(1)%s` se descarta; dos atajos con la misma clave (`Y` y `y`) dejan solo el primero; con 25 atajos válidos quedan 20; las claves se guardan en minúsculas.
  - (b) `resolverConsulta('!y gatos', por defecto)` → `q: 'gatos'` y `destino.url` `https://www.youtube.com/results?search_query=gatos`; `'!y gatos y perros & más #1'` codifica el texto (`gatos%20y%20perros%20%26%20m%C3%A1s%20%231`); `'!hola mundo'`, `'!'`, `'!y'` y `'!y '` van al motor con el texto recortado; con motor `duckduckgo` `'cómo hacer pan'` → `https://duckduckgo.com/?q=c%C3%B3mo%20hacer%20pan`.
  - (c) en la página, escribir `!y gatos` en el buscador pone como primera sugerencia una fila con título `Buscar «gatos» en YouTube` y `href` de YouTube, y las filas de Google siguen detrás; escribir `NAS Beta` mantiene tus enlaces primero y la primera fila de motor sigue diciendo `Buscar «NAS Beta» en Google`.
  - (d) con `guardados: { opciones: { buscador: { motor: 'bing' } } }`, escribir `hola` da `Buscar «hola» en Bing` con `href` `https://www.bing.com/search?q=hola`, y `GOOGLE[1]` (Modo IA) sigue con etiqueta `Google`; `#modo-ia` sigue apuntando a Google.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔` (incluida `buscador.prueba.mjs`, que comprueba que la primera sugerencia de Google sigue buscando en Google); commit «Buscador: motor configurable y atajos con !».

### Task 2 · Tarea 2: pestaña «Buscador» en el panel de personalizar

**Archivos:** modificar `newtab.html` (cuarta pestaña `data-pestana="buscador"` y su panel `#pestana-buscador`: un `<select id="motor-buscador">`, una lista editable de atajos `#lista-atajos` con campos de clave, nombre y dirección y botón de borrar por fila, un botón «Añadir atajo», y un botón «Restaurar atajos»), `style.css`, `js/apariencia.js` (la pestaña ya se rige por `[role="tab"]`), crear `js/ajustes-buscador.js` (importado desde `main.js`); ampliar `pruebas/motores.prueba.mjs`.

**Interfaces:**
- `ajustes-buscador.js` pinta el selector y la lista desde `opciones.buscador`; cada cambio llama a `cambiarBuscador(parcial: Partial<Buscador>)` (exportada desde `apariencia.js`): normaliza, aplica, guarda (`guardarOpciones()`, que ya recuerda el eco) y repinta el desplegable si está abierto. Los campos de texto guardan 250 ms después de dejar de escribir (como los controles que se arrastran). Una fila de atajo con datos inválidos (clave repetida o vacía, dirección sin `%s` o no http/https) muestra su campo con `aria-invalid="true"` y un texto de ayuda y **no** se guarda hasta que sea válida; el resto de filas sí.
- «Restaurar atajos» vuelve a los cuatro por defecto sin tocar el motor.

- [x] **Paso 1:** ampliar la prueba y ejecutarla → falla:
  - (a) hay cuatro pestañas Tema, Fondo, Diseño y Buscador; el selector lista los cinco motores y marca Google.
  - (b) elegir DuckDuckGo en el selector guarda `opciones.buscador.motor === 'duckduckgo'` y el desplegable busca en DuckDuckGo; sobrevive a una recarga.
  - (c) cambiar la clave de `y` a `yt` y escribir `!yt gatos` abre la fila de YouTube; `!y gatos` pasa a buscarse en el motor.
  - (d) añadir un atajo con la dirección `javascript:alert(1)?%s`: el campo queda con `aria-invalid="true"` y `opciones.buscador.atajos` no lo contiene.
  - (e) borrar un atajo lo quita de lo guardado; «Restaurar atajos» vuelve a los cuatro y conserva el motor.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Pestaña Buscador: motor y atajos editables».

### Task 3 · Tarea 3: sugerencias de Google con permiso opcional

**Archivos:** modificar `manifest.json` (`optional_host_permissions`), `newtab.html` (casilla `#opt-sugerencias` con el texto «Sugerencias de Google mientras escribes (envía lo que escribes a Google)» en la pestaña Buscador), `js/ajustes-buscador.js`, `js/buscador.js`; ampliar `pruebas/motores.prueba.mjs` y `pruebas/lib/util.mjs` (opción `sugerenciasGoogle: [texto, [sugerencias]] | 'falla'` que simula `fetch` a `suggestqueries.google.com`, y `permisoSugerencias: 'concedido' | 'denegado' | 'pendiente'` en `chrome.permissions`).

**Interfaces:**
- Al marcar la casilla: `chrome.permissions.request({ origins: ['https://suggestqueries.google.com/*'] })`, llamada síncrona dentro del manejador del clic (sin `await` antes); si se deniega, la casilla se desmarca y `avisar('Sin permiso para pedir sugerencias a Google')`; si se concede, `cambiarBuscador({ sugerencias: true })`. Al desmarcarla, `sugerencias: false` (el permiso no se retira).
- `buscador.js` exporta `pedirSugerencias(q: string): Promise<string[]>`: `fetch` de la dirección de «Restricciones globales», `[]` ante cualquier fallo o forma inesperada, como mucho 5 textos, todos `string`. El desplegable las añade, tras tus enlaces y antes de las filas de Google, como filas de etiqueta «Sugerencia» que abren la búsqueda de ese texto en tu motor; solo si `opciones.buscador.sugerencias` está activo y `chrome.permissions.contains` es verdadero (se comprueba al abrir, no se guarda). Se pide con 200 ms de espera y una respuesta que llega después de haber cambiado el texto se descarta.

- [x] **Paso 1:** ampliar la prueba y ejecutarla → falla:
  - (a) `manifest.json` tiene `https://suggestqueries.google.com/*` en `optional_host_permissions` y no en `host_permissions`.
  - (b) con el permiso `'pendiente'`, marcar la casilla lo concede y guarda `sugerencias: true`; con `'denegado'`, la casilla queda desmarcada, nada se guarda y el aviso es «Sin permiso para pedir sugerencias a Google».
  - (c) con `sugerencias: true` y permiso concedido, escribir `gat` y esperar 400 ms añade filas «Sugerencia» (`gatos`, `gatitos`) entre tus enlaces y las de Google, con `href` de la búsqueda en el motor; sin la casilla o sin permiso no hay filas ni llamadas (`window.__sugerencias` cuenta 0).
  - (d) con `sugerenciasGoogle: 'falla'`, o con una respuesta `{"x": 1}`, el desplegable muestra solo sus filas normales y no hay errores en consola.
  - (e) escribir `ga` y enseguida `gato` hace una sola llamada con `gato` y descarta la respuesta de `ga` si llega tarde.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Sugerencias de Google con permiso opcional».

### Task 4 · Tarea 4: Alt+1…Alt+9 y sus cifras

**Archivos:** modificar `js/pintado.js` (la cifra en la fila), `style.css`, crear `js/comandos.js` (por ahora solo los atajos Alt) e importarlo desde `main.js`; crear `pruebas/atajos.prueba.mjs`.

**Interfaces:**
- `comandos.js` exporta `enlacesDeAtajo(): { enlace, grupo }[]` con los nueve primeros enlaces locales visibles según «Restricciones globales», y un `keydown` en `document` que con `Alt` (sin Ctrl, Meta ni Mayús) y la tecla `Digit1`…`Digit9` (por `ev.code`) llama a `ev.preventDefault()` y abre `enlacesDeAtajo()[n - 1].enlace.url` en esta pestaña (`location.href`). No actúa con un `dialog[open]`, con un arrastre en curso, con el foco en un campo de texto que tenga contenido ni si no existe ese enlace (en ese caso tampoco llama a `preventDefault()`).
- `pintado.js` añade a la fila de cada uno de esos enlaces un `<span class="atajo-num" aria-hidden="true">N</span>` con su cifra; `style.css` la oculta (`opacity: 0`) y la muestra (`opacity: .7`) con `:hover` o `:focus-visible` de la fila y siempre en modo edición no (en edición no se muestra).

- [x] **Paso 1:** escribir `atajos.prueba.mjs` y ejecutarla → falla (con `DATOS_PRUEBA`, cuya zona local es Alfa 4 enlaces, Beta 3, Gamma privado 2):
  - (a) `enlacesDeAtajo().map(e => e.enlace.nombre)` da los nueve en el orden de la cuadrícula: Alfa (4), luego Beta (3), luego Gamma (2), y Alt+1 abre `http://192.168.1.11/`, Alt+5 `http://192.168.1.1/` (el primero de Beta); la navegación se comprueba interceptando `location.href` con una página de prueba que registra la última dirección en `window.__ultimaDireccion` (asignación a `location.href` sustituida por una función) o, si no se puede, comprobando que el evento tiene `defaultPrevented` y que la función exportada devuelve el destino.
  - (b) en modo reunión (`opciones.reunion`), Gamma (privado) no entra: solo hay siete enlaces y Alt+8 no hace nada.
  - (c) con Alfa plegado, Alt+1 abre el primero de Beta.
  - (d) con un diálogo abierto, o con el foco en la nota con texto, Alt+1 no abre nada; con el buscador enfocado y vacío, sí.
  - (e) Alt+9 sin noveno enlace no hace nada y `defaultPrevented` es falso.
  - (f) las cifras 1 a 9 existen en las filas correspondientes, con `opacity` 0 sin el ratón encima y `0.7` con él encima (`:hover` simulado moviendo el ratón con `Input.dispatchMouseEvent`).
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Alt+1…Alt+9 abren los nueve primeros enlaces locales».

### Task 5 · Tarea 5: paleta de comandos con Ctrl+K

**Archivos:** modificar `js/comandos.js`, `newtab.html` (`<dialog id="paleta">` con un `<input id="paleta-texto">` y una `<ul id="paleta-lista" role="listbox">`), `style.css`, `js/edicion.js`/`js/apariencia.js`/`js/widgets.js` solo si hace falta exportar algo; crear `pruebas/paleta.prueba.mjs`.

**Interfaces:**
- `comandos.js` exporta `comandos(): Comando[]` con `Comando = { id: string, titulo: string, detalle?: string, ejecutar(): void | Promise<void>, siguiente?(): Comando[] }`. Si un comando tiene `siguiente`, al ejecutarlo la paleta muestra esa lista en lugar de cerrarse. Los comandos, en este orden:
  1. un **«Abrir: nombre»** por cada enlace de grupos visibles (con `detalle` el nombre del grupo; en modo reunión sin los de grupos privados); abrir con Enter o clic va a esta pestaña y con Ctrl+Enter a una nueva;
  2. **«Modo reunión: activar/desactivar»** (el título dice lo que hará);
  3. **«Tema: <nombre>»** por cada uno de los diez temas;
  4. **«Nuevo grupo»**, **«Nuevo enlace…»** (con `siguiente` que lista todos los grupos como «Grupo: nombre» y al elegir uno activa el modo edición y abre `nuevoEnlace(grupo.id)`) y **«Nuevo widget»** (activa el modo edición y llama a `nuevoWidget()`); «Nuevo grupo» activa el modo edición y llama a `nuevoGrupo('local')`;
  5. **«Mostrar/Ocultar panel izquierdo»** y **«…panel derecho»** (con la regla de que nunca quedan los dos ocultos);
  6. **«Editar: activar/desactivar»** (el modo edición).
- La paleta se abre con Ctrl+K o Cmd+K (`ev.preventDefault()`; con ella abierta, vuelve a cerrarla) salvo con otro `dialog[open]`. Filtra por todas las palabras del texto, sin tildes ni mayúsculas, sobre `titulo` y `detalle`; ↑ y ↓ mueven la selección, Enter ejecuta, Esc o clic fuera cierran, y vuelve el foco a donde estaba. «Nuevo enlace…» sin ningún grupo avisa («No hay grupos todavía: crea uno primero») y no abre nada.

- [x] **Paso 1:** escribir `paleta.prueba.mjs` y ejecutarla → falla:
  - (a) Ctrl+K abre `#paleta` con el texto vacío y la lista completa (los enlaces primero, luego los comandos en el orden de arriba); Ctrl+K otra vez la cierra; Esc la cierra y devuelve el foco al elemento que lo tenía.
  - (b) escribir `proxmox` deja «Abrir: Proxmox Alfa» como único resultado; Enter lo abre (la dirección de destino se comprueba como en `atajos.prueba.mjs`); escribir `tema papel` + Enter deja `document.documentElement.dataset.tema === 'papel'`; `tema ro` + Enter deja `rosa`.
  - (c) «Modo reunión: activar» cambia `opciones.reunion`; después el título dice «desactivar» y los enlaces de Gamma no aparecen en la lista.
  - (d) «Nuevo enlace…» + Enter muestra la lista de grupos; elegir «Beta» abre `#dlg-enlace` con el título de nuevo enlace; con `datos.grupos` vacío, avisa y no abre el diálogo.
  - (e) «Nuevo grupo» abre `#dlg-grupo` y el modo edición queda activo; «Ocultar panel izquierdo» da `body.sin-izq`, y con el derecho ya oculto el izquierdo no se oculta.
  - (f) ↓, ↓, Enter ejecuta el tercer resultado; el texto `zzzzz` muestra «Sin resultados» y Enter no hace nada.
  - (g) con un diálogo (por ejemplo `#dlg-enlace`) abierto, Ctrl+K no abre la paleta.
  - (h) el texto de un enlace con `<` y `&` en su nombre se muestra literal (sin HTML interpretado).
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Paleta de comandos con Ctrl+K».

### Task 6 · Tarea 6: cierre de la fase

- [x] **Paso 1:** `version` 4.4.0 en `manifest.json`; `README.md` (filas de `js/motores.js`, `js/ajustes-buscador.js` y `js/comandos.js`, y una línea con los atajos Ctrl+K, Alt+1…9 y `!clave`); `empaquetar/LEEME.txt` con esos atajos en su lista de funciones.
- [x] **Paso 2:** comprobar a mano una vez en Chrome real: Ctrl+K (que Chrome no se lo quede), Alt+1, `!y gatos`, marcar las sugerencias y aceptar el permiso.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar\empaquetar.ps1` → `dist/novatab-4.4.0.zip` con `js/motores.js`, `js/ajustes-buscador.js` y `js/comandos.js` y sin IPs de redes reales.
- [x] **Paso 4:** marcar la fase 5 en la hoja de ruta y commit «Fase 5 terminada: versión 4.4.0».
