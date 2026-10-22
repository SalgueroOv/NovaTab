# Fase 1: módulos y almacenamiento por grupos — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en la fase 0). Los pasos usan casillas (`- [ ]`).

**Objetivo:** dividir el código en módulos ES con una responsabilidad cada uno y guardar cada grupo en su propia clave, de modo que crecer en enlaces, editar en dos pestañas o escribir notas rápido no pierda datos.

**Arquitectura:** `newtab.html` carga `datos-defecto.js` (script clásico, lo usan también los mockups) y un único módulo `js/main.js`, que importa el resto. Todo acceso a `chrome.storage`/`localStorage` pasa por `js/almacen.js`. El formato v4 guarda la estructura en la clave `datos` y los enlaces de cada grupo en `grupo:<id>`; solo se escriben las claves que cambian. Las pruebas sirven la página por HTTP local (los módulos no cargan desde `file://`) y pueden simular `chrome.storage` para probar cuotas, límites y cambios de otra pestaña.

**Tecnología:** módulos ES nativos (sin compilación), Node 22+ para las pruebas (`node:http` para el servidor local).

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 1), hallazgos #2, #5 y #10 aplazados en la fase 0, y las respuestas del usuario del 2026-10-22:
- Conflictos: **tu edición en curso gana**; lo que llega de fuera mientras editas espera y se aplica al terminar; si se toca lo mismo, gana el último.
- Notas: se guardan **2 s después de dejar de escribir y al salir** de la nota.
- La migración se prueba solo con datos de prueba.

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado.
- Ningún usuario pierde datos: la migración v3→v4 guarda antes una copia en `storage.local` con la clave `respaldo-v3`.
- Formato v4: `datos` = `{ version: 4, titulos, grupos: [{ id, nombre, zona, color, pos, plegado, privado }], widgets }` (sin enlaces) y `grupo:<id>` = array de enlaces `{ id, nombre, url, icono? }`.
- Exportar e importar siguen usando un único JSON con los enlaces dentro de cada grupo (el formato v3), para que las copias antiguas sigan valiendo.
- Las pruebas acceden al estado por `globalThis.novatab` (`{ datos, pintar, DATOS_DEFECTO }`), que solo expone lecturas y `pintar`.
- Versión final: 4.0.0.

## Revisión: lo que más probablemente falle

1. **Una exportación v3 importada en v4** (o una v1/v2): debe cargarse entera, con notas, sin claves huérfanas (tarea 4).
2. **Fallo a mitad de migración** (cuota o límite al escribir v4): los datos v3 siguen intactos y la siguiente apertura reintenta (tarea 4).
3. **Grupo borrado en otra pestaña mientras lo editas aquí:** al guardar no reaparece un grupo fantasma ni falla la página (tarea 5).
4. **Pestaña que se cierra con una nota sin guardar:** se guarda al ocultarse la página (`visibilitychange`) (tarea 6).
5. **Los mockups** siguen abriéndose como archivo porque `datos-defecto.js` sigue siendo un script clásico (tarea 2, comprobado a mano una vez).

---

### Task 1 · Tarea 1: servir las pruebas por HTTP

**Archivos:** crear `pruebas/lib/servidor.mjs`; modificar `pruebas/lib/util.mjs`, `pruebas/ejecutar.mjs`.

**Interfaces:** produce `iniciarServidor(raiz) → Promise<{ url: string, cerrar(): Promise<void> }>` (sirve la raíz del repositorio en `127.0.0.1` con puerto libre y tipos MIME de `.html .js .mjs .css .json .woff2 .svg`); `crearAbrir(navegador, urlBase)` abre `${urlBase}/newtab.html`.

- [ ] **Paso 1:** escribir `servidor.mjs` y adaptar `util.mjs` y `ejecutar.mjs` (un servidor por ejecución, cerrado en `finally`).
- [ ] **Paso 2:** `node pruebas/ejecutar.mjs` → las 11 pruebas `✔` sirviendo por HTTP.
- [ ] **Paso 3:** commit «Pruebas servidas por HTTP local».

### Task 2 · Tarea 2: dividir en módulos ES sin cambiar el comportamiento

**Archivos:** crear `js/util.js`, `js/datos.js`, `js/almacen.js`, `js/rejilla.js`, `js/pintado.js`, `js/edicion.js`, `js/buscador.js`, `js/apariencia.js`, `js/main.js`; mover `widgets.js` → `js/widgets.js` e `iconos.js` → `js/iconos.js`; borrar `app.js`; modificar `newtab.html`, `empaquetar/empaquetar.ps1` (copia `js/`), `README.md` (estructura) y las pruebas que usan `datos`, `pintar()` o `DATOS_DEFECTO` de la página.

**Interfaces (lo que se exporta):**
- `util.js`: `$`, `$$`, `crear`, `svg`, `nuevoId`, `limitar`, `partes`, `direccion`, `dominio`, `urlSegura`, `avisar`.
- `datos.js`: `estado` (objeto vivo `{ datos, editando, arrastre, opciones }`), `normalizar`, `posValida`, `VERSION`, `COLUMNAS`, `ANCHO_MINIMO`, `ANCHO_NUEVO`, `ALTO_MINIMO`, `ALTO_MAXIMO`, `TITULOS`, `gruposDe`, `grupo`.
- `almacen.js`: `leer(clave)`, `escribir(clave, valor)`, `borrar(claves)`, `claves(prefijo)`, `alCambiar(fn)` (en la tarea 2 con el comportamiento actual).
- `rejilla.js`: `bloques`, `bloque`, `panelDe`, `bloquesDe`, `visible`, `alto`, `solapan`, `colocarSinPosicion`, `resolver`, `rejillaActiva`, `REJILLAS`.
- `pintado.js`: `pintar`, `pintarLocal`, `icono`, `botonPlegar`; `edicion.js`: `guardarYPintar`, `ponerEdicion` y los manejadores; `buscador.js`, `apariencia.js` (temas, opciones, fondo, reloj), `widgets.js` (`WIDGETS`, `pintarWidget`, `accionDeWidget`, `nuevoWidget`, `leerNotas`, `escribirNotas`, `memoriaNotas`, `notasGuardadas`), `iconos.js` (`iconoValido`, `pintarIconoElegido`, `elegirIcono`, `refrescarCampoIcono`, `leerIcono`).
- `main.js`: arranque y `globalThis.novatab = { get datos() {…}, pintar, DATOS_DEFECTO }`.
- Duplicados eliminados (hallazgo #10): `claveSitio` usa `partes`; `refrescarCampoIcono` usa `leerIcono`; `leerCache`/`escribirCache`/`borrarNota` usan `almacen.js`.

- [ ] **Paso 1:** adaptar las pruebas a `novatab.datos` / `novatab.pintar()` / `novatab.DATOS_DEFECTO`; ejecutarlas → fallan (aún no existe `novatab`).
- [ ] **Paso 2:** crear los módulos moviendo el código tal cual, sin cambiar lógica salvo los duplicados de #10.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → 11 `✔`; `grep -rn "app.js" newtab.html empaquetar README.md` no devuelve nada.
- [ ] **Paso 4:** abrir `mockups/b-topografico.html` como archivo una vez y comprobar que pinta los grupos.
- [ ] **Paso 5:** commit «Dividir el código en módulos ES».

### Task 3 · Tarea 3: simulador de chrome.storage y almacenamiento robusto

**Archivos:** crear `pruebas/lib/chrome-falso.js` (se inyecta antes de cargar la página), `pruebas/almacen.prueba.mjs`; modificar `js/almacen.js`, `pruebas/lib/util.mjs` (opción `chrome: { cuotaPorClave = 8192, escriturasPorMinuto = 120 }`).

**Interfaces:**
- `chrome-falso.js` define `chrome.storage.sync` y `chrome.storage.local` (`get`, `set`, `remove`, `getBytesInUse`) y `chrome.storage.onChanged`, con errores cuyo mensaje contiene `QUOTA_BYTES_PER_ITEM` o `MAX_WRITE_OPERATIONS_PER_MINUTE` como los reales, y `globalThis.__chromeFalso = { remoto(area, clave, valor), escrituras(area) }` para simular otra pestaña y contar escrituras.
- `almacen.js`: `leer` prefiere la copia de `local` si existe (solo existe como respaldo de una escritura en sync que falló) y si no, `sync`; `escribir` intenta sync; con `QUOTA_BYTES_PER_ITEM` guarda en local, avisa una vez y no reintenta; con `MAX_WRITE_OPERATIONS_PER_MINUTE` guarda en local y reintenta en sync a los 60 s; cuando sync acepta, borra la copia local.

- [ ] **Paso 1:** prueba `almacen`: (a) un valor de 9 KB acaba en local y aparece el aviso una vez; (b) con `escriturasPorMinuto: 2`, la tercera escritura queda en local, `leer` devuelve el valor nuevo y, tras adelantar el reintento, el valor está en sync y no en local.
- [ ] **Paso 2:** ejecutarla → falla.
- [ ] **Paso 3:** implementar en `almacen.js`.
- [ ] **Paso 4:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Almacenamiento: respaldo local y reintento ante el límite de escrituras».

### Task 4 · Tarea 4: formato v4 por grupos y migración con respaldo

**Archivos:** modificar `js/datos.js` (`VERSION = 4`), `js/almacen.js` (`cargarDatos()`, `guardarDatos(datos)`), `js/edicion.js` (exportar/importar en formato v3); crear `pruebas/migracion.prueba.mjs`, `pruebas/lib/datos-v3.mjs` (datos v3 con 5 grupos, 3 widgets, 2 notas, grupos plegados y privados).

**Interfaces:** `cargarDatos() → Promise<datos con enlaces dentro de cada grupo>` (lee v4, o v3/v2/v1 y migra); `guardarDatos(datos) → Promise<void>` escribe `datos` sin enlaces y solo las claves `grupo:<id>` cuyo contenido cambió desde la última escritura, y borra las de grupos eliminados.

- [ ] **Paso 1:** prueba `migracion`: (a) con datos v3 en sync, al abrir se guardan `respaldo-v3` en local, `datos` v4 sin enlaces y un `grupo:<id>` por grupo, y la página muestra los mismos grupos, enlaces, posiciones, widgets y notas; (b) mover un grupo escribe `datos` y ninguna clave `grupo:`; editar un enlace escribe solo su `grupo:<id>` y no `datos`; (c) 200 enlaces repartidos en 4 grupos se guardan y recargan iguales; (d) si la migración falla por cuota, `datos` sigue en v3 y la siguiente apertura reintenta; (e) importar una exportación v3 deja el formato v4.
- [ ] **Paso 2:** ejecutarla → falla.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Formato v4: un grupo por clave, con migración y respaldo».

### Task 5 · Tarea 5: cambios de otra pestaña sin perder tu edición

**Archivos:** modificar `js/main.js` (escucha de cambios), `js/edicion.js`; crear `pruebas/conflictos.prueba.mjs`.

**Interfaces:** `ocupado() → boolean` en `edicion.js`: hay un diálogo abierto, un arrastre o un título en edición. Mientras está ocupado, los cambios recibidos se acumulan; al dejar de estarlo se recargan de almacenamiento (`cargarDatos`) y se repinta. Los cambios propios se reconocen comparando con lo último escrito y se ignoran.

- [ ] **Paso 1:** prueba `conflictos`: (a) sin editar, un cambio remoto en `grupo:g-beta` se ve al momento; (b) con el diálogo de un enlace de Alfa abierto, llega un cambio remoto que renombra un enlace de Beta; al guardar el diálogo, están los dos cambios; (c) con el diálogo de Alfa abierto, otra pestaña borra el grupo Gamma; al guardar, Gamma no reaparece y no hay errores; (d) los cambios propios no provocan un repintado extra (el iframe de Spotify conserva su marca).
- [ ] **Paso 2:** ejecutarla → falla.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Los cambios de otra pestaña esperan a que termines de editar».

### Task 6 · Tarea 6: notas cada 2 segundos

**Archivos:** modificar `js/widgets.js`; ampliar `pruebas/widgets.prueba.mjs`.

- [ ] **Paso 1:** prueba: escribir en una nota 10 veces seguidas en 1,5 s produce 0 escrituras a los 1,5 s y 1 escritura a los 2,5 s; ocultar la página (`visibilitychange`) con texto pendiente lo guarda al momento.
- [ ] **Paso 2:** ejecutarla → falla.
- [ ] **Paso 3:** espera de 2 000 ms y guardado en `visibilitychange` cuando `document.visibilityState === 'hidden'`.
- [ ] **Paso 4:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Notas: guardado 2 s después de dejar de escribir».

### Task 7 · Tarea 7: cierre de la fase

- [ ] **Paso 1:** `version` 4.0.0; `README.md` (estructura con `js/`) y `empaquetar/LEEME.txt` sin cambios de uso.
- [ ] **Paso 2:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar.ps1` → `dist/novatab-4.0.0.zip` con la carpeta `js/` y sin IPs de redes reales.
- [ ] **Paso 3:** marcar la fase 1 en la hoja de ruta y commit «Fase 1 terminada: versión 4.0.0».
