# Fase 2: deshacer, rehacer y copias automáticas — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases 0 y 1). Los pasos usan casillas (`- [x]`).

**Objetivo:** que un borrado o un cambio por error se pueda deshacer (y rehacer) con Ctrl+Z / Ctrl+Y, y que cada día quede una copia automática recuperable desde Opciones.

**Arquitectura:** `js/historial.js` es una pila pura (sin DOM ni almacenamiento) de «fotos» opacas. `js/edicion.js` hace la foto y la aplica: una foto es `{ datos, notas }`, con los datos completos (grupos con enlaces, widgets, títulos) y el texto de las notas por id de widget. La foto anterior se empuja dentro de `guardar()`, que ya es el único punto por el que pasa cada cambio de datos. `js/copias.js` guarda una foto por día en `storage.local` (`copia:AAAA-MM-DD`) y reutiliza la misma función de aplicar, así que recuperar una copia también se puede deshacer.

**Tecnología:** módulos ES nativos (sin compilación), Node 22+ para las pruebas.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 2) y las respuestas del usuario del 2026-10-23:
- Deshacer incluye **todo**: grupos, enlaces, widgets, nombres de panel, posiciones y notas.
- Las copias van en `storage.local` (decisión delegada).
- El aviso «Grupo borrado · Deshacer» sale **solo al borrar un grupo**.
- Además de Ctrl+Z hay **rehacer** (Ctrl+Y y Ctrl+Mayús+Z).

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado.
- Pila de **20** pasos de deshacer (y los mismos de rehacer), solo en memoria; se pierde al cerrar la pestaña.
- Aviso con botón durante **8 s**.
- Copias: **una por día**, las **7** más recientes, clave `copia:AAAA-MM-DD` (fecha local) en `storage.local`; valor `{ fecha, datos, notas }`.
- Tema y opciones no forman parte de deshacer ni de las copias.
- Los diálogos `confirm()` de borrar enlace y borrar grupo se mantienen tal cual.
- Los datos guardados no cambian de formato: sigue siendo la versión 4.
- Versión final: 4.1.0.

## Revisión: lo que más probablemente falle

1. **Ctrl+Z escribiendo en una nota, el buscador o un campo de diálogo:** debe deshacer el texto del campo, nunca la rejilla (tarea 1).
2. **Borrar un widget de notas y deshacer:** la nota vuelve con su texto, también el escrito después del último guardado de datos (tarea 1).
3. **Llega un cambio de otra pestaña:** la pila se vacía; deshacer aquí nunca pisa lo que otra pestaña acaba de guardar (tarea 1).
4. **Más de 20 cambios seguidos:** solo se pueden deshacer los últimos 20, sin errores (tarea 1).
5. **Restablecer todo:** vacía la pila, porque su diálogo dice «No se puede deshacer» (tarea 1).
6. **Abrir dos veces el mismo día, o con más de 7 copias, o con una copia corrupta guardada:** no se duplica, se borran las más antiguas y la lista ignora lo que no sirva (tarea 3).
7. **Recuperar una copia:** se puede deshacer, y las notas de widgets que ya no existen no quedan huérfanas (tarea 3).

---

### Task 1 · Tarea 1: pila de deshacer y rehacer con Ctrl+Z, Ctrl+Y y Ctrl+Mayús+Z

**Archivos:** crear `js/historial.js`, `pruebas/historial.prueba.mjs`; modificar `js/edicion.js`.

**Interfaces:**
- `historial.js` exporta `crearHistorial(max = 20) → { empujar(foto), deshacer(actual) → foto | null, rehacer(actual) → foto | null, limpiar(), puedeDeshacer(): boolean, puedeRehacer(): boolean }`. `empujar` añade a la pila de deshacer, descarta lo más antiguo si pasa de `max` y vacía la de rehacer. `deshacer(actual)` saca la última foto y guarda `actual` en rehacer; `rehacer(actual)` hace lo contrario.
- `edicion.js` exporta `aplicarEstado(foto) → Promise<void>` (pone `foto.datos` con `normalizar`, borra las notas de widgets que no están en la foto, escribe `foto.notas`, llama a `resolver()`, `pintar()` y guarda **sin** empujar al historial) y `tomarFoto() → Promise<{ datos, notas }>` (copia profunda de `datos` y `leerNotas()`).
- Dentro de `guardar()`: si `JSON.stringify(datos)` difiere de `base` y no se está aplicando un estado, se empuja `{ datos: base, notas: { ...notasUltimas, ...(await leerNotas()) } }`. `notasUltimas` es el resultado de `leerNotas()` justo después de cargar o guardar; así un widget borrado conserva su nota anterior y las notas de los widgets que siguen están al día.
- Atajos en `document` `keydown`: Ctrl o Cmd+Z deshace; Ctrl o Cmd+Y y Ctrl o Cmd+Mayús+Z rehacen. No actúan si el foco está en `input`, `textarea`, `select` o un elemento editable, ni con `ocupado()` verdadero. Llaman a `ev.preventDefault()` solo cuando actúan.
- `cambioDeFuera()`/`recargar()` y `restablecerTodo()` llaman a `limpiar()`.

- [x] **Paso 1:** escribir `historial.prueba.mjs` (abre con `abrir({ chrome: {} })`, `window.confirm = () => true`) con estas comprobaciones y ejecutarla → falla:
  - (a) borrar el grupo «Servidores» con sus enlaces, `pg.tecla('z', 'ctrl')` → el grupo vuelve con los mismos enlaces y la misma `pos`; `pg.tecla('y', 'ctrl')` → vuelve a no estar; Ctrl+Mayús+Z también rehace.
  - (b) mover un grupo con el teclado de la prueba de rejilla y plegar otro: dos Ctrl+Z los deshacen en orden inverso.
  - (c) con un textarea de nota enfocado, Ctrl+Z no cambia `novatab.datos`.
  - (d) añadir un widget de notas, escribir «hola», esperar 2,5 s, borrar el widget y deshacer → el widget vuelve y su textarea contiene «hola».
  - (e) 25 cambios (alternar plegado de un grupo) y 25 Ctrl+Z → solo 20 cambian el estado (el 21.º no hace nada y no lanza error).
  - (f) tras deshacer, un cambio nuevo hace que Ctrl+Y no haga nada.
  - (g) simular un cambio de otra pestaña (`chrome.storage.sync.set` desde la página con el simulador de `chrome-falso.js`, como en `conflictos.prueba.mjs`), esperar a que se recargue → Ctrl+Z no cambia nada.
  - (h) «Restablecer todo» seguido de Ctrl+Z no cambia nada.
- [x] **Paso 2:** implementar `historial.js` y los cambios de `edicion.js` descritos arriba.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`.
- [x] **Paso 4:** commit «Deshacer y rehacer con Ctrl+Z y Ctrl+Y».

### Task 2 · Tarea 2: aviso «Grupo borrado · Deshacer»

**Archivos:** modificar `newtab.html` (`<div id="aviso-accion" class="aviso" role="status" hidden>` con un `<span>` y un `<button type="button">`), `style.css` (el botón con aspecto de enlace dentro del aviso), `js/util.js`, `js/edicion.js`; ampliar `pruebas/historial.prueba.mjs`.

**Interfaces:**
- `util.js` exporta `avisarConAccion(texto, etiqueta, accion, ms = 8000)`: muestra el aviso con el botón `etiqueta`; al pulsarlo llama a `accion()` y lo oculta; se oculta solo a los `ms`; otro aviso lo sustituye.
- `borrarGrupo(gid)` llama tras guardar a `avisarConAccion('Grupo borrado', 'Deshacer', deshacer)`, donde `deshacer` es la misma función que usa Ctrl+Z (exportada desde `edicion.js` como `deshacerUltimo()`).

- [x] **Paso 1:** ampliar la prueba: (a) tras borrar un grupo, `#aviso-accion` visible con el texto «Grupo borrado» y un botón «Deshacer»; pulsarlo recupera el grupo con sus enlaces y posición y oculta el aviso; (b) borrar un enlace suelto no muestra el aviso; (c) sin pulsar nada, el aviso sigue visible a los 7 s y oculto a los 8,5 s. Ejecutar → falla.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Aviso con botón Deshacer al borrar un grupo».

### Task 3 · Tarea 3: copia diaria y recuperación desde Opciones

**Archivos:** crear `js/copias.js`, `pruebas/copias.prueba.mjs`; modificar `newtab.html` (en `#panel-tema`, tras las opciones y antes de «Restablecer todo…»: título «Copias automáticas» y `<ul id="lista-copias">`), `style.css`, `js/main.js`, `js/apariencia.js` (o `copias.js` escuchando el clic de `#btn-tema`) para pintar la lista al abrir el panel.

**Interfaces:**
- `copias.js` exporta:
  - `hacerCopiaDelDia() → Promise<boolean>`: si no existe `copia:<hoy>` guarda `{ fecha, datos, notas }` con `tomarFoto()` y deja solo las 7 `copia:*` con la fecha más reciente (usa `claves('copia:')` y `borrar`); devuelve `true` si creó una.
  - `listarCopias() → Promise<{ fecha: string }[]>`: de la más reciente a la más antigua; ignora las claves cuyo valor no tenga `datos.grupos` como array.
  - `recuperarCopia(fecha) → Promise<void>`: carga la copia, la aplica con `aplicarEstado` empujando antes al historial el estado actual (tarea 1) y muestra `avisarConAccion('Copia del <fecha legible> recuperada', 'Deshacer', deshacerUltimo)`.
- `main.js` llama a `hacerCopiaDelDia()` al final del arranque, solo si ya había datos guardados y sin esperar su resultado (un fallo se ignora).
- La lista de Opciones muestra «Hoy» o la fecha en español (por ejemplo «21 oct») y un botón «Recuperar» por copia; si no hay copias, el texto «Aún no hay copias».

- [x] **Paso 1:** escribir `copias.prueba.mjs` y ejecutarla → falla. Las claves se siembran con `guardados` de `abrir` (fuera de la extensión todo va a `localStorage` con la clave tal cual):
  - (a) al abrir con datos y sin copias, existe `copia:<hoy>` (fecha local `AAAA-MM-DD`) con los grupos y las notas; recargar la página no crea otra ni la reescribe.
  - (b) con 8 copias antiguas sembradas, tras abrir quedan 7 en total y la más antigua desapareció.
  - (c) con una copia sembrada de hace dos días con un solo grupo «Antiguo» y otra corrupta (`{ "basura": 1 }`), la lista muestra «Hoy» y la de hace dos días, sin la corrupta; «Recuperar» deja `novatab.datos.grupos` con solo «Antiguo»; Ctrl+Z devuelve el estado de antes.
  - (d) recuperar una copia sin los widgets de notas actuales no deja claves `nota:*` huérfanas.
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Copia automática diaria y recuperación desde Opciones».

### Task 4 · Tarea 4: cierre de la fase

- [x] **Paso 1:** `version` 4.1.0 en `manifest.json`; `README.md` (estructura con `historial.js` y `copias.js`, y los atajos Ctrl+Z, Ctrl+Y); `empaquetar/LEEME.txt` solo si cita los atajos.
- [x] **Paso 2:** comprobar a mano una vez en la extensión real: borrar un grupo, Deshacer, abrir Opciones y ver «Hoy» en copias.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar\empaquetar.ps1` → `dist/novatab-4.1.0.zip` con `js/historial.js` y `js/copias.js` y sin IPs de redes reales.
- [x] **Paso 4:** marcar la fase 2 en la hoja de ruta y commit «Fase 2 terminada: versión 4.1.0».
