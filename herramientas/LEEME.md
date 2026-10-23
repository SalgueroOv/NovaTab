# Herramientas de auditoría (solo desarrollo)

Esta carpeta **no forma parte de la extensión**: `empaquetar\empaquetar.ps1` solo copia los archivos de la extensión,
así que ni `herramientas/` ni su `node_modules/` llegan al paquete. NovaTab sigue sin dependencias de npm.

## Instalar

```
cd herramientas
npm install
```

Instala `axe-core` y `lighthouse` con versiones exactas (ver `package.json`).

## Qué se ejecuta

- **axe-core** va dentro de la suite: `node pruebas/ejecutar.mjs accesibilidad`. Recorre los diez temas, el modo edición,
  la paleta, el selector de perfiles, el panel de personalizar (sus cuatro pestañas) y los diálogos, y falla con cualquier
  violación de impacto *serious* o *critical* (WCAG 2 A y AA, y buenas prácticas). Sin `node_modules`, se salta con un aviso.
- **Lighthouse** es un script aparte (tarda y necesita Chrome): `node herramientas/lighthouse.mjs`. Sirve el repositorio
  por HTTP local, audita `newtab.html` y escribe `informe-lighthouse.json` (ignorado por git). Sale con código 1 si la
  accesibilidad baja de 95.

## Resultados

| Fecha | Accesibilidad | Buenas prácticas | Notas |
|---|---|---|---|
| 2026-10-23 (versión 5.0.0 + arreglos de la fase 9) | 100 | 96 | Lo único que falla es `errors-in-console`: el `favicon.ico` que pide Chrome al servidor local (no existe como extensión). |

## Arreglos hechos con la auditoría

- Contraste: `--texto-2` más claro en los temas oscuros (4,5:1 sobre el fondo de las pestañas del panel); el texto de «peligro»
  usa `--peligro` (más oscuro en los temas claros y más claro en los oscuros) y el botón rojo, `--peligro-fondo`.
- El botón del selector de perfiles toma su nombre del texto visible (la flecha es decoración en CSS).
- La lista de resultados de la paleta tiene nombre y es alcanzable con el teclado.
- Un título oculto («Tus servicios») evita saltar de `h1` a `h3`.
- Al cambiar de tema hay transiciones de color de 0,3 s: la prueba espera a que acaben antes de medir el contraste.
