# Fase 0: pruebas, revisión y nombre NovaTab — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, acordada con el usuario). Los pasos usan casillas (`- [ ]`).

**Objetivo:** dejar una red de pruebas automáticas, corregir los fallos conocidos y lo que encuentren `/code-review` y `/security-review`, y renombrar la extensión a NovaTab.

**Arquitectura:** las pruebas son módulos de Node (`pruebas/*.prueba.mjs`) que abren `newtab.html` como archivo en Chrome sin ventana por CDP, cargan unos datos de prueba propios en `localStorage` y comprueban el resultado leyendo el DOM y `localStorage`. Un ejecutor las corre en orden y falla si alguna falla o la página lanza excepciones.

**Tecnología:** Node 22+ (WebSocket nativo), Chrome instalado, cliente CDP sin dependencias (copiado de la skill taste, MIT).

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 0) y las respuestas del usuario: nombre NovaTab en todo; solo enlaces `http:` y `https:`.

## Restricciones globales

- Sin dependencias de npm: `node pruebas/ejecutar.mjs` debe funcionar recién clonado el repositorio.
- Las pruebas no dependen de los datos por defecto: usan sus propios datos (`pruebas/lib/datos-prueba.mjs`).
- Ninguna prueba necesita red salvo las marcadas `red: true`, que se saltan con `--sin-red`.
- Enlaces admitidos: solo `http:` y `https:`; cualquier otro se descarta al normalizar y se rechaza al editar.
- Nombre visible: «NovaTab» en Chrome, README, LEEME y paquete (`dist/novatab-<versión>.zip`).
- Al terminar: `version` 3.3.0 en `manifest.json`, paquete generado, commit y `git push`.

## Revisión: lo que más probablemente falle

1. **Datos guardados con un enlace no http(s):** al normalizar se descarta ese enlace y el resto del grupo queda intacto (prueba en la tarea 3).
2. **Restablecer en modo archivo** (sin `chrome.storage`): también borra las notas de `localStorage` (prueba en la tarea 4).
3. **Prueba que deja Chrome abierto** si falla a medias: el ejecutor cierra el navegador siempre (`finally`) (tarea 2).
4. **Cambio de nombre:** el identificador de la extensión no cambia (no depende del nombre), así que tus datos y los de tus amigos se conservan (comprobado en la tarea 1 con la clave del paquete).
5. **Ventanas de 1000 px o menos:** la cuadrícula se desactiva; las pruebas de arrastre usan 1440×900 para no medir el diseño apilado (tarea 2).

---

### Task 1 · Tarea 1: renombrar a NovaTab

**Archivos:** modificar `manifest.json` (name, default_title, description), `README.md`, `empaquetar/LEEME.txt`, `empaquetar/empaquetar.ps1` (carpeta `dist/novatab`, zip `novatab-<versión>.zip`), `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (título).

- [x] **Paso 1:** sustituir «Mis servicios» por «NovaTab» en esos archivos; descripción del manifest: «Página de nueva pestaña para tus servicios de casa o del trabajo, con buscador y widgets.»
- [x] **Paso 2:** comprobar: `grep -rn "Mis servicios\|mis-servicios" --exclude-dir=.git --exclude-dir=dist .` no devuelve nada.
- [x] **Paso 3:** `powershell -ExecutionPolicy Bypass -File empaquetar\empaquetar.ps1` → `Listo: …\dist\novatab-3.2.0.zip`, y su `manifest.json` lleva la misma `key` que `empaquetar/clave-publica.txt`.
- [x] **Paso 4:** commit «Renombrar la extensión a NovaTab».

### Task 2 · Tarea 2: infraestructura de pruebas y pruebas existentes

**Archivos:** crear `pruebas/lib/cdp.mjs` (copia literal de `.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs` con una línea de atribución MIT), `pruebas/lib/util.mjs`, `pruebas/lib/datos-prueba.mjs`, `pruebas/ejecutar.mjs`, `pruebas/rejilla.prueba.mjs`, `pruebas/plegar.prueba.mjs`, `pruebas/reunion.prueba.mjs`, `pruebas/buscador.prueba.mjs`, `pruebas/opciones.prueba.mjs`, `pruebas/widgets.prueba.mjs`, `pruebas/iconos.prueba.mjs`; añadir la sección «Pruebas» al `README.md`.

**Interfaces:**
- `pruebas/lib/util.mjs` produce `abrir({ ancho = 1440, alto = 900, datos = DATOS_PRUEBA, topSites = null } = {}) → Promise<Pagina>` donde `Pagina = { ev(js): Promise<any>, raton(tipo, x, y), centro(selector): Promise<[x, y]>, arrastrar([x0, y0], [x1, y1], pasos = 10), escribir(texto), tecla(nombre), datos(): Promise<object>, errores: string[], esperar(ms), cerrar() }`. `abrir` limpia `localStorage`, guarda `datos` como `datos` y recarga; con `topSites` inyecta `window.chrome = { topSites: { get } }` antes de cargar.
- `pruebas/lib/datos-prueba.mjs` produce `DATOS_PRUEBA` (version 3): grupos locales «Alfa» (4 enlaces, pos 1,1,6), «Beta» (3 enlaces, pos 7,1,6), «Gamma» (2 enlaces, pos 1,7,6, `privado: true`), y online «Trabajo» (2) y «Ocio» (2, `privado: true`); todas las URLs `http://192.168.1.x`.
- Cada `*.prueba.mjs` exporta `default { nombre, red?: boolean, ejecutar: async (abrir) => void }` y lanza `Error` con un mensaje claro si algo no se cumple.
- `pruebas/ejecutar.mjs` acepta `--sin-red` y un filtro opcional por nombre; imprime `✔`/`✘` por prueba y sale con código 1 si alguna falla o deja errores en la consola de la página.

- [x] **Paso 1:** escribir `cdp.mjs`, `util.mjs`, `datos-prueba.mjs` y `ejecutar.mjs`.
- [x] **Paso 2:** escribir las pruebas, cada una con estas comprobaciones:
  - `rejilla`: arrastrar «Beta» 6 columnas a la izquierda y 7 filas abajo deja `pos` `{x:1, y:≥8}`; el asa del ancho reduce `w` de 6 a 4; un widget de notas arrastrado del panel derecho al izquierdo queda con `panel: 'izq'`.
  - `plegar`: plegar «Alfa» sube «Gamma» de la fila 7 a la 3 y desplegar la devuelve a la 7.
  - `reunion`: con el ojo activo no hay ningún `.grupo` llamado «Gamma» ni «Ocio», escribir un enlace de «Ocio» en el buscador no lo sugiere, y tras recargar el modo sigue activo.
  - `buscador`: escribir el nombre de un enlace de «Beta» lo pone primero; la primera sugerencia de Google con Shift+Enter apunta a `https://www.google.com/search?q=`.
  - `opciones`: el tema «papel», el modo sobrio y ocultar un panel se guardan y siguen tras recargar; no se pueden ocultar los dos paneles.
  - `widgets`: una nota escrita se lee de `localStorage` como `nota:<id>`; el iframe de Spotify es el mismo nodo tras repintar; «Más usadas» con `topSites` simulado excluye los dominios que ya están en grupos.
  - `iconos` (`red: true`): buscar «proxmox» en Apps devuelve `proxmox` y guardarlo deja `icono: {set:'apps', nombre:'proxmox', formato:'svg'}`.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`, código 0.
- [x] **Paso 4:** commit «Pruebas automáticas en Chrome sin ventana».

### Task 3 · Tarea 3: solo enlaces http y https

**Archivos:** modificar `app.js` (normalizar, diálogo de enlace), `newtab.html` (campo URL); crear `pruebas/seguridad.prueba.mjs`.

**Interfaces:** produce `urlSegura(url: string) → boolean` en `app.js` (true solo si `new URL(url).protocol` es `http:` o `https:`).

- [x] **Paso 1:** prueba `seguridad`: datos con un enlace `javascript:alert(1)` y otro `data:text/html,x` en «Alfa» → tras cargar, «Alfa» tiene solo sus enlaces http y `localStorage.datos` no contiene `javascript:` ni `data:`; en el diálogo de enlace, guardar `javascript:alert(1)` no cierra el diálogo y no cambia los datos.
- [x] **Paso 2:** ejecutarla → falla.
- [x] **Paso 3:** implementar `urlSegura`; `normalizar` descarta los enlaces que no la cumplen; el campo URL lleva `pattern="https?://.+"` y el mensaje «Solo direcciones http:// o https://».
- [x] **Paso 4:** `node pruebas/ejecutar.mjs` → todas `✔`.
- [x] **Paso 5:** commit «Solo se aceptan enlaces http y https».

### Task 4 · Tarea 4: «Restablecer todo» en Opciones

**Archivos:** modificar `newtab.html` (quitar `#btn-restaurar`; añadir botón en Opciones y `<dialog id="dlg-restablecer">`), `app.js`, `style.css`; crear `pruebas/restablecer.prueba.mjs`.

**Interfaces:** produce `restablecerTodo() → Promise<void>` en `app.js`: datos por defecto, borra todas las claves `nota:*` (sync, local y `localStorage`) y repinta.

- [x] **Paso 1:** prueba `restablecer`: con una nota guardada, abrir Opciones → «Restablecer todo…»; el botón de confirmar está desactivado hasta escribir exactamente `BORRAR`; al confirmar, los grupos son los de `DATOS_DEFECTO` y no queda ninguna clave `nota:` en `localStorage`.
- [x] **Paso 2:** ejecutarla → falla.
- [x] **Paso 3:** implementar el botón, el diálogo y `restablecerTodo`.
- [x] **Paso 4:** `node pruebas/ejecutar.mjs` → todas `✔`.
- [x] **Paso 5:** commit «Restablecer todo en Opciones, con confirmación escrita».

### Task 5 · Tarea 5: revisión de código y de seguridad

- [x] **Paso 1:** ejecutar `/code-review` y `/security-review` sobre la extensión.
- [x] **Paso 2:** por cada hallazgo confirmado: una prueba que lo reproduce (falla), la corrección y la prueba en verde. Los hallazgos dudosos se consultan con el usuario antes de tocar nada.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit por corrección.

### Task 6 · Tarea 6: cierre de la fase

- [x] **Paso 1:** `version` 3.3.0 en `manifest.json`.
- [x] **Paso 2:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar.ps1` → `dist/novatab-3.3.0.zip` sin IPs de redes reales.
- [x] **Paso 3:** marcar la fase 0 en la hoja de ruta, commit «Fase 0 terminada» y `git push`.
