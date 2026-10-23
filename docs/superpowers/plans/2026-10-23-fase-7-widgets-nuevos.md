# Fase 7: widgets nuevos — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases anteriores). Los pasos usan casillas (`- [x]`).

**Objetivo:** cinco widgets nuevos para la rejilla: reloj mundial, cuenta atrás, tareas, RSS y estado de servicios, cada uno con su prueba de añadir, configurar, recargar y borrar.

**Arquitectura:** `js/widgets.js` sigue siendo el registro y los ayudantes comunes (`campo`, `vacioWidget`, `dialogoWidget`…); gana `registrar(tipo, { def, pintar, configurador })`, que añade el widget a `WIDGETS`, `PINTORES` y `CONFIGURADORES`. Cada widget nuevo vive en su archivo de `js/widgets/` y se registra al cargarse (`main.js` los importa antes de leer los datos). Los cinco widgets que ya existen no se tocan. Los widgets que guardan mucho (tareas, caché de RSS) usan claves propias, como las notas.

**Tecnología:** módulos ES nativos (sin compilación), `Intl.DateTimeFormat` para las zonas horarias, `DOMParser` para el RSS, `fetch` con `mode: 'no-cors'` para sondear servicios, `chrome.permissions`, Node 22+ para las pruebas.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 7), la versión 2.0.0 de la extensión (de ahí sale el sondeo de servicios) y las respuestas del usuario del 2026-10-23:
- **Estado de servicios:** vigila los enlaces de los grupos locales que se elijan (por defecto todos); comprueba al abrir la pestaña y cada 60 s mientras está visible; un LED por servicio; un fallo en HTTPS se muestra como «sin verificar».
- **Cuenta atrás:** hasta una fecha y hora con un nombre (por ejemplo «Vacaciones»); al llegar a cero muestra «Hecho», sin sonido ni notificación.
- **RSS:** un feed por widget, de 5 a 10 titulares, caché de 30 minutos y botón de recargar; cada titular abre su enlace en una pestaña nueva.
- **Reloj mundial:** hasta 6 ciudades de una lista fija de unas 40 zonas; respeta el 12/24 h de Diseño.
- **Tareas:** una lista por widget con casillas; se sincroniza como las notas.

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado.
- Permisos de host nuevos solo como `optional_host_permissions` (`"http://*/*"` y `"https://*/*"`, que ya usaba la versión 2.0.0, junto al de las sugerencias), y pedidos siempre dentro de un clic del usuario y solo para los sitios que se van a usar (`http(s)://host/*`).
- Los datos guardados no cambian de versión (sigue la 4): los widgets nuevos son entradas de `datos.widgets` con su `tipo` y su `config`.
- Tamaños por defecto `w × h` en filas: reloj mundial 4×5, cuenta atrás 4×4, tareas 4×8, RSS 6×10, estado de servicios 6×`1 + n` (n = servicios vigilados, entre 3 y 12).
- Tareas: clave de sync `tareas:<id del widget>` con un array de `{ id, texto, hecha }`; como mucho 40 tareas por widget y 120 caracteres por texto.
- Caché de RSS: clave de este equipo (`storage.local`) `rss:<id del widget>` con `{ t, items: [{ titulo, enlace, fecha }] }`; se borra al borrar el widget y en «Restablecer todo».
- Interfaz en español; todo texto de fuera (titulares, nombres) se pone con `textContent`, nunca como HTML; solo se abren enlaces `http:` y `https:`.
- Versión final: 4.6.0.

## Revisión: lo que más probablemente falle

1. **Reloj mundial en cambios de hora de verano y en zonas con media hora (Mumbai) o fecha distinta (Auckland frente a Los Ángeles):** la hora y la etiqueta «hoy / mañana / ayer» salen bien (tarea 1).
2. **Cuenta atrás con fecha pasada, vacía o inválida y datos importados con basura:** no rompe la página; sale «Hecho» o el aviso de configurar (tarea 2).
3. **Tareas con muchos elementos, texto largo, caracteres raros y dos pestañas editando a la vez:** respeta los límites, no corrompe nada y lo borrado en una pestaña no reaparece (tarea 3).
4. **Borrar un widget de tareas, deshacer, copias, exportar e importar:** las tareas vuelven y no quedan claves huérfanas (tarea 3).
5. **RSS con XML mal formado, Atom en vez de RSS, enlaces `javascript:`, títulos con HTML, feed enorme o que tarda:** se limita, se escapa todo y falla con un mensaje claro (tarea 4).
6. **Permiso denegado o retirado (RSS y estado de servicios):** el widget lo dice y ofrece pedirlo; no se queda cargando ni lanza errores (tareas 4 y 5).
7. **Servicios: HTTPS autofirmado, puerto cerrado, host que no contesta y muchos enlaces a la vez:** estado correcto en cada caso y sin saturar (como mucho 6 sondeos a la vez, 40 sitios distintos como máximo) (tarea 5).
8. **Sondeo mientras la pestaña está oculta, o con el widget plegado o borrado:** no consume red ni deja temporizadores (tarea 5).
9. **Modo reunión:** el estado de servicios no muestra ni sondea los enlaces de grupos privados (tarea 5).

---

### Task 1 · Tarea 1: el registro de widgets y el reloj mundial

**Archivos:** modificar `js/widgets.js` (`registrar`), `js/main.js`, `newtab.html` y `style.css` solo si hace falta; crear `js/widgets/reloj-mundial.js`, `pruebas/reloj-mundial.prueba.mjs`.

**Interfaces:**
- `widgets.js` exporta `registrar(tipo: string, { def, pintar, configurador }): void`: `def` = `{ nombre, descripcion, w, h, configurable, alto? }` (el mismo formato de `WIDGETS`); `pintar(w, cuerpo)` como los demás `PINTORES`; `configurador(actual) → (cuerpo, ctx) => leerValor` como `CONFIGURADORES`. `registrar` falla con un `Error` si el tipo ya existe.
- `reloj-mundial.js` registra el tipo `relojMundial` (`nombre` «Reloj mundial», `w` 4, `h` 5, configurable) y exporta `ZONAS: { id: string, nombre: string }[]` (unas 40, con `id` IANA: Madrid `Europe/Madrid`, Lisboa, Londres, París, Berlín, Roma, Ámsterdam, Atenas, Estambul, Moscú, El Cairo `Africa/Cairo`, Johannesburgo, Nairobi, Dubái, Mumbai `Asia/Kolkata`, Bangkok, Singapur, Hong Kong, Shanghái, Tokio, Seúl, Sídney, Auckland, Honolulu, Anchorage, Los Ángeles, Denver, Chicago, Nueva York, Toronto, Ciudad de México, Bogotá, Lima, Caracas, Santiago, Buenos Aires `America/Argentina/Buenos_Aires`, São Paulo, La Habana, Reikiavik, Canarias `Atlantic/Canary`), `formatoZona(id: string, ahora: Date, hora24: boolean): { hora: string, dia: 'hoy' | 'mañana' | 'ayer', utc: string }` (por ejemplo `utc` «UTC+5:30») y `zonasValidas(v: unknown): string[]` (solo ids de `ZONAS`, sin repetidos, como mucho 6; si queda vacío, `['Europe/Madrid', 'America/New_York', 'Asia/Tokyo']`).
- `config: { zonas: string[] }`. El widget muestra por zona su nombre, la hora y el día (y el desfase UTC en pequeño), se actualiza cada 10 s, usa `apariencia.hora24` de la fase 4 y su configurador es una lista de casillas (no deja marcar más de 6; con 0 marcadas, «Guardar» avisa).

- [x] **Paso 1:** escribir `reloj-mundial.prueba.mjs` y ejecutarla → falla:
  - (a) `registrar` con un tipo repetido lanza; un tipo nuevo aparece en `WIDGETS` y en el diálogo «Añadir widget» (`.tipo-widget`).
  - (b) `ZONAS` tiene entre 38 y 42 elementos, ids únicos y todos válidos para `Intl.DateTimeFormat` (ninguno lanza `RangeError`); los nombres no se repiten.
  - (c) `formatoZona` con una fecha fija (`2026-03-29T00:30:00Z`: Madrid pasa a hora de verano, UTC+1 → UTC+2 a las 02:00 locales; usar `2026-03-29T01:30:00Z` y comprobar `03:30` y `UTC+2`): Madrid `03:30`/`UTC+2`, Mumbai (`Asia/Kolkata`) `07:00`/`UTC+5:30`; con `2026-06-15T23:30:00Z`, Auckland da `11:30` y `dia` `'mañana'` frente a Los Ángeles `16:30` `'hoy'` si la zona de referencia es UTC (la referencia del día es la del equipo; la prueba fija `TZ` del navegador con `Emulation.setTimezoneOverride` a `UTC`).
  - (d) con `hora24: false` sale `a. m.`/`p. m.`; con `true`, no.
  - (e) `zonasValidas(['Europe/Madrid', 'Europe/Madrid', 'x', 7, 'Asia/Tokyo'])` → `['Europe/Madrid', 'Asia/Tokyo']`; con 9 ids válidos devuelve 6; con `undefined`, los tres por defecto.
  - (f) añadir el widget desde el diálogo, marcar 2 ciudades y guardar lo pinta con esas 2; el configurador no deja marcar 7; recargar lo conserva; configurarlo de nuevo cambia las ciudades; borrarlo lo quita de `datos` y de la página.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Registro de widgets y reloj mundial».

### Task 2 · Tarea 2: cuenta atrás

**Archivos:** crear `js/widgets/cuenta-atras.js`, `pruebas/cuenta-atras.prueba.mjs`; modificar `js/main.js`.

**Interfaces:**
- Registra `cuentaAtras` («Cuenta atrás», `w` 4, `h` 4, configurable) con `config: { nombre: string, fecha: string }` (`fecha` es `AAAA-MM-DDThh:mm` en hora local, el formato de `<input type="datetime-local">`); exporta `restante(fecha: string, ahora: Date): { hecho: boolean, dias: number, horas: number, minutos: number, segundos: number } | null` (`null` si la fecha no es válida).
- El widget muestra el nombre (hasta 40 caracteres) y `12 d 4 h 03 min`; a menos de 1 día `4 h 03 min`; a menos de 1 hora `42 min 10 s`; al llegar a cero `Hecho` con la fecha. Se actualiza cada segundo; sin fecha válida muestra `vacioWidget('Elige una fecha y hora.')`.

- [x] **Paso 1:** escribir `cuenta-atras.prueba.mjs` y ejecutarla → falla:
  - (a) `restante('2026-12-15T08:00', new Date(2026, 11, 3, 3, 57))` → 12 días, 4 horas, 3 minutos, `hecho: false`; a un segundo del final `hecho: false` con `segundos: 1`; en el instante exacto y después, `hecho: true`; `'basura'`, `''` y `undefined` → `null`.
  - (b) un widget con una fecha dentro de 2 días, 3 horas y 5 minutos (calculada en la prueba) muestra `2 d 3 h 05 min` (o `04` si pasó un minuto entre medias: la prueba acepta el valor calculado en ese momento); con una fecha dentro de 30 minutos muestra `29 min`… `s` con segundos y cambia en 2 s; con una fecha pasada muestra `Hecho`.
  - (c) el texto del nombre con `<b>` y `&` sale literal; un nombre de 80 caracteres se recorta a 40.
  - (d) añadir, configurar (nombre y fecha), recargar y borrar; sin fecha el widget muestra «Elige una fecha y hora.» y «Configurar»; datos importados con `config: { fecha: 5 }` no rompen la página.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Widget de cuenta atrás».

### Task 3 · Tarea 3: tareas

**Archivos:** crear `js/widgets/tareas.js`, `pruebas/tareas.prueba.mjs`; modificar `js/widgets.js` (borrado del widget), `js/edicion.js` (`tomarFoto`/`aplicarDentro` del historial, exportar, importar, `restablecerTodo`), `js/copias.js` (la foto lleva `tareas`), `js/main.js`.

**Interfaces:**
- Registra `tareas` («Tareas», `w` 4, `h` 8, no configurable). Exporta `claveTareas(id) → 'tareas:<id>'`, `leerTareas(): Promise<Record<string, Tarea[]>>` (de los widgets `tareas` que existen), `escribirTareas(mapa)`, `borrarTareas(conservar: Set<string> = new Set())` (borra las `tareas:*` cuyo widget no está en `conservar`; sin argumento, todas) y `normalizarTareas(v: unknown): Tarea[]` (descarta lo que no sea `{ texto: string no vacío }`, recorta el texto a 120, asigna `id` si falta, `hecha` booleano, como mucho 40).
- El widget muestra la lista con casillas, un campo «Añadir tarea» (Enter añade), un botón de borrar por tarea y «Borrar hechas»; las hechas van tachadas y al final; la lista se guarda con `escribir` (sync) 400 ms después de cambiar y al ocultar la pestaña; una lista editada en otra pestaña se actualiza si no se está escribiendo (como las notas). Al borrar el widget se borra su clave. En el modo reunión no cambia nada.
- Las fotos de deshacer y de las copias llevan `tareas` (`{ datos, notas, tareas }`) con las mismas reglas que las notas: al deshacer solo se reescriben las tareas de widgets que reaparecen; al recuperar una copia, todas. Exportar añade `tareas` al JSON (junto a `notas`) e importar las escribe; «Restablecer todo» las borra.

- [x] **Paso 1:** escribir `tareas.prueba.mjs` (con `abrir({ chrome: {} })`) y ejecutarla → falla:
  - (a) `normalizarTareas`: `undefined`, `'x'`, `[1, null, {}, { texto: '' }]` → `[]`; un texto de 300 caracteres se recorta a 120; 60 tareas válidas dan 40; `hecha: 'sí'` pasa a `false`.
  - (b) añadir una tarea con Enter la guarda en `chrome.storage.sync` (`tareas:<id>`), marcarla la deja `hecha: true` y tachada, y se mueve al final; «Borrar hechas» las quita; borrar una por su botón; tras recargar la lista es la misma.
  - (c) el texto `<img src=x onerror=1> & "comillas"` se muestra literal y no crea elementos.
  - (d) borrar el widget borra su clave (`__chromeFalso` sin `tareas:*`), y deshacer (Ctrl+Z) lo recupera con sus tareas, incluidas las escritas después del último guardado de datos.
  - (e) `Exportar` produce un JSON con `tareas` por id; importarlo en otra página restaura las tareas y no deja claves de widgets que no existen; «Restablecer todo» las borra.
  - (f) recuperar una copia con un widget de tareas y tareas restaura la lista; una copia sin el widget no deja `tareas:*` huérfanas.
  - (g) un cambio remoto en `tareas:<id>` (`__chromeFalso.remoto`) se ve al momento si no se está escribiendo; con el campo enfocado y con texto, se aplica al terminar.
  - (h) con 40 tareas el campo de añadir avisa «Máximo 40 tareas» y no añade.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Widget de tareas».

### Task 4 · Tarea 4: RSS

**Archivos:** modificar `manifest.json` (`optional_host_permissions`), `pruebas/lib/util.mjs` (opciones `rss` y `permisoRss`); crear `js/widgets/rss.js`, `pruebas/rss.prueba.mjs`; modificar `js/widgets.js` (borrado), `js/edicion.js` (`restablecerTodo` borra `rss:*`), `js/main.js`.

**Interfaces:**
- Registra `rss` («RSS», `w` 6, `h` 10, configurable) con `config: { url: string, cantidad: number }` (`cantidad` entre 5 y 10, por defecto 5). Exporta `leerFeed(xml: string): { titulo: string, items: { titulo: string, enlace: string, fecha: number | null }[] } | null` (RSS 2.0 `item/title|link|pubDate` y Atom `entry/title|link[href]|updated`; `null` si no es un XML de feed; solo `enlace` http o https, con título no vacío; como mucho 50 elementos) y `cargarFeed(url: string, { forzar = false } = {}): Promise<{ items, t }>` (usa la caché `rss:<id>` si tiene menos de 30 minutos y no se fuerza; si falla la red y hay caché, devuelve la caché marcada como vieja).
- El configurador valida la dirección (`http:` o `https:`) y pide el permiso del sitio (`http(s)://host/*`) **dentro del clic de Guardar**: `ctx.validar` devuelve `false` la primera vez, lanza `chrome.permissions.request` y, si se concede, vuelve a cerrar con `ctx.cerrar(valor)`; si se deniega, avisa «Sin permiso para leer ese feed» y no guarda.
- El widget muestra los titulares con su fecha relativa («hace 2 h»), cada uno un enlace con `target="_blank"` y `rel="noopener noreferrer"`, el título del feed arriba y un botón de recargar; con permiso retirado muestra «Falta el permiso para este feed» y un botón que lo pide.

- [x] **Paso 1:** ampliar `abrir` con `rss: { [url]: texto | 'falla' | 'lento' }` (sustituye `fetch` para esas direcciones) y `permisoRss: 'concedido' | 'denegado' | 'pendiente'`, escribir `rss.prueba.mjs` y ejecutarla → falla:
  - (a) `leerFeed`: un RSS 2.0 con 3 elementos da 3 titulares; un Atom con `link rel="alternate" href` también; un XML cualquiera, `''` y HTML dan `null`; un elemento con enlace `javascript:alert(1)` o sin título se descarta; 80 elementos dan 50; un título con `<![CDATA[<b>x</b>]]>` queda como texto `<b>x</b>`.
  - (b) añadir un widget RSS con permiso `pendiente`: «Guardar» pide el permiso, lo concede y guarda; con `denegado` no guarda y avisa; una dirección `ftp://…` o `javascript:…` no se acepta.
  - (c) el widget pinta `cantidad` titulares (5 y 10), cada uno `<a>` con `href` http(s), `target="_blank"` y `rel` con `noopener`; un titular con HTML se ve literal.
  - (d) caché: la primera carga hace una petición y escribe `rss:<id>` en local (no en sync); recargar la página antes de 30 minutos no vuelve a pedir; con la hora de la caché puesta 31 minutos atrás, sí; el botón de recargar fuerza la petición.
  - (e) con el feed caído (`'falla'`) y caché, se muestra la caché con el aviso «No se pudo actualizar»; sin caché, el mensaje de error y el botón de recargar; con una respuesta que tarda más de 8 s (`'lento'`) se corta y se trata como un fallo.
  - (f) con el permiso retirado (`contains` falso) el widget dice «Falta el permiso para este feed» y el botón lo pide.
  - (g) borrar el widget borra `rss:<id>`; «Restablecer todo» borra las `rss:*`.
- [x] **Paso 2:** implementar (`AbortController` con 8 s de límite; `DOMParser` con `application/xml` y comprobación de `parsererror`).
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Widget de RSS».

### Task 5 · Tarea 5: estado de servicios

**Archivos:** crear `js/widgets/servicios.js`, `pruebas/servicios.prueba.mjs`; modificar `pruebas/lib/util.mjs` (opción `servicios`), `js/main.js`, `style.css` (los LEDs).

**Interfaces:**
- Registra `servicios` («Estado de servicios», `w` 6, `h` 6, configurable, con `alto: c => 1 + clamp(n, 3, 12)` según los enlaces vigilados) con `config: { grupos: string[] | null }` (`null` = todos los grupos locales). Exporta `origenesVigilados(config, datos): { origen: string, enlaces: { nombre: string, grupo: string }[] }[]` (un elemento por origen `protocolo//host:puerto`, de los enlaces `http(s)` de los grupos locales elegidos y visibles —sin los privados en modo reunión—, como mucho 40 orígenes), `patronesDe(origenes: string[]): string[]` (`['http://192.168.1.11/*', …]` sin duplicados), `sondear(origen: string, { espera = 4000 } = {}): Promise<'vivo' | 'caido' | 'desconocido'>` (`fetch(origen + '/', { mode: 'no-cors', cache: 'no-store', credentials: 'omit', signal })`: cualquier respuesta cuenta como `vivo`; si se aborta por el tiempo, `caido`; si falla en `https:` sin haberse abortado, `desconocido` («sin verificar: certificado propio o caída»); si falla en `http:`, `caido`) y `sondearTodos(origenes: string[]): Promise<Record<string, Estado>>` (como mucho 6 a la vez).
- El widget muestra un LED por servicio (`vivo` verde, `caido` rojo, `desconocido` ámbar, `pendiente`/`comprobando` gris) con su nombre y dirección, el resumen «5 de 7 responden · comprobado 12:03» y un botón «Comprobar ahora». Sondea al pintarse y cada 60 s **solo si** el permiso está concedido, la pestaña está visible y el widget no está plegado; al ocultarse la pestaña se detiene y al volver a verse comprueba si el último resultado tiene más de 60 s; al borrar el widget no queda ningún temporizador. Sin permiso muestra «Falta el permiso para comprobar estos sitios» y un botón «Dar permiso» (`chrome.permissions.request({ origins: patronesDe(...) })` dentro del clic). El configurador lista los grupos locales con casillas (todos marcados por defecto) y pide el permiso al guardar, como el de RSS.

- [x] **Paso 1:** ampliar `abrir` con `servicios: { [origen]: 'vivo' | 'cae' | 'cert' | 'cuelga' }` (sustituye `fetch` a esos orígenes: `vivo` responde, `cae` rechaza con `TypeError`, `cert` rechaza solo para `https:`, `cuelga` no responde hasta que se aborta; cuenta las llamadas en `window.__sondeos`), escribir `servicios.prueba.mjs` y ejecutarla → falla:
  - (a) `origenesVigilados` con los datos de prueba: Alfa y Beta dan 7 orígenes distintos (Gamma, privado, se cuenta salvo en modo reunión); con `grupos: ['g-alfa']` solo 4; con 60 enlaces distintos devuelve 40; `patronesDe` no repite hosts.
  - (b) `sondear`: `vivo` si responde, `caido` con `http` que rechaza, `desconocido` con `https` que rechaza, `caido` si no responde en `espera` (se pasa `espera: 300` en la prueba).
  - (c) `sondearTodos` con 20 orígenes que tardan 100 ms no tiene más de 6 llamadas a la vez (`window.__concurrentes` máximo 6).
  - (d) con permiso concedido, el widget pinta un LED por servicio con el estado correcto (verde, rojo, ámbar), el resumen cuenta bien y el LED ámbar tiene `title` «Sin verificar…»; «Comprobar ahora» repite los sondeos.
  - (e) con el permiso `denegado` o `pendiente` no hay ninguna llamada y el widget muestra «Dar permiso»; al pulsarlo con `pendiente` se concede y empiezan los sondeos.
  - (f) con la pestaña oculta (`visibilityState: 'hidden'` simulado) no hay sondeos nuevos pasados 60 s (se acelera el reloj con `Emulation.setVirtualTimePolicy` o un intervalo corto inyectado `novatab.cadaServicios`); al volver a verse, comprueba; con el widget plegado no sondea.
  - (g) borrar el widget detiene los sondeos (`__sondeos` deja de crecer) y en modo reunión los enlaces de grupos privados no se sondean ni se muestran.
  - (h) añadir, configurar (desmarcar un grupo), recargar y borrar el widget.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Widget de estado de servicios».

### Task 6 · Tarea 6: cierre de la fase

- [x] **Paso 1:** `version` 4.6.0 en `manifest.json`; `README.md` (la carpeta `js/widgets/` y los cinco widgets); `empaquetar/LEEME.txt` con los widgets nuevos y la nota de que el estado de servicios y el RSS piden permiso de los sitios que vigilan (es opcional).
- [x] **Paso 2:** comprobar a mano una vez en Chrome real: añadir cada widget, dar los permisos de servicios y de un feed real, y ver un servicio HTTPS autofirmado como «sin verificar».
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar\empaquetar.ps1` → `dist/novatab-4.6.0.zip` con `js/widgets/` completo y sin IPs de redes reales.
- [x] **Paso 4:** marcar la fase 7 en la hoja de ruta y commit «Fase 7 terminada: versión 4.6.0».
