# Hoja de ruta de mejoras — NovaTab

> **Para agentes:** esta es la hoja de ruta (varios subsistemas independientes). Cada fase tendrá su propio plan detallado en `docs/superpowers/plans/` antes de ejecutarse, con superpowers:subagent-driven-development o superpowers:executing-plans.

**Objetivo:** convertir la extensión en una página de inicio muy personalizable y robusta para repartir entre amigos, sin perder nada de lo que ya funciona.

**Arquitectura:** extensión MV3 sin paso de compilación (HTML + CSS + JS planos, cargados en orden en `newtab.html`). Datos en `chrome.storage.sync` (`datos`, `tema`, `opciones`, `nota:<id>`), normalizados y migrados por `normalizar()` con un número de `version`. Las pruebas son scripts de Node que manejan Chrome sin ventana por CDP (como los que se han usado durante el desarrollo).

**Tecnología:** Chrome MV3, JavaScript sin dependencias, Node 22+ para las pruebas, PowerShell para empaquetar.

**Origen:** el análisis de la conversación del 2026-10-21 (diagnóstico y propuestas de personalización y skills).

## Restricciones globales

- MV3: nada de scripts remotos ni `eval`; los recursos externos solo como imágenes, iframes o `fetch` de datos.
- Sin paso de compilación ni dependencias de npm en la extensión: los archivos se cargan tal cual.
- Interfaz en español; los datos de un usuario existente nunca se pierden: cada cambio de formato sube `version` y migra en `normalizar()`.
- Cada fase termina con: pruebas en verde, `empaquetar\empaquetar.ps1` sin fugas, `version` subida en `manifest.json` y commit.
- Permisos nuevos solo como `optional_permissions` / `optional_host_permissions`, pedidos en el clic que los necesita.
- La copia personal (sin `key` en el manifest) y el paquete de amigos (con `key`) deben seguir funcionando ambos.

## Revisión: lo que más probablemente falle

1. **Datos de una versión anterior** (v1, v2, v3 y la tuya actual): al migrar no se pierde ningún grupo, enlace, posición, widget ni nota.
2. **Cuota de sincronización llena** (más de 8 KB en una clave): la página sigue funcionando, avisa y guarda en local.
3. **Dos equipos editando a la vez:** el último cambio gana sin corromper los datos ni duplicar grupos.
4. **Sin conexión:** iconos de jsDelivr, tiempo y fuentes remotas fallan con elegancia (siglas, mensaje), nunca con la página rota.
5. **Importar un JSON o unos marcadores con cosas raras** (URLs `javascript:`, nombres vacíos, carpetas anidadas): se ignoran o se corrigen, nunca se ejecutan.

---

## Orden y por qué

| Fase | Qué | Por qué en este orden | Esfuerzo |
|---|---|---|---|
| 0 | Base de pruebas y revisión | Todo lo demás toca código existente: primero una red de seguridad | M |
| 1 | Separar el código en módulos y guardar por grupos | Abarata cada fase siguiente y quita el límite de 8 KB antes de que crezcan los datos | L |
| 2 | Deshacer y copias automáticas | Protege a tus amigos antes de darles más poder de edición | M |
| 3 | Importar marcadores de Chrome | La función que más valor da a un usuario nuevo | M |
| 4 | Editor de apariencia | El gran salto en personalización | L |
| 5 | Productividad: Ctrl+K, atajos, buscador configurable | Mejora el uso diario; se apoya en los módulos de la fase 1 | M |
| 6 | Vistas por grupo y panel redimensionable | Personalización de distribución | M |
| 7 | Widgets nuevos | Se suman sobre una base estable | M |
| 8 | Perfiles (Trabajo / Casa / Demo) | Cambia el modelo de datos: mejor cuando todo lo anterior está asentado | L |
| 9 | Pulido de interfaz y accesibilidad | Al final, cuando ya no cambian las funciones | M |

Esfuerzo: S = una sesión corta, M = una sesión, L = varias sesiones.

---

### Fase 0: base de pruebas y revisión (terminada)

**Archivos:** crear `pruebas/lib/cdp.mjs` (copia del cliente CDP de la skill, MIT), `pruebas/*.mjs`, `pruebas/ejecutar.mjs`; modificar `app.js`, `widgets.js`, `newtab.html`.

- [x] Reunir en `pruebas/` las pruebas ya usadas: cuadrícula (mover, ancho, alto, cambio de panel), plegar, modo reunión, buscador, temas, widgets, más usadas (con `chrome.topSites` simulado), selector de iconos.
- [x] `node pruebas/ejecutar.mjs` las ejecuta todas y termina con código ≠ 0 si alguna falla o hay excepciones en la consola.
- [x] Ejecutar `/code-review` y `/security-review` y corregir lo confirmado.
- [x] Correcciones ya conocidas:
  - URLs: aceptar solo `http:` y `https:` al editar, importar y normalizar.
  - Restaurar: borrar también las claves `nota:<id>` huérfanas.
  - Restaurar sale de la barra de edición y pasa a Opciones como "Restablecer todo", con confirmación escrita.

**Hecho cuando:** `node pruebas/ejecutar.mjs` en verde y una prueba nueva demuestra que `javascript:alert(1)` no se guarda.

### Fase 1: módulos y almacenamiento por grupos

**Archivos:** dividir `app.js` en `js/datos.js` (normalizar, migraciones), `js/almacen.js` (leer/escribir, cuotas), `js/rejilla.js` (posiciones, resolver, arrastre), `js/edicion.js` (diálogos), `js/buscador.js`, `js/apariencia.js` (tema, opciones); `widgets.js` e `iconos.js` pasan a `js/`. Módulos ES (`<script type="module">`), permitidos en MV3.

- [ ] Partir sin cambiar comportamiento (apoyarse en `/simplify`); las pruebas de la fase 0 siguen en verde.
- [ ] Almacenamiento v4: `datos` guarda solo estructura y orden; cada grupo en su clave `grupo:<id>`. Migración desde v3 en `normalizar()`.
- [ ] Si una clave supera la cuota, esa clave pasa a `storage.local` y se avisa una vez.

**Hecho cuando:** una prueba con 200 enlaces guarda y recarga sin errores, y unos datos v3 reales (los tuyos exportados) migran sin pérdidas.

### Fase 2: deshacer y copias automáticas

**Archivos:** `js/historial.js` (nuevo), `js/almacen.js`, `newtab.html` (aviso con botón).

- [ ] Pila en memoria de los últimos 20 estados; Ctrl+Z y un aviso "Grupo borrado · Deshacer" durante 8 segundos tras cada borrado.
- [ ] Copia automática diaria en `storage.local` (últimas 7) y lista en Opciones para recuperar una.

**Hecho cuando:** borrar un grupo y pulsar Deshacer lo recupera con sus enlaces y su posición; recuperar una copia de hace dos días deja los datos idénticos a entonces.

### Fase 3: importar marcadores de Chrome

**Archivos:** `js/importar.js` (nuevo), `manifest.json` (`optional_permissions: ["bookmarks"]`), `newtab.html`.

- [ ] Botón "Importar marcadores" en modo edición: pide el permiso en el clic y muestra el árbol de carpetas con casillas.
- [ ] Cada carpeta elegida se convierte en un grupo. Zona local si la mayoría de sus URLs son IPs privadas (10/8, 172.16/12, 192.168/16) o `localhost`; si no, Internet.
- [ ] Sin duplicados: se omiten las URLs que ya están en algún grupo (misma comparación por dominio y puerto que "Más usadas").

**Hecho cuando:** importar un árbol simulado con carpetas anidadas, duplicados y una URL `javascript:` crea los grupos correctos y omite los duplicados y la URL insegura.

### Fase 4: editor de apariencia

**Archivos:** `js/apariencia.js`, `style.css` (variables), `newtab.html` (panel de la paleta con pestañas Tema / Fondo / Diseño).

- [ ] Color de acento libre (además de los 4 temas, que quedan como puntos de partida).
- [ ] Fondo: curvas, grafo, teselas (de los mockups), liso o imagen propia (redimensionada a 1920 px de ancho en WebP y guardada en `storage.local`, nunca en sync). Intensidad del dibujo del 0 al 100 %.
- [ ] Diseño: densidad compacta / cómoda, radio de las esquinas, reloj 12/24 h, con o sin segundos y con o sin fecha.
- [ ] Todo en `opciones.apariencia`, aplicado con variables CSS en `:root`.

**Hecho cuando:** cada ajuste se aplica al momento, sobrevive a la recarga y una imagen de 8 MB se guarda reducida sin errores de cuota.

### Fase 5: productividad

**Archivos:** `js/comandos.js` (nuevo), `js/buscador.js`, `manifest.json` (`optional_host_permissions` para las sugerencias).

- [ ] Paleta de comandos con Ctrl+K: abrir enlace, modo reunión, cambiar tema, nuevo grupo/enlace/widget, ocultar paneles.
- [ ] Alt+1 … Alt+9 abren los nueve primeros enlaces locales (en orden de la cuadrícula).
- [ ] Buscador: motor por defecto configurable (Google, DuckDuckGo, Bing, Perplexity, ChatGPT) y atajos `!y`, `!gh`, `!w`, `!m` editables en Opciones.
- [ ] Sugerencias de Google mientras se escribe, solo si se concede el permiso.

**Hecho cuando:** las pruebas de teclado abren lo esperado y `!y gatos` va a la búsqueda de YouTube.

### Fase 6: vistas por grupo y panel redimensionable

**Archivos:** `js/rejilla.js`, `style.css`.

- [ ] Vista por grupo (en su diálogo): lista (actual), cuadrícula de iconos o compacta sin IPs.
- [ ] Separador arrastrable entre los paneles izquierdo y derecho (del 25 al 50 %), guardado en opciones.

**Hecho cuando:** cambiar la vista de un grupo recalcula su alto en la cuadrícula sin pisar a los vecinos.

### Fase 7: widgets nuevos

**Archivos:** `js/widgets/*.js` (uno por widget), `widgets.js` pasa a ser solo el registro.

- [ ] Estado de servicios: los LEDs de antes como widget opcional (permisos de host pedidos al añadirlo; HTTPS autofirmado marcado como "sin verificar").
- [ ] Tareas (con casillas, sincronizadas como las notas), reloj mundial y cuenta atrás.
- [ ] RSS (permiso de host del feed pedido al configurarlo).

**Hecho cuando:** cada widget pasa su prueba de añadir, configurar, recargar y borrar.

### Fase 8: perfiles

**Archivos:** `js/perfiles.js` (nuevo), `js/datos.js` (migración v5).

- [ ] Varios perfiles, cada uno con sus grupos, widgets y apariencia; cambio rápido desde la cabecera y desde Ctrl+K.
- [ ] El modo reunión pasa a ser un perfil "Demo" predefinido; los grupos privados siguen funcionando.

**Hecho cuando:** cambiar de perfil y volver deja todo exactamente como estaba y la migración v4→v5 crea un perfil con los datos actuales.

### Fase 9: pulido y accesibilidad

- [ ] Auditoría con Impeccable o Hallmark (`audit`) y corrección de lo que señalen.
- [ ] Lighthouse y axe en Chrome sin ventana: 0 errores de contraste y de nombres accesibles.
- [ ] Mover y redimensionar bloques con el teclado (flechas, con Mayús para el tamaño).
- [ ] Opcional: interfaz en inglés (`_locales/`) si se reparte fuera del grupo de amigos.

**Hecho cuando:** los informes de Lighthouse y axe están limpios y toda la edición se puede hacer sin ratón.
