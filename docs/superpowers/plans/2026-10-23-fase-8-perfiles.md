# Fase 8: perfiles — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases anteriores). Los pasos usan casillas (`- [ ]`).

**Objetivo:** varios perfiles (Trabajo, Casa, Demo…), cada uno con sus grupos, widgets, notas, tareas y aspecto, con cambio rápido desde la cabecera y desde Ctrl+K; el modo reunión pasa a ser el perfil Demo.

**Arquitectura:** un registro `perfiles` (sync) lista los perfiles; cada perfil guarda su estructura en `perfil:<id>:datos` y su aspecto (tema, fondo, acento, densidad, esquinas, reloj, paneles ocultos, ancho del separador, modo sobrio, fondo de grupos) en `perfil:<id>:aspecto`. Los grupos, notas, tareas y cachés siguen en `grupo:<id>`, `nota:<id>`, `tareas:<id>` y `rss:<id>`: sus ids son únicos en toda la cuenta, así que no cambian. La clave `opciones` queda solo con lo común (`{ buscador }`). El perfil activo es de cada equipo (`storage.local`). Todo lo que borraba claves «que sobraban» (grupos, notas, tareas) pasa a contar los ids de todos los perfiles.

**Tecnología:** módulos ES nativos (sin compilación), Node 22+ para las pruebas.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 8) y las respuestas del usuario del 2026-10-23:
- **Alcance:** por perfil, grupos, widgets (con notas y tareas) y aspecto; común, el buscador (motor, atajos, sugerencias) y las copias.
- **Reunión:** el ojo cambia al perfil Demo y vuelve al anterior; Demo es un perfil normal que nace como copia del actual sin los grupos privados.
- **Perfil activo:** por equipo; un perfil nuevo nace vacío (con el ejemplo inicial) con la opción de duplicar el actual.
- **Interfaz:** selector junto al título del panel derecho y entradas «Perfil: X» en Ctrl+K; hasta 8 perfiles.

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado (tarda ya unos 9 minutos: se ejecutan pruebas sueltas mientras se trabaja y la suite entera al cerrar cada tarea grande).
- Registro `perfiles`: `{ version: 5, lista: [{ id: string, nombre: string, demo?: true }] }`, de 1 a 8 perfiles, nombres de 1 a 30 caracteres, ids únicos (`principal` el primero; `demo` el de Demo; los demás `p` + 8 caracteres). Solo puede haber un perfil con `demo: true`.
- Claves por perfil: `perfil:<id>:datos` (lo que hoy guarda `datos`, incluidos `ajenos`) y `perfil:<id>:aspecto` (`{ tema, sobrio, fondoGrupos, ocultos, anchoIzq, apariencia }`). `opciones` pasa a `{ buscador }`.
- Perfil activo del equipo: `storage.local` clave `perfil-activo`; si falta o no existe, el primero de la lista. El perfil desde el que se pasó a Demo se recuerda en `perfil-anterior` (local).
- Las imágenes de fondo propias siguen siendo una sola por equipo (`fondo-imagen`): cada perfil elige `fondo: 'imagen'` o no.
- Un grupo es `privado` como hasta ahora; se oculta (pintura, buscador, paleta, Alt+n, estado de servicios) **solo en el perfil Demo**. `opciones.reunion` desaparece.
- Un perfil nuevo vacío usa `normalizar(DATOS_DEFECTO)` con `grupos` y `widgets` nuevos ids; duplicar copia grupos, enlaces, widgets, notas y tareas **con ids nuevos** (si no, dos perfiles compartirían claves `grupo:<id>`/`nota:<id>`).
- Demo nace como copia del perfil actual (con ids nuevos) **sin los grupos privados** y solo con los widgets de tipo `tiempo`, `relojMundial` y `cuentaAtras` (los demás podrían enseñar contenido personal: notas, tareas, agenda, webs más visitadas, servicios, feeds). Su aspecto es el del perfil de origen.
- Cada operación que borra (un perfil, huérfanas) cuenta los ids de **todos** los perfiles: `idsDeTodosLosPerfiles(): Promise<{ grupos: Set<string>, widgets: Set<string> }>`.
- Copias automáticas por perfil: clave `copia:<perfil>:<AAAA-MM-DD>`, las 7 últimas de cada perfil; la lista de Opciones muestra las del perfil activo. Las copias antiguas (`copia:<fecha>`) pasan a `principal` en la migración.
- Exportar e importar siguen siendo del perfil activo, con el mismo formato JSON que hasta ahora.
- Al cambiar de perfil se vacía el historial de deshacer y se guardan los cambios pendientes antes.
- La migración v4→v5 es segura: antes de tocar nada se guarda `respaldo-v4` (local) con los valores de `datos`, `tema` y `opciones`; las claves antiguas solo se borran tras comprobar que las nuevas se leen igual.
- Interfaz en español; los nombres de perfil se pintan con `textContent`.
- Versión final: 5.0.0.

## Revisión: lo que más probablemente falle

1. **La migración con datos v4 reales** (grupos, notas, tareas, widgets de todos los tipos, aspecto, copias antiguas): el perfil `principal` queda exactamente igual y nada se pierde ni se duplica; si algo falla a medias, la siguiente apertura reintenta sin dañar (tarea 1).
2. **Guardar un perfil borra grupos, notas o tareas de otro:** la limpieza de claves que sobran solo toca lo que ya no está en ningún perfil (tarea 3).
3. **Duplicar o crear Demo comparte ids con el original:** editar uno cambiaría el otro (tarea 4).
4. **Cambiar de perfil con cosas a medias:** una nota sin guardar, una tarea pendiente, un diálogo abierto, un arrastre, una descarga de RSS: no se pierde ni se guarda en el perfil equivocado (tarea 4).
5. **Borrar el perfil activo, el único perfil o el de otro equipo mientras está abierto:** siempre queda uno, el equipo salta a un perfil válido y no quedan claves huérfanas (tarea 4).
6. **Dos equipos con distinto perfil activo editando a la vez, y cambios de `perfiles` llegados de fuera** (renombrar, borrar, crear): el selector se actualiza sin pisar lo que se edita (tareas 4 y 5).
7. **Ojo / Demo:** ni la pintura, ni el buscador, ni la paleta, ni Alt+n, ni el estado de servicios muestran grupos privados en Demo; volver al perfil anterior deja todo como estaba, aunque el perfil anterior se haya borrado entre medias (tarea 6).
8. **Datos de una versión anterior que sigue instalada en otro equipo:** al reaparecer `datos`/`tema` antiguos no se interpretan como un perfil nuevo ni se pisa lo ya migrado (tarea 1).
9. **Copias:** recuperar una copia afecta solo al perfil activo y se puede deshacer; una copia antigua sin perfil se atribuye a `principal` (tarea 7).
10. **Límites:** más de 8 perfiles, nombres vacíos o larguísimos o con HTML, y dos perfiles con el mismo nombre (tarea 4).

---

### Task 1 · Tarea 1: el registro de perfiles, las claves por perfil y la migración

**Archivos:** crear `js/perfiles.js`, `pruebas/perfiles-migracion.prueba.mjs`; modificar `js/almacen.js` (`cargarDatos`, `guardarDatos`), `js/main.js` (arranque), `js/datos.js` si hace falta; ajustar `pruebas/lib/util.mjs` solo si las pruebas necesitan sembrar claves nuevas.

**Interfaces:**
- `perfiles.js` exporta: `claveDatos(id) → 'perfil:<id>:datos'`, `claveAspecto(id) → 'perfil:<id>:aspecto'`, `leerRegistro(): Promise<Registro | null>`, `guardarRegistro(r): Promise<void>` (sync, recordando su eco como `guardarDatos`), `perfilActivo(): string` (el id en memoria), `ponerPerfilActivo(id): Promise<void>` (escribe `perfil-activo` en local), `perfilesDeLaLista(): Perfil[]`, `esDemo(): boolean` (el activo tiene `demo: true`) y `migrar(): Promise<'ya-estaba' | 'migrado' | 'nuevo'>`.
- `almacen.js`: `cargarDatos(perfil)` y `guardarDatos(datos, perfil)` usan `claveDatos(perfil)`; los grupos siguen en `grupo:<id>`. `guardarDatos` borra solo los grupos que **estaban en la estructura anterior de este perfil** y ya no están (no «todos los `grupo:*` que sobran»).
- `migrar()`: si existe `perfiles`, devuelve `'ya-estaba'` (aunque reaparezcan claves antiguas: se ignoran). Si no existe pero hay `datos` (v1 a v4), guarda `respaldo-v4`, crea el registro con `principal` («Principal»), copia `datos` → `perfil:principal:datos` (pasando por la migración de v1-v3 de `normalizar` si hace falta), construye `perfil:principal:aspecto` desde `tema` y `opciones` (sin `reunion` ni `buscador`), deja `opciones` con solo `{ buscador }`, y renombra cada `copia:<fecha>` a `copia:principal:<fecha>`; solo después de leer de vuelta lo escrito borra `datos` y `tema`. Si no hay nada, crea el registro con `principal` y los datos de ejemplo (`'nuevo'`).
- El arranque (`main.js`) llama a `migrar()`, lee el perfil activo y carga sus datos; el resto del arranque no cambia.

- [ ] **Paso 1:** escribir `perfiles-migracion.prueba.mjs` (con `abrir({ chrome: {}, datos: <v4>, guardados })`) y ejecutarla → falla:
  - (a) con datos v4 (3 grupos con enlaces, un widget de notas con su nota, uno de tareas con 2 tareas, `opciones` con `apariencia.acento`, `sobrio: true`, `ocultos: { izq: true }`, `buscador.motor: 'bing'`, `tema: 'papel'` y una copia `copia:2026-10-20`): tras abrir existe `perfiles` con un solo perfil `principal`; `perfil:principal:datos` y `perfil:principal:aspecto` tienen lo esperado; `opciones` es solo `{ buscador: { motor: 'bing', … } }`; `datos` y `tema` ya no están; `copia:principal:2026-10-20` existe y `copia:2026-10-20` no; `respaldo-v4` (local) tiene los valores antiguos; la página muestra los mismos grupos, enlaces, notas, tareas, tema y acento.
  - (b) abrir dos veces seguidas no migra dos veces ni duplica nada (`migrar()` da `'ya-estaba'`); si reaparecen `datos` y `tema` antiguos (otro equipo con la versión vieja) se ignoran y no se tocan los perfiles.
  - (c) sin ningún dato guardado se crea `principal` con el ejemplo inicial (`'nuevo'`).
  - (d) un fallo simulado al escribir el registro (el interruptor de `chrome-falso`) deja las claves antiguas intactas y la siguiente apertura migra.
  - (e) guardar un cambio en `principal` escribe solo sus claves y las de sus grupos que cambian (`__chromeFalso.escritas()`), y con dos perfiles sembrados a mano en el registro, guardar uno no borra los `grupo:*` del otro.
  - (f) con datos v1, v2 y v3 sembrados, la migración también llega a `principal` y la página los muestra.
- [ ] **Paso 2:** implementar. Las pruebas existentes (que siembran `datos`) deben seguir pasando: pasan por esta migración.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔` (se ejecuta en segundo plano); commit «Perfiles: registro, claves por perfil y migración».

### Task 2 · Tarea 2: el aspecto de cada perfil

**Archivos:** modificar `js/apariencia.js`, `js/main.js`; crear `pruebas/perfiles-aspecto.prueba.mjs`.

**Interfaces:**
- `apariencia.js` exporta `leerAspecto(id): Promise<Aspecto>` y `aplicarAspecto(aspecto): void` (tema, sobrio, fondoGrupos, ocultos, anchoIzq, apariencia: lo que hoy hace `ponerTema` + `ponerOpciones`). `guardarOpciones()` escribe `opciones` (solo `{ buscador }`) y `perfil:<activo>:aspecto`; elegir un tema escribe en el aspecto del perfil activo (no en `tema`). `OPCIONES` pierde `reunion`; `ponerOpciones` sigue aceptando un objeto con `reunion` y lo ignora.
- `main.js`: los avisos de cambio de `perfil:<activo>:aspecto` y de `opciones` se tratan como los de `tema` y `opciones` hasta ahora (eco propio, `recibirEco`, retención mientras se arrastra); los de otros perfiles se ignoran.

- [ ] **Paso 1:** escribir la prueba y ejecutarla → falla:
  - (a) cambiar el tema, el acento, el fondo, la densidad y ocultar un panel escribe en `perfil:principal:aspecto` y no en `tema` ni `opciones` (salvo `buscador`); cambiar el motor escribe en `opciones`.
  - (b) con dos perfiles sembrados con aspectos distintos, al abrir con cada uno como activo se ve su tema y su acento.
  - (c) un cambio remoto de `perfil:principal:aspecto` se aplica; uno de `perfil:otro:aspecto` no cambia nada; los ecos propios no parpadean (reutiliza la prueba de arrastre del acento de la fase 4).
  - (d) el separador, el modo sobrio y «fondo de color en los grupos» se guardan por perfil.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** pruebas de apariencia, fondos, separador, buscador y opciones → `✔`; commit «Perfiles: el aspecto es de cada perfil».

### Task 3 · Tarea 3: la limpieza de huérfanas cuenta todos los perfiles

**Archivos:** modificar `js/perfiles.js` (`idsDeTodosLosPerfiles`), `js/edicion.js` (`aplicarDentro`, importar, `restablecerTodo`, `borrarNotas`), `js/widgets/tareas-datos.js` (`borrarTareas`), `js/widgets/rss.js` (borrado), `js/copias.js`; crear `pruebas/perfiles-huerfanas.prueba.mjs`.

**Interfaces:**
- `idsDeTodosLosPerfiles()` lee la estructura de cada perfil de la lista y devuelve los ids de grupos y de widgets (de cada tipo) de todos. `borrarNotas(conservar)` y `borrarTareas(conservar)` reciben ahora siempre la unión de los ids del estado nuevo y los de **los otros perfiles**; `restablecerTodo` restablece **solo el perfil activo** (sus claves) y deja los demás; la limpieza de `rss:*` también.

- [ ] **Paso 1:** escribir la prueba (dos perfiles sembrados con notas, tareas, caché de RSS y grupos propios) y ejecutarla → falla:
  - (a) deshacer, importar un JSON y «Restablecer todo» en un perfil no tocan las claves `nota:*`, `tareas:*`, `rss:*` ni `grupo:*` del otro.
  - (b) lo propio sigue limpiándose: importar sin un widget de notas borra su `nota:*`; deshacer la creación de un widget borra sus claves.
  - (c) «Restablecer todo» deja el perfil activo con el ejemplo inicial y el otro intacto (el texto del diálogo se ajusta: «Restablecer este perfil»).
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** pruebas de tareas, historial, copias, importar y restablecer → `✔`; commit «Perfiles: la limpieza de claves cuenta todos los perfiles».

### Task 4 · Tarea 4: crear, duplicar, renombrar, borrar y cambiar de perfil

**Archivos:** modificar `js/perfiles.js`, `js/edicion.js` (flujo de cambio), `js/main.js`; crear `pruebas/perfiles-operaciones.prueba.mjs`.

**Interfaces:**
- `perfiles.js` exporta `crearPerfil(nombre, { duplicar = false } = {}): Promise<string>` (id del nuevo; falla con `Error('Máximo 8 perfiles')` o `Error('Nombre no válido')`), `renombrarPerfil(id, nombre)`, `borrarPerfil(id)` (no deja la lista vacía; borra `perfil:<id>:*`, sus `grupo:`, `nota:`, `tareas:` y `rss:`; si era el activo, cambia al primero), `cambiarPerfil(id)` y `copiarContenido(origen: Perfil, opciones?: { sinPrivados, tipos })` (para duplicar y Demo; devuelve estructura, notas y tareas con ids nuevos).
- `cambiarPerfil(id)`: espera a la cola de guardado y guarda lo pendiente (`volcar` de notas y tareas, aspecto diferido), vacía el historial (`limpiarHistorial`), cierra el diálogo de enlace o grupo si lo hubiera… no: si hay un diálogo, un arrastre o un título a medio escribir (`ocupado()`), espera a que acabe; escribe `perfil-activo`; carga `cargarDatos(id)` y el aspecto; `ponerDatos`, `resolver`, `pintar`, `aplicarAspecto`; limpia los mapas en memoria de notas y tareas de widgets que ya no están en pantalla.
- Un aviso de cambio de `perfiles` (otro equipo) actualiza la lista; si el activo ya no existe, `cambiarPerfil` al primero y `avisar('Ese perfil se borró en otro equipo')`.
- Nombre: se recorta, sin espacios sobrantes, de 1 a 30 caracteres; dos perfiles pueden llamarse igual (se distinguen por el orden), pero crear/duplicar con un nombre repetido añade « (2)».

- [ ] **Paso 1:** escribir la prueba y ejecutarla → falla:
  - (a) crear un perfil vacío: aparece en la lista con el ejemplo inicial y sus grupos y widgets tienen ids nuevos (ninguno coincide con los del perfil actual); cambiar a él y volver deja `principal` **idéntico** (`JSON` de los datos, notas, tareas y aspecto antes y después).
  - (b) duplicar el actual: mismos nombres, enlaces, widgets, notas y tareas con ids **distintos**; editar un enlace, una nota o una tarea en el duplicado no cambia el original (comprobado en el almacenamiento), y viceversa.
  - (c) cambiar de perfil con una nota recién escrita (sin pasar los 2 s) y una tarea añadida hace menos de 400 ms: ambas están guardadas en el perfil que se dejó, y no aparecen en el nuevo; el historial queda vacío (Ctrl+Z no hace nada).
  - (d) con un diálogo abierto, el cambio de perfil espera a que se cierre; con un arrastre a medias, también.
  - (e) renombrar (con `<b>` y `&`) se ve literal; nombre vacío o de 80 caracteres: el vacío se rechaza y el largo se recorta a 30; un nombre repetido añade « (2)».
  - (f) borrar un perfil borra todas sus claves (`perfil:<id>:*`, `grupo:*`, `nota:*`, `tareas:*`, `rss:*` propios) y ninguna de otro; borrar el activo cambia al primero; borrar el único perfil es imposible; el perfil activo borrado desde otro equipo (`__chromeFalso.remoto`) hace saltar a un perfil válido con aviso.
  - (g) crear un noveno perfil falla con «Máximo 8 perfiles».
  - (h) cada equipo tiene su perfil activo: dos páginas con el mismo almacenamiento sync y distinto `perfil-activo` local se mantienen en el suyo.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔` (en segundo plano); commit «Perfiles: crear, duplicar, renombrar, borrar y cambiar».

### Task 5 · Tarea 5: selector en la cabecera y Ctrl+K

**Archivos:** modificar `newtab.html` (un `<button id="btn-perfil" aria-haspopup="menu" aria-expanded="false">` junto al título del panel derecho y un menú `<div id="menu-perfiles" role="menu" hidden>`, más `<dialog id="dlg-perfil">` para nombre y «duplicar el actual»), `style.css`, `js/comandos.js`; crear `js/selector-perfiles.js` (importado desde `main.js`), `pruebas/perfiles-interfaz.prueba.mjs`.

**Interfaces:**
- El botón muestra el nombre del perfil activo (truncado con puntos suspensivos; título completo en `title`). El menú lista los perfiles (el activo marcado con `aria-checked`) y, en modo edición o siempre, «Nuevo perfil…», «Duplicar este perfil…», «Renombrar…» y «Borrar…» (con `confirm`; no disponible si solo hay uno). Esc o clic fuera lo cierran; ↑ ↓ Enter lo recorren.
- `comandos.js` añade «Perfil: <nombre>» (uno por perfil, el activo con su título «Perfil: X (actual)», que no hace nada) tras los temas.

- [ ] **Paso 1:** escribir la prueba y ejecutarla → falla:
  - (a) con dos perfiles, el botón muestra el nombre del activo; abrir el menú lista los dos; elegir el otro cambia la página (grupos y tema distintos) y el botón.
  - (b) «Nuevo perfil…» abre el diálogo; con «duplicar» marcado el nuevo perfil tiene los grupos del actual; sin marcar, el ejemplo inicial; con 8 perfiles la opción avisa.
  - (c) renombrar y borrar desde el menú funcionan (el borrado con `confirm`); con un solo perfil, «Borrar…» no está.
  - (d) navegación por teclado: ↓ ↓ Enter elige el tercer elemento; Esc cierra y devuelve el foco al botón; clic fuera cierra.
  - (e) Ctrl+K, escribir «perfil casa», Enter cambia a «Casa»; el título de un perfil con `<b>` sale literal; el actual no hace nada.
  - (f) un cambio del registro desde otro equipo (nuevo perfil, renombrado) actualiza el menú y el botón sin cerrar un diálogo abierto.
  - (g) con ventana estrecha (900 px) el botón sigue visible y no desborda; el menú cabe en pantalla.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs paleta`, `perfiles-interfaz` → `✔`; commit «Perfiles: selector en la cabecera y en Ctrl+K».

### Task 6 · Tarea 6: el perfil Demo y el ojo

**Archivos:** modificar `js/perfiles.js` (`irADemo`, `volverDeDemo`), `js/rejilla.js` (`visible`), `js/apariencia.js` (el botón del ojo), `js/comandos.js` (el comando de reunión), `js/atajos.js`, `js/widgets/servicios.js`, `js/buscador.js` si usa `visible`; actualizar `pruebas/reunion.prueba.mjs`, `pruebas/atajos.prueba.mjs`, `pruebas/paleta.prueba.mjs` y `pruebas/servicios.prueba.mjs` (las partes con `opciones.reunion` pasan a activar el perfil Demo con el ojo); crear `pruebas/perfiles-demo.prueba.mjs`.

**Interfaces:**
- `visible(b)` = `!(esDemo() && b.privado)`. El botón del ojo (`#btn-reunion`) tiene `aria-pressed` verdadero cuando el activo es Demo; al pulsarlo: si no está en Demo, guarda el activo en `perfil-anterior` y cambia a Demo (creándolo la primera vez con `copiarContenido(actual, { sinPrivados: true, tipos: ['tiempo', 'relojMundial', 'cuentaAtras'] })` y nombre «Demo»); si está en Demo, vuelve a `perfil-anterior` (si ya no existe, al primer perfil que no sea Demo). El título dice «Modo reunión: pasar al perfil Demo» o «Salir del modo reunión: volver a <nombre>». El comando de la paleta «Modo reunión: activar/desactivar» hace lo mismo.
- Al crearse, Demo se ve como el perfil de origen pero sin los grupos privados; después se edita como cualquier perfil. Un grupo marcado `privado` dentro de Demo se oculta igual.
- `opciones.reunion` y su aviso «Ningún grupo es privado todavía» desaparecen del código; el aviso pasa a mostrarse al crear Demo cuando ningún grupo del perfil de origen era privado («Ningún grupo era privado: Demo es una copia completa»).

- [ ] **Paso 1:** escribir `perfiles-demo.prueba.mjs`, actualizar las cuatro pruebas existentes y ejecutarlas → fallan:
  - (a) el ojo crea Demo la primera vez: sin los grupos `privado` (Gamma, Ocio) ni widgets de notas, tareas, calendario, spotify, más usadas, servicios o RSS; con los de tipo `tiempo`, `relojMundial` y `cuentaAtras`; con ids nuevos; con el aspecto del perfil de origen; el botón queda `aria-pressed="true"`.
  - (b) pulsar otra vez vuelve al perfil de antes, idéntico (datos, notas, tareas, aspecto); la segunda vez no vuelve a crear Demo (se conserva lo editado en él).
  - (c) en Demo, un grupo con `privado: true` no se pinta, no sale en el buscador, la paleta ni en Alt+n, y el estado de servicios no lo vigila; en cualquier otro perfil los privados se ven.
  - (d) si el perfil anterior se borra desde otro equipo estando en Demo, el ojo vuelve a un perfil válido.
  - (e) con ningún grupo privado, el aviso «Ningún grupo era privado…».
  - (f) migración: un `opciones.reunion: true` antiguo no deja al usuario atrapado en un modo que ya no existe (el perfil activo es `principal`).
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** pruebas de reunión, atajos, paleta, servicios y `perfiles-demo` → `✔`; commit «Perfiles: Demo sustituye al modo reunión».

### Task 7 · Tarea 7: copias automáticas por perfil

**Archivos:** modificar `js/copias.js`; crear `pruebas/perfiles-copias.prueba.mjs`; ajustar `pruebas/copias.prueba.mjs`.

**Interfaces:**
- `hacerCopiaDelDia()` guarda `copia:<activo>:<hoy>` y conserva las 7 últimas **de ese perfil**; `listarCopias()` devuelve las del perfil activo; `recuperarCopia(fecha)` la aplica al perfil activo y se puede deshacer; una clave antigua `copia:<fecha>` (de antes de la migración) se trata como de `principal`.

- [ ] **Paso 1:** ajustar `copias.prueba.mjs` a las claves nuevas, escribir la prueba y ejecutarlas → fallan:
  - (a) con dos perfiles, abrir cada uno el mismo día crea una copia de cada uno; la lista de Opciones muestra solo las del activo.
  - (b) 8 copias de un perfil dejan 7 y no tocan las del otro.
  - (c) recuperar una copia de «Casa» estando en «Casa» restaura sus grupos, notas y tareas y deja `principal` intacto; Ctrl+Z lo deshace.
  - (d) una copia antigua con la clave `copia:2020-01-01` aparece en `principal`.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs copias` → `✔`; commit «Perfiles: copias automáticas por perfil».

### Task 8 · Tarea 8: cierre de la fase

- [ ] **Paso 1:** `version` 5.0.0 en `manifest.json`; `README.md` (la tabla de módulos con `js/perfiles.js` y `js/selector-perfiles.js`, y una sección corta sobre perfiles y las claves de almacenamiento); `empaquetar/LEEME.txt` con perfiles, Demo y la nota «actualiza todos tus equipos a la vez: la versión 5 guarda los datos en claves nuevas y los equipos con una versión anterior no se sincronizan con ella».
- [ ] **Paso 2:** probar a mano una vez en Chrome real con los datos de verdad: instalar la versión nueva sobre la actual, comprobar que todo está igual, crear un perfil, cambiar, volver, pulsar el ojo.
- [ ] **Paso 3:** `node pruebas/ejecutar.mjs` completo → `✔`; `empaquetar\empaquetar.ps1` → `dist/novatab-5.0.0.zip` con `js/perfiles.js` y `js/selector-perfiles.js` y toda la carpeta `js/widgets/`.
- [ ] **Paso 4:** marcar la fase 8 en la hoja de ruta y commit «Fase 8 terminada: versión 5.0.0».
