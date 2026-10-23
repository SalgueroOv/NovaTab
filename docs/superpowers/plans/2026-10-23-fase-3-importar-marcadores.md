# Fase 3: importar marcadores de Chrome — plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: superpowers:executing-plans (ejecución nativa, como en las fases anteriores). Los pasos usan casillas (`- [x]`).

**Objetivo:** que quien instala NovaTab pueda traer sus marcadores de Chrome como grupos, eligiendo carpetas, sin duplicar lo que ya tiene y sin aceptar enlaces peligrosos.

**Arquitectura:** `js/importar.js` tiene la lógica pura (aplanar el árbol de marcadores en carpetas, decidir la zona, filtrar y quitar duplicados) y la interfaz del diálogo. El permiso `bookmarks` es opcional y se pide en el clic del botón. Los grupos nuevos se añaden por `guardarYPintar()`, así que importar también se puede deshacer con Ctrl+Z (fase 2).

**Tecnología:** módulos ES nativos (sin compilación), `chrome.bookmarks` y `chrome.permissions`, Node 22+ para las pruebas.

**Origen:** `docs/superpowers/plans/2026-10-21-hoja-de-ruta-mejoras.md` (fase 3) y las respuestas del usuario del 2026-10-23:
- **Carpetas anidadas:** cada carpeta que tenga enlaces propios es un grupo, y las subcarpetas son grupos aparte nombrados «Padre / Hija».
- **Raíces:** se ofrecen «Barra de marcadores» y «Otros marcadores»; «Marcadores móviles» solo si tiene contenido. Los enlaces sueltos de una raíz van a un grupo con el nombre de la raíz.
- **Permiso:** `bookmarks` opcional, pedido en el clic de «Importar marcadores».
- **Revisión:** solo casillas; la zona de cada grupo sale sola y se puede cambiar luego editando el grupo.

## Restricciones globales

- MV3, sin compilación ni dependencias de npm; `node pruebas/ejecutar.mjs` funciona recién clonado.
- `bookmarks` va en `optional_permissions` del manifest; nunca en `permissions`.
- Solo se importan enlaces `http:` y `https:` (`urlSegura`); cualquier otro esquema se omite.
- Zona local si la mayoría de los enlaces de la carpeta son IPs privadas (10/8, 172.16/12, 192.168/16) o `localhost`; si no, Internet.
- Duplicado: mismo dominio y puerto que otro enlace ya guardado o ya elegido en esta importación (`claveSitio` de `js/widgets.js`, la comparación de «Más usadas»).
- Un grupo nuevo: `{ id: nuevoId(), nombre, zona, color: '#8a8c92', privado: false, pos: null, enlaces }`; cada enlace `{ id: nuevoId(), nombre, url }`, con el dominio como nombre si el título está vacío.
- Los datos guardados no cambian de formato (sigue la versión 4).
- Versión final: 4.2.0.

## Revisión: lo que más probablemente falle

1. **Una URL `javascript:`, `data:` o `chrome://` en un marcador:** se omite y nunca llega a un grupo (tarea 1).
2. **Carpetas vacías, solo con duplicados o solo con enlaces inseguros:** no crean un grupo vacío (tarea 1).
3. **Títulos vacíos o muy largos, y dos carpetas con el mismo nombre:** el grupo se crea con un nombre válido y las dos carpetas dan dos grupos (tarea 1).
4. **Permiso denegado en el diálogo de Chrome:** no cambia nada y se avisa con un texto claro (tarea 2).
5. **Una carpeta con cientos de marcadores:** se importa; si pasa del tamaño de una clave de sync, `almacen.js` la guarda solo en este equipo y avisa (tarea 2).
6. **Pulsar «Importar» dos veces seguidas o importar el mismo árbol otra vez:** la segunda vez no añade nada porque todo son duplicados, y lo dice (tarea 2).
7. **Cancelar el diálogo o desmarcar todo:** no se crea nada y «Importar» queda desactivado (tarea 2).

---

### Task 1 · Tarea 1: lógica de importación (aplanar, zona, duplicados)

**Archivos:** crear `js/importar.js` (solo lógica por ahora), `pruebas/importar-marcadores.prueba.mjs`, `pruebas/lib/marcadores-prueba.mjs`.

**Interfaces:**
- `pruebas/lib/marcadores-prueba.mjs` exporta `ARBOL_PRUEBA`, el árbol que devuelve `chrome.bookmarks.getTree()` (`[{ id: '0', children: [barra, otros, moviles] }]`, nodos con `id`, `title`, `url?` y `children?`), con: en la barra, un enlace suelto `http://192.168.1.50:8080/` («NAS»), una carpeta «Casa» con tres enlaces privados (`192.168.1.10`, `http://10.0.0.5/`, `http://localhost:3000/`) y una subcarpeta «Domótica» con dos enlaces (`http://192.168.1.60/` y `https://home.example.com/`); en «Otros marcadores», una carpeta «Trabajo» con `https://mail.example.com/`, `https://docs.example.com/`, un enlace repetido `https://mail.example.com/otra-ruta`, `javascript:alert(1)`, `chrome://settings` y un enlace con título vacío `https://sin-titulo.example.com/`; una carpeta vacía «Vacía» y una carpeta «Solo malos» con solo `javascript:void(0)`; «Marcadores móviles» vacío.
- `importar.js` exporta:
  - `esLocal(url: string): boolean`: `localhost` o IPv4 de 10/8, 172.16/12 o 192.168/16.
  - `carpetasDeArbol(raices: Nodo[]): Carpeta[]` con `Carpeta = { id: string, nombre: string, enlaces: { nombre: string, url: string }[] }`. Recorre «Barra de marcadores» y «Otros marcadores» (y «Marcadores móviles» si tiene algo), por posición bajo la raíz `'0'`: la primera es la barra, la segunda «Otros» y la tercera «Móviles»; los nombres de las carpetas de primer nivel son su título, los de subcarpetas `Padre / Hija`, y los enlaces sueltos de una raíz forman una carpeta con el nombre de la raíz. Solo `http:` y `https:` (`urlSegura`). Las carpetas sin enlaces válidos no aparecen.
  - `gruposDeCarpetas(carpetas: Carpeta[], elegidas: Set<string>, guardados: Set<string>): { grupos: Grupo[], omitidos: number }`: para cada carpeta elegida, quita los enlaces cuyo `claveSitio` ya está en `guardados` o ya se usó antes en esta importación, y no crea grupo si no queda ningún enlace. `omitidos` cuenta los enlaces descartados por duplicados. El nombre del grupo se recorta a 40 caracteres.

- [x] **Paso 1:** escribir `importar-marcadores.prueba.mjs` (abre `abrir()` y evalúa `import('/js/importar.js')`, como `migracion.prueba.mjs`) y ejecutarla → falla (el módulo no existe):
  - (a) `esLocal`: `192.168.1.5`, `http://10.1.2.3/`, `http://172.16.0.1/`, `http://172.31.255.1/` y `http://localhost:8080/` son locales; `http://172.32.0.1/`, `https://example.com/` y `http://8.8.8.8/` no.
  - (b) `carpetasDeArbol(ARBOL_PRUEBA)` devuelve, en este orden y con estos nombres: «Barra de marcadores» (1 enlace: NAS), «Casa» (3), «Casa / Domótica» (2), «Trabajo» (4 válidos: mail, docs, la otra ruta de mail y el sin título). No aparecen «Vacía», «Solo malos» ni «Marcadores móviles»; ningún enlace tiene esquema `javascript:` ni `chrome:`.
  - (c) `gruposDeCarpetas` eligiendo las cuatro con `guardados` vacío: el enlace repetido de mail se omite (`omitidos === 1`); «Casa» y «Barra de marcadores» salen en zona `local`, «Trabajo» y «Casa / Domótica» en `online` (1 de 2 enlaces privados no es mayoría); el enlace sin título se llama `sin-titulo.example.com`.
  - (d) con `guardados = new Set(['mail.example.com:443'])`, «Trabajo» pierde mail y su otra ruta (`omitidos === 2`); con todos sus sitios guardados, «Trabajo» no crea grupo.
  - (e) una carpeta de nombre vacío o de 80 caracteres produce un grupo con nombre «Sin nombre» o de 40 caracteres.
- [x] **Paso 2:** implementar `js/importar.js` y `marcadores-prueba.mjs`.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Importar marcadores: lógica de carpetas, zona y duplicados».

### Task 2 · Tarea 2: botón, permiso y diálogo

**Archivos:** modificar `manifest.json` (`"optional_permissions": ["bookmarks"]`), `newtab.html` (botón `#btn-importar-marcadores` en `.barra-edicion` y `<dialog id="dlg-marcadores">` con la lista de carpetas con casillas, el recuento y «Importar»/«Cancelar»), `style.css`, `js/importar.js` (interfaz), `js/main.js` (importar el módulo), `pruebas/lib/util.mjs` (opción `marcadores`), `pruebas/importar-marcadores.prueba.mjs`.

**Interfaces:**
- `abrir({ marcadores: Nodo[], permisoMarcadores: 'concedido' | 'denegado' | 'pendiente' })` inyecta, antes de cargar la página, `chrome.bookmarks.getTree(cb)` con el árbol dado y `chrome.permissions.contains/request` que responden según `permisoMarcadores` (con `'pendiente'`, `contains` da `false` y `request` da `true` y lo recuerda). Sin la opción no se inyecta nada.
- `importar.js` registra el clic de `#btn-importar-marcadores`: `chrome.permissions.request({ permissions: ['bookmarks'] })` (la llamada ocurre dentro del manejador del clic, sin `await` previo); si se deniega, `avisar('Sin permiso para leer tus marcadores')`; si se concede, `chrome.bookmarks.getTree`, `carpetasDeArbol` y se abre el diálogo con una fila por carpeta (casilla, nombre y «N enlaces»), todas desmarcadas. «Importar» está desactivado con ninguna marcada. Al aceptar, `gruposDeCarpetas` con los `claveSitio` de los enlaces ya guardados, los grupos se añaden a `datos.grupos`, `colocarSinPosicion(datos)` y `guardarYPintar()`; después `avisarConAccion('N grupos importados', 'Deshacer', deshacerUltimo)`, o `avisar('No hay nada nuevo que importar: todos los enlaces ya están en tus grupos')` si no se creó ninguno. Si hay omitidos, el texto añade «(M repetidos omitidos)».

- [x] **Paso 1:** ampliar `importar-marcadores.prueba.mjs` y ejecutarla → falla:
  - (a) con `permisoMarcadores: 'concedido'`, en modo edición, clic en `#btn-importar-marcadores`: `#dlg-marcadores` abierto con 4 filas de carpetas con las casillas desmarcadas y `Importar` desactivado; marcar «Casa» activa `Importar`.
  - (b) marcar «Casa» y «Trabajo» e importar: `novatab.datos.grupos` incluye «Casa» (3 enlaces, `local`) y «Trabajo» (3 enlaces: mail, docs y sin título; `online`), ninguno con URL `javascript:`; el aviso dice «2 grupos importados (1 repetidos omitidos)»; Ctrl+Z los quita.
  - (c) importar otra vez el mismo árbol eligiendo todo: no se crea ningún grupo y el aviso es «No hay nada nuevo que importar: todos los enlaces ya están en tus grupos».
  - (d) con `permisoMarcadores: 'denegado'`: el diálogo no se abre, `datos` no cambia y el aviso es «Sin permiso para leer tus marcadores».
  - (e) cancelar el diálogo con casillas marcadas no crea nada.
  - (f) `manifest.json` tiene `bookmarks` en `optional_permissions` y no en `permissions` (la prueba lee el archivo).
- [x] **Paso 2:** implementar.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; commit «Botón Importar marcadores con permiso opcional».

### Task 3 · Tarea 3: cierre de la fase

- [x] **Paso 1:** `version` 4.2.0 en `manifest.json`; `README.md` (fila de `js/importar.js` y el permiso opcional); `empaquetar/LEEME.txt` solo si lista permisos.
- [x] **Paso 2:** comprobar a mano una vez en Chrome real: cargar la carpeta como extensión sin empaquetar, pulsar «Importar marcadores», aceptar el permiso e importar una carpeta.
- [x] **Paso 3:** `node pruebas/ejecutar.mjs` → todas `✔`; `empaquetar\empaquetar.ps1` → `dist/novatab-4.2.0.zip` con `js/importar.js` y sin IPs de redes reales.
- [x] **Paso 4:** marcar la fase 3 en la hoja de ruta y commit «Fase 3 terminada: versión 4.2.0».
