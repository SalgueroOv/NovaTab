# Rediseño A2 de NovaTab — diseño

**Fecha:** 2026-10-24 · **Versión de partida:** 5.1.0 (fases 0–9 terminadas) · **Versión de llegada:** 6.0.0

**Referencia visual y de comportamiento:** `mockups/v2/a-variantes.html?v=2` (A2). El motor común está en
`mockups/v2/comun.js` y `mockups/v2/comun.css`. Los mockups son desechables: sirven para copiar el aspecto,
las animaciones y los algoritmos de dibujo, no la arquitectura. Donde este documento y el mockup no coincidan,
manda este documento.

## 1. Intención

El usuario encuentra la interfaz estática y con aspecto de clon de la pestaña nueva de Chrome: el menú son
cinco botones redondos sin texto en una esquina, el panel de Personalizar es un gris fijo que no sigue al tema,
el acento por defecto es el azul de Google y los fondos son dibujos SVG quietos. Quiere una interfaz **moderna,
única y muy personalizable**, con movimiento, sin perder nada de lo que la extensión ya hace.

Lo que la hace única: cada perfil tiene **su propio terreno** (un relieve generado de su semilla) que se dibuja
de varias formas minimalistas, que se mueve despacio, que se ilumina bajo el ratón y que se transforma al
cambiar de perfil. Todo el color sale del tema del perfil, también menús y paneles.

## 2. Objetivos, no objetivos y lo que lo haría fracasar

### Objetivos

- Un único mando, la **isla**, sustituye a los botones de la esquina, al selector de perfil y a la barra de edición.
- **Personalizar como estudio**: la página encoge a la izquierda como vista previa en vivo y los controles quedan a la derecha.
- **Temas que lo tiñen todo**, derivados de tres colores, con transición animada, y **temas propios** creados por el usuario.
- **Fondos animados en canvas**, todos sacados del terreno o la semilla del perfil, más la imagen propia.
- **Estilos de página** (Mapa, Baldosas, Compacto) elegibles por perfil.
- **Paleta Ctrl+K** renovada que también encuentra enlaces de los demás perfiles.

### No objetivos

- No se cambia el modelo de datos de grupos, enlaces, widgets, notas, tareas ni perfiles, salvo lo que se añade al aspecto.
- No se toca la rejilla libre: colocar, redimensionar, mover con el teclado, paneles izquierdo y derecho, widgets en ambos, vistas por grupo, plegar, privados y Demo siguen igual. Solo cambia su aspecto.
- No hay interfaz en inglés (descartada).
- No hay sincronización nueva entre equipos más allá de lo que ya existe.

### Lo que lo haría fracasar aunque funcione

- Que algún usuario pierda datos, un tema o su imagen de fondo al actualizar.
- Que la pestaña nueva consuma CPU de forma notable estando quieta, o que el fondo vaya a tirones.
- Que los fondos dejen de ser **minimalistas**: solo líneas y puntos, a pantalla completa, sin rellenos ni formas con huecos. El usuario descartó rombos rellenos, malla, luz y sombra y fractales (Julia, atractor, árboles).
- Que la luz bajo el ratón se vea como un círculo de borde nítido: debe difuminarse hacia el borde.
- Que un control quede sin nombre accesible, sin foco visible o que solo funcione con ratón (la fase 9 dejó 0 errores de axe y de Lighthouse; se mantiene).

## 3. Restricciones (heredadas de la hoja de ruta)

- MV3 sin scripts remotos ni `eval`; sin paso de compilación ni dependencias de npm en la extensión.
- Interfaz en español. Cada cambio de formato sube `version` y migra sin perder datos.
- Cada fase termina con pruebas en verde (`node pruebas/ejecutar.mjs`), `empaquetar\empaquetar.ps1` sin fugas, `version` subida en `manifest.json` y commit.
- Permisos nuevos solo opcionales y pedidos en el clic que los necesita.
- Copia personal y paquete de amigos siguen funcionando.
- `prefers-reduced-motion: reduce` desactiva todo movimiento: fondo quieto, sin transiciones de tema ni morfosis.

## 4. Lo que decidió el usuario (no cambiar sin preguntarle)

1. **Dirección A2**: el mando es una isla encima del panel de servicios. Se descartaron la barra grande inferior, la lectura de "cota" bajo el ratón, la versión de teclado con carril lateral (B) y la versión con salas que se deslizan (C) como página principal.
2. **La isla tiene el mismo color, borde y ancho que el panel de servicios** (el panel derecho) y va alineada justo encima de él. Si el panel cambia de ancho, la isla lo sigue.
3. **Separador arrastrable** entre la columna izquierda y el panel de servicios, como el actual, que también mueve la isla.
4. **Rejilla libre conservada.** Los estilos cambian cómo se ve cada grupo, no dónde está.
5. **Temas:** los del mockup le parecen bien. Quiere poder crear temas propios.
6. **Fondos**, todos a pantalla completa y minimalistas: Curvas (de nivel), Cotas, Sombreado, Crestas, Grafo, Rayas, Rombos (solo líneas), Trama, Galaxia, Liso y Tu imagen. En Crestas solo se iluminan los tramos cercanos al ratón, no la fila entera.
7. **Imagen propia**: el usuario puede subir su imagen. Con imagen, el fondo no se mueve ni reacciona al ratón, y eso se dice en la interfaz.
8. **Luz bajo el ratón** difuminada hacia el borde.
9. **Estilos de página** (Mapa, Baldosas, Compacto): le parecen bien siempre que la elección sea simple, una sola elección con vista previa.

## 5. Diseño

### 5.1 Sistema de temas

Un tema son tres colores y un modo: `{ id, nombre, modo: 'oscuro'|'claro', bg, ink, acento }`. Todo lo demás se
deriva en CSS con `color-mix(in oklab, …)`, como en `mockups/v2/comun.css`:

| Variable | Qué es |
| --- | --- |
| `--s1`…`--s4` | Superficies del 5 %, 9 %, 14 % y 21 % de `ink` sobre `bg` |
| `--linea`, `--linea-fuerte` | `ink` al 11 % y al 24 % sobre transparente |
| `--suave`, `--tenue` | Texto secundario y terciario: `ink` al 70 % y al 56 % sobre `bg` (comprobar 4,5:1 con axe) |
| `--velo` | `bg` al 84 % sobre transparente: fondo de paneles y de la isla |
| `--sobre-acento` | Negro o blanco, el de más contraste con el acento |

- `--bg` y `--ink` se registran con `@property` (`syntax: "<color>"`) y llevan transición de 0,8 s, así el cambio de tema y de perfil se anima (todo lo derivado de ellos también). `--acento` no se registra: cambia de golpe y su valor calculado sigue siendo el hex que se guardó. Sin transición con movimiento reducido.
- **Menús, diálogos, la isla, el estudio y los avisos usan estas superficies**, nunca un gris fijo. Desaparecen `--superficie: #2a2d33` y el acento azul de Google.
- **Temas incluidos**: se conservan los diez ids actuales (`bosque`, `noche`, `medianoche`, `grafito`, `carbon`, `papel`, `glaciar`, `niebla`, `menta`, `rosa`) para no migrar nada, redefinidos como tríos. Se añade `abismo`. Para los que existen en el mockup se toman sus valores de `comun.js` (`TEMAS`); el resto los elige el constructor con el mismo criterio: tinta y acento con contraste AA. **Sin violeta ni índigo** (regla de la skill de diseño del proyecto), **y sin crema con terracota.** Cada tema trae su propio acento, en vez del azul común.
- **Acento**: el del tema, uno de cinco alternativos o uno libre. Se guarda en `apariencia.acento` como ahora (`null` = el del tema).
- **Tema por perfil**: como ahora, cada perfil guarda su tema en su aspecto. Un perfil cuyo tema ya no existe (un tema propio borrado en otro equipo) usa `bosque` sin reescribir su aspecto hasta que el usuario cambie algo.
- **Temas propios**: "Crear tema" pide nombre, fondo y acento. La tinta y el modo se deducen del fondo (`temaDesde` en `comun.js`). La página entera se previsualiza mientras se eligen los colores. Se guardan en `storage.sync` en una clave común `temas-propios` (lista, máximo 12, cada uno ≤ 200 bytes), así los ven todos los perfiles y equipos. Un tema propio se puede renombrar y borrar; borrar un tema en uso devuelve los perfiles que lo usaban a `bosque`. Los ids son `propio-<uuid corto>`.

### 5.2 Fondos en canvas

Un `<canvas>` a pantalla completa sustituye al `<div id="fondo">` con SVG. El motor es la clase `Terreno` de
`mockups/v2/comun.js`, que se pasa a módulo (`js/terreno.js` y `js/fondos.js`, este último sustituido).

- **Relieve por perfil.** Ruido de valor con cuatro octavas y semilla. La semilla por defecto es el id del perfil, y "Generar otro terreno" guarda una nueva en el aspecto (`apariencia.semilla`). Al cambiar de perfil o de semilla, el relieve se transforma durante 1,3 s, interpolando el campo viejo y el nuevo. Al abrir la pestaña, el relieve "sube" desde el llano.
- **Fondos** (ids nuevos en `IDS_FONDO`): `curvas`, `cotas`, `sombreado`, `crestas`, `grafo`, `rayas`, `rombos`, `trama`, `galaxia`, `liso`, `imagen`. Los algoritmos están en `ESTILOS` de `comun.js` y se copian. Los que salen de la semilla y no del relieve (`grafo`, `trama`, `galaxia`) se funden del perfil viejo al nuevo al cambiar.
- **Migración de ids antiguos** en `normalizarApariencia`: `teselas`→`rombos`, `ondas`→`crestas`, `puntos`→`cotas`, `cuadricula`→`trama`, `hexagonos`→`trama`, `anillos`→`curvas`, `montanas`→`crestas`. Los demás se conservan.
- **Ajustes del fondo** (en el aspecto del perfil): `densidadFondo` (0–1; `densidad` ya es cómoda/compacta), `relieve` (0–1), `movimiento` (`quieto` | `lento` | `vivo`, por defecto `lento`), `brillo` (luz bajo el ratón, por defecto sí) e `intensidad` (0–100, se conserva el ajuste actual: multiplica la opacidad del dibujo). El slider actual de intensidad sigue sirviendo para la imagen.
- **Luz bajo el ratón**: lo que está a menos de 190 px del puntero se repinta en el color de acento por capas (10 niveles) con una curva suave (smoothstep) cuya capa exterior es casi transparente. Así se difumina hacia el borde y no hay círculo visible.
- **Rendimiento**: como mucho 30 dibujos por segundo, también al mover el ratón. Sin dibujar con la pestaña oculta. Con `quieto`, solo se redibuja al mover el ratón (si hay luz), al redimensionar o al cambiar de ajustes. En Chrome sin ventana (solo CPU) a 1440×900, cada dibujo de los mockups tarda entre 0,8 y 13 ms (Galaxia es el más caro). Cualquier fondo que supere 20 ms por dibujo en esas condiciones hay que aligerarlo.
- **Imagen propia**: se conserva todo lo actual (se reduce a 1920 px en WebP y se guarda solo en `storage.local`, con `intensidadImagen` como velo). Sigue siendo el `background-image` de `#fondo` (tipo *cover*) con un velo del color `bg` del tema; el canvas se oculta. Decidido en el plan de la fase 2: se ve igual y conserva lo que ya funcionaba. Sin movimiento ni luz, y lo dice el ajuste: «Con una imagen el fondo no se mueve ni se ilumina con el ratón».
- **Miniaturas**: la misma clase dibuja vistas fijas (escala proporcional) para las cartas de temas, de fondos y de perfiles.
- **Movimiento reducido**: fondo fijo, sin morfosis, sin titileo.

### 5.3 La isla (mando)

Una barra fija arriba con `background: var(--velo)`, `border: 1px solid var(--linea)` y el radio de los
paneles. **Mismo `left` y `width` que el panel de servicios**: vive en la misma columna de la rejilla, así que hereda su ancho y sigue al separador sin observar nada (decidido en el plan de la fase 3). Abierta (menú de perfiles) es opaca, con `--superficie`. Si
el panel derecho está oculto, se coloca sobre el izquierdo. En pantallas de 1000 px o menos, donde la rejilla
se apila, ocupa el ancho del contenido y queda fija arriba.

Tiene cuatro capas que se cruzan con una transición de alto (resorte de 0,55 s, sin transición con movimiento reducido):

1. **Barra**, en reposo:
   - el chip del perfil (miniatura del terreno, nombre y flecha; abre la capa de perfiles);
   - el botón «Buscar o mandar» con `Ctrl K` (abre la paleta), que se estira;
   - tres botones de icono con tooltip y `aria-label`: Modo reunión (el `alternarDemo` actual, con `aria-pressed`), Editar y Personalizar.
2. **Perfiles**: cartas con la miniatura del terreno de cada perfil en su tema, el nombre y «N enlaces · Estilo». La carta actual va marcada, y hay una carta «Nuevo perfil». Debajo, Duplicar, Renombrar y Borrar (los diálogos y operaciones de `perfiles-ops.js` no cambian). Se navega con flechas y Esc cierra.
3. **Paleta**: la paleta Ctrl+K vive dentro de la isla (ver 5.6).
4. **Edición**: «Editando *Perfil*» y Añadir grupo, Añadir widget, Deshacer y Listo. Sustituye a la barra de edición actual. **Exportar, Importar e Importar marcadores pasan a Personalizar › Datos.** El párrafo de ayuda fijo de la edición se elimina: lo cubren los tooltips y el `README`.

Con la capa de perfiles o la de paleta abierta, un velo semitransparente cubre la página y un clic fuera cierra.
Esas dos capas miden al menos 560 px (o el ancho de la ventana menos 24 px): si la isla es más estrecha, crecen
centradas sobre ella. Los botones de ocultar paneles salen de la esquina: pasan a Personalizar › Disposición y
a la paleta.

Debajo de la isla, la cabecera del panel derecho conserva su título editable («Red local» o el que haya puesto
el usuario) y el resumen (número de enlaces y, si hay comprobación, el hallazgo de 5.7). El selector de perfil y
la barra de edición salen de ella. La columna izquierda conserva su «Añadir grupo» de Internet en modo edición.

### 5.4 Personalizar como estudio

Al abrirlo, el contenido de la página (no la isla) se escala a `(ancho − 480 − 96) / ancho` y se desplaza a la
izquierda, con el radio de los paneles y una sombra. Una columna de 480 px a la derecha, con el fondo `bg`, tiene:

- cabecera «Personalizar», subtítulo «Ajustes de *Perfil* y comunes» y botón cerrar;
- cuatro pestañas con indicador deslizante: **Aspecto, Disposición, Buscador, Datos**;
- pie con «Alt P cambia el perfil que ajustas» y el botón **Hecho**.

Cada sección indica su ámbito: «Solo *Perfil*» (aspecto del perfil) o «Todos los perfiles» (comunes).

| Pestaña | Secciones (ámbito) |
| --- | --- |
| Aspecto | **Estilo** (perfil), con tres cartas esquemáticas · **Tema** (perfil), cartas con la miniatura del terreno en cada tema y «Crear tema» · **Acento** (perfil) · **Fondo** (perfil), cartas con miniatura, «Tu imagen» con subida y, si está elegida, Oscurecer, Cambiar y Quitar · **Terreno** (perfil): Densidad, Relieve, Intensidad, Movimiento, Iluminar bajo el ratón y Generar otro terreno; se oculta con Liso o Imagen |
| Disposición | **Densidad** · **Esquinas** · **Qué se ve** (panel izquierdo, panel derecho, fondo de color en los grupos, modo sobrio; nunca los dos paneles ocultos) · **Reloj** (24 h, segundos, fecha) — todo del perfil |
| Buscador | Motor, atajos `!clave`, sugerencias: lo de la pestaña actual, con más ancho (todos los perfiles) |
| Datos | Copias automáticas y Recuperar · Exportar, Importar e Importar marcadores (todos) · **Restablecer *Perfil*…** al final, en rojo, con el diálogo de confirmación actual (perfil) |

Con movimiento reducido no hay escala animada: la página aparece ya encogida. Por debajo de 900 px de ancho, el
estudio es una hoja que sube desde abajo y la página no se escala. Esc o Hecho cierran.

### 5.5 Estilos de página

Tres valores en `apariencia.estilo`: `mapa` (por defecto), `baldosas` y `compacto`. **No cambian la rejilla ni
dónde están los bloques.** Cambian:

- **Mapa**: reloj grande (como ahora) y grupos con filas de dos líneas (nombre arriba, IP en monoespaciada pequeña debajo, estado a la derecha si está activo).
- **Baldosas**: reloj aún mayor y la vista por defecto de los grupos es en fichas (logo grande, nombre, IP y estado), basada en la vista `iconos` actual.
- **Compacto**: reloj de 84 px, densidad compacta y filas de una línea sin IP.

La vista de cada grupo (`g.vista`) pasa a admitir `auto`, que es el nuevo valor por defecto y sigue al estilo.
Los grupos con vista elegida a mano la conservan. Los grupos existentes con `lista` (el valor por defecto de
hoy) pasan a `auto` en la migración, y `iconos` y `compacta` se conservan. Esto sube `version` de los datos.

Además, en todos los estilos: el reloj anima cada dígito que cambia (cae desde arriba, 0,6 s), sin animación
con movimiento reducido. Desaparece la monoespaciada fuera de las IPs (por ejemplo, en el contador
«7 servicios»).

### 5.6 Paleta Ctrl+K

Se conserva lo que hace `comandos.js` (abrir enlace, reunión, tema, nuevo grupo/enlace/widget, paneles, perfiles)
y se añade:

- grupos con título: Perfiles, Vista, Servicios, Internet, Aspecto, Datos y **En otros perfiles**;
- búsqueda difusa con las letras encontradas resaltadas en el color de acento;
- con la búsqueda vacía, una selección corta: perfiles, vista, Personalizar y los cinco primeros enlaces;
- miniatura del terreno en los perfiles, muestra en los temas, logo en los enlaces, y atajos visibles (`Alt P`, `Ctrl K`);
- **En otros perfiles**: enlaces de los demás perfiles (sin los privados mientras se está en Demo). Abrirlo cambia a ese perfil y abre el enlace. Se leen con `cargarDatos(perfil)` al abrir la paleta y se guardan en memoria hasta que cambie algo de otro perfil;
- comandos de aspecto: fondo, movimiento del terreno, generar otro terreno y estilo.

### 5.7 Estado de los servicios en los grupos (opcional por grupo)

El mockup enseña latencia y un resumen («8 de 9 responden · NAS no responde desde las 23:14»). En la extensión
esto necesita permiso de host para cada origen. Por eso es **opcional por grupo**: en el diálogo del grupo,
«Comprobar si responden» pide los permisos al marcarlo, reutilizando `sondear`/`sondearTodos` y el pedido de
permisos de `widgets/servicios.js`. Los grupos con la opción muestran en cada enlace un punto de estado (verde
con latido, ámbar si es lento o "sin verificar", rojo si no responde) y los milisegundos. Se sondea cada 60 s
con la pestaña visible.

El resumen del panel solo aparece si algún grupo comprueba, y nombra lo más grave. El widget «Estado de
servicios» se mantiene tal cual.

### 5.8 Lo que se conserva sin cambios de comportamiento

Rejilla, arrastre y teclado de bloques, widgets, notas, tareas, RSS, reloj mundial, cuenta atrás, buscador de la
columna izquierda (con Modo IA y sugerencias), atajos Alt+1…9 y Alt+P, deshacer/rehacer, copias diarias,
importar marcadores, perfiles y Demo, almacenamiento y migraciones, sincronización entre pestañas y equipos y el
empaquetado. Los ids del DOM que usan las pruebas se conservan donde el elemento sigue existiendo. Donde
desaparece (por ejemplo `#btn-tema`, `.esquina`, `#panel-tema`), las pruebas se actualizan a la isla y al estudio
en la misma fase.

## 6. Datos que se añaden o cambian

| Dónde | Qué | Defecto |
| --- | --- | --- |
| `apariencia` (por perfil) | `estilo`, `semilla`, `densidadFondo`, `relieve`, `movimiento`, `brillo` | `mapa`, id del perfil, 0,55, 0,45, `lento`, `true` |
| `apariencia.fondo` | ids nuevos y migración de los antiguos (5.2) | `curvas` |
| `apariencia` | `densidad` (cómoda/compacta) ya existe y no se renombra; la densidad del fondo es `densidadFondo` | — |
| `storage.sync` `temas-propios` | `[{ id, nombre, bg, acento }]`, máx. 12 | `[]` |
| datos del perfil | `g.vista` admite `auto`; `lista` → `auto` en la migración; `g.comprobar` (bool) | `auto`, `false` |
| `version` de datos | sube en 1 | — |

`normalizarApariencia` valida cada campo nuevo (como hace hoy con los existentes) y nunca falla con datos
antiguos o de otra versión.

## 7. Fases propuestas

Cada una con su plan en `docs/superpowers/plans/` antes de ejecutarse:

1. **Temas derivados** (hecha, versión 5.2.0): tríos, `color-mix`, `@property`, superficies tintadas en todo lo existente, acento por tema y temas propios (sin la interfaz nueva de crear todavía, o con un formulario mínimo).
2. **Fondos en canvas** (hecha, versión 5.3.0): motor `Terreno`, los once fondos, semilla por perfil, morfosis, luz, imagen en canvas, migración de ids y miniaturas.
3. **La isla** (hecha, versión 5.4.0): sustituye esquina, selector de perfil y barra de edición; menú de perfiles con miniaturas; sigue al panel y al separador.
4. **Estudio de Personalizar** (hecha, versión 5.5.0; el fondo no se encoge, sigue a pantalla completa): las cuatro pestañas, ámbitos, cartas con miniatura, Crear tema, Datos con lo movido.
5. **Paleta renovada** con búsqueda en otros perfiles.
6. **Estilos y aspecto de los grupos**: `estilo`, vista `auto`, filas de dos líneas, fichas, reloj de dígitos y migración de `vista`.
7. **Estado en los grupos** (5.7).
8. **Pulido**: axe y Lighthouse en todos los temas y estados nuevos, móvil, movimiento reducido, rendimiento medido, `README`, versión 6.0.0.

## 8. Lo que queda al constructor

- Organización interna de módulos y nombres, siempre que se respete el estilo del código actual.
- Los valores concretos de los temas que no están en el mockup, con contraste AA.
- La forma exacta de las pruebas nuevas y de las actualizaciones de las existentes.
- Cómo partir cada fase en tareas.
- Optimizaciones de dibujo que no cambien el aspecto.
