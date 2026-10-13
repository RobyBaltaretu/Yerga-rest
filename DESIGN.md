---
name: Arrocería Yerga · web pública
description: Neutros de app, una pizca de azafrán y la reserva como control desde el primer viewport.
colors:
  fondo: "#fcfcfc"
  superficie: "#ffffff"
  sutil: "#f4f4f2"
  texto: "#111111"
  suave: "#63635e"
  tenue: "#6f6f6a"
  linea: "rgba(0, 0, 0, 0.08)"
  linea-fuerte: "rgba(0, 0, 0, 0.14)"
  acento: "#9a4d0c"
  acento-suave: "rgba(217, 132, 47, 0.14)"
  brillo: "rgba(217, 132, 47, 0.16)"
  peligro: "#b42318"
  exito: "#18794e"
  invertido: "#ffffff"
  fondo-oscuro: "#0d0d0d"
  superficie-oscuro: "#161616"
  sutil-oscuro: "#1c1c1c"
  texto-oscuro: "#ededed"
  suave-oscuro: "#a1a1a1"
  tenue-oscuro: "#8a8a8a"
  linea-oscuro: "rgba(255, 255, 255, 0.08)"
  linea-fuerte-oscuro: "rgba(255, 255, 255, 0.14)"
  acento-oscuro: "#f0a24a"
  acento-suave-oscuro: "rgba(240, 162, 74, 0.14)"
  brillo-oscuro: "rgba(240, 162, 74, 0.12)"
  peligro-oscuro: "#f97066"
  exito-oscuro: "#4cc38a"
  invertido-oscuro: "#0d0d0d"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 5.25rem)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontFeature: "\"ss01\", \"cv11\""
  headline-pagina:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  title-paso:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.02em"
  item:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.015em"
  body-lg:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  numeral:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "\"tnum\""
  wordmark:
    fontFamily: "Marcellus, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    letterSpacing: "0.14em"
rounded:
  campo: "12px"
  ficha: "16px"
  placa: "20px"
  placa-interior: "22px"
  tarjeta: "24px"
  tarjeta-elevada: "28px"
  bloque: "32px"
  full: "9999px"
spacing:
  gutter-movil: "16px"
  gutter: "24px"
  tarjeta-pad: "24px"
  bloque-gap: "48px"
  seccion: "64px"
  seccion-amplia: "96px"
  contenedor: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.texto}"
    textColor: "{colors.invertido}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "rgba(17, 17, 17, 0.88)"
  button-primary-lg:
    backgroundColor: "{colors.texto}"
    textColor: "{colors.invertido}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  button-primary-sm:
    backgroundColor: "{colors.texto}"
    textColor: "{colors.invertido}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost:
    textColor: "{colors.texto}"
    rounded: "{rounded.full}"
    padding: "0 20px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.sutil}"
  boton-paso:
    backgroundColor: "{colors.sutil}"
    textColor: "{colors.texto}"
    rounded: "{rounded.full}"
    size: "44px"
  ficha-eleccion:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    typography: "{typography.item}"
    rounded: "{rounded.ficha}"
    height: "48px"
  ficha-eleccion-activa:
    backgroundColor: "{colors.texto}"
    textColor: "{colors.invertido}"
  dia-calendario-elegido:
    backgroundColor: "{colors.texto}"
    textColor: "{colors.invertido}"
    rounded: "{rounded.full}"
    height: "44px"
  campo:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.campo}"
    padding: "12px 16px"
  tarjeta:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.tarjeta}"
    padding: "24px"
  tarjeta-reserva:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.tarjeta-elevada}"
    padding: "6px"
  hoja:
    backgroundColor: "{colors.superficie}"
    rounded: "{rounded.tarjeta-elevada}"
    padding: "24px"
  enlace-nav:
    textColor: "{colors.suave}"
    rounded: "{rounded.full}"
    padding: "8px 12px"
  enlace-nav-hover:
    backgroundColor: "{colors.sutil}"
    textColor: "{colors.texto}"
  pastilla-aviso:
    backgroundColor: "{colors.acento-suave}"
    textColor: "{colors.acento}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
---

# Design System: Arrocería Yerga · web pública

> Alcance: este sistema rige solo la web pública y el flujo de reserva, todo lo que cuelga de `app/[locale]` y lleva la clase `.web` en el `<html>`. El panel de personal (`/panel`) conserva a propósito su aspecto anterior (crema, `.papel`, Marcellus/Allura, tokens `arroz`/`pimenton`) y queda fuera de este documento; no se debe documentar ni «corregir» desde aquí.

## Overview

**Creative North Star: "El azafrán en el plato blanco"**

La web se comporta como una buena app de reservas: fondos neutros casi blancos (o casi negros en modo oscuro), tinta muy oscura, gris para todo lo secundario y una única nota cálida, el azafrán, que aparece solo donde algo está vivo, enfocado o seleccionado. El color de verdad lo pone la comida: las ilustraciones de paella son el único elemento saturado de la pantalla, y giran o se inclinan con el mismo muelle que mueve toda la interfaz.

La densidad es de producto, no de revista: un contenedor de 1152 px, títulos Geist seminegrita con tracking negativo que se aprieta con el tamaño, entradillas en gris de 18 px y listas separadas por filetes de 1 px en lugar de cuadrículas de tarjetas. La profundidad viene de sombras multicapa muy difusas cuyo primer anillo de 1 px hace de borde; las superficies elevadas son pocas y significan «aquí se actúa» (la tarjeta de reserva, la hoja de un arroz, el cierre). La reserva no es un enlace a otra parte, es un control que funciona en el primer viewport.

El mundo rechaza el hero de foto de comida a sangre, la caligrafía y el crema cálido de categoría. La única fotografía (la casa) vive enmarcada dentro de una tarjeta elevada, y la única letra con remates es la del logotipo.

**Key Characteristics:**
- Neutros fríos en dos modos (claro y oscuro por `prefers-color-scheme`), un solo acento: azafrán.
- Acción principal en tinta: píldora negra en claro, píldora casi blanca en oscuro.
- Geist con `ss01` y `cv11`, tracking de -0.01em a -0.04em según tamaño; cifras tabulares en precios, horas y cantidades.
- Bordes invisibles: el filo de 1px forma parte de la sombra; las listas usan filetes `linea`.
- Movimiento con un único muelle (stiffness 300, damping 30), pulsación a escala 0.98, todo anulado con movimiento reducido.
- Iconos Lucide de trazo 1.75 (2 dentro de botones).

## Colors

Una escala de grises neutros con un único acento cálido; cada token tiene su par oscuro con el mismo nombre y sufijo `-oscuro` en el frontmatter (en código, el mismo `--w-*` redefinido bajo `prefers-color-scheme: dark`).

### Primary
- **Azafrán tostado** (`acento` / `acento-oscuro`): el anillo de foco (2px, separación 2px), el cursor de los campos, el punto que late junto a la disponibilidad real, la pastilla de «carta de ejemplo» y el filo iluminado de las tarjetas con brillo. En oscuro sube a un azafrán claro para mantener el contraste.
- **Velo de azafrán** (`acento-suave`): fondo de la selección de texto y de la pastilla de aviso.
- **Brillo de azafrán** (`brillo`): el halo radial de 420px que sigue al puntero sobre las tarjetas elevadas. Solo con ratón.

### Neutral
- **Tinta** (`texto`): titulares, cuerpo principal y relleno de la acción principal, del día elegido y de la ficha elegida.
- **Gris piedra** (`suave`): entradillas, subtítulos, etiquetas de definición, enlaces de navegación en reposo y textos de ayuda.
- **Gris ceniza** (`tenue`): pies de foto, mínimos de comensales, «cerrado», notas legales e iconos informativos. Mantiene AA (4,9:1 sobre `fondo`, 4,6:1 sobre `sutil`).
- **Blanco roto** (`fondo`): el lienzo de toda la web y de la barra translúcida (al 80 %).
- **Superficie** (`superficie`): tarjetas, hoja modal, botones secundarios, campos.
- **Gris hueso** (`sutil`): placas interiores de las paellas, botones de paso, hover de fantasmas, el selector de idioma y la única banda de color de la portada (la casa).
- **Filete** (`linea`) y **filete marcado** (`linea-fuerte`): divisores de 1px entre filas, bordes interiores, la retícula de puntos del hero, el asa de la hoja y las barras de desplazamiento.
- **Invertido** (`invertido`): texto sobre la acción en tinta.

### Estado
- **Peligro** (`peligro`) y **éxito** (`exito`): solo mensajes de error, avisos de fallo y la confirmación de reserva (icono sobre un velo del 14 % de `exito`).

### Named Rules
**The Pinch of Saffron Rule.** El azafrán es una pizca: marca lo vivo, lo enfocado y lo seleccionado. Nunca rellena un botón, un titular ni un fondo de sección.

**The Ink Action Rule.** La acción principal es siempre una píldora de tinta (`texto` sobre `invertido`), y se invierte sola en modo oscuro. No hay botones de color.

**The Food Is the Color Rule.** Lo único saturado en pantalla son las ilustraciones de paella; la interfaz que las rodea se queda en gris.

## Typography

**Display Font:** Geist (con ui-sans-serif, system-ui, sans-serif)
**Body Font:** Geist (la misma familia)
**Label/Mono Font:** Marcellus, solo en la palabra YERGA del logotipo

**Character:** Una sola sans geométrica y precisa, con las alternativas `ss01` y `cv11` activas en todo el documento; la jerarquía se hace con tamaño, peso 600 y tracking, nunca con otra familia.

### Hierarchy
- **Display** (600, clamp(2.75rem, 7vw, 5.25rem), 0.98): el titular de la portada, máximo 14ch.
- **Headline de página** (600, clamp(2.25rem, 5vw, 3.5rem), 1.02): título de las páginas interiores (carta, reservar, legales).
- **Headline** (600, clamp(2rem, 4vw, 2.75rem), 1.05): títulos de sección de la portada. El cierre usa una variante mayor (clamp(2rem, 5vw, 3.5rem), -0.04em).
- **Title de paso** (600, 1.75rem, tight): el título de cada paso del flujo de reserva; 2rem en la confirmación, 1.5rem en la hoja y en las secciones de la carta.
- **Title** (600, 1.25rem): subtítulos dentro de tarjetas (horario, zonas) y filas de origen del producto.
- **Item** (600, 17px): nombres de plato, de arroz y de fila.
- **Body grande** (400, 18px, 1.625): entradillas en `suave`, de 38ch a 52ch.
- **Body** (400, 15px, 1.625): descripciones en listas, hasta 60ch. El cuerpo base del documento es 16px.
- **Label** (500, 13px): avisos, pies, metadatos, indicador de paso. 14px en navegación y pie.
- **Numeral** (600, 3rem, -0.04em, tabular): el número de comensales que rueda en la tarjeta de reserva.

### Named Rules
**The Tightening Rule.** Cuanto más grande, más apretado: botones -0.01em, ítems -0.015em, títulos -0.02em, secciones -0.03em, titulares -0.035em, numeral -0.04em. Todo h1–h3 lleva al menos -0.02em y `text-wrap: balance`; los párrafos, `text-wrap: pretty`.

**The Tabular Figures Rule.** Precios, horas, teléfonos, días del calendario y cantidades van siempre en cifras tabulares.

**The One Roman Rule.** Marcellus (tracking 0.14em) existe solo en la palabra YERGA del logotipo. Ningún titular la usa.

## Layout

Un único contenedor centrado de 1152px con márgenes de 16px en móvil y 24px desde 640px. Las secciones de la portada respiran entre 64px y 112px en vertical (la casa, la más amplia, 96–144px) y se separan por un filete `linea` en el borde superior, no por cambios de fondo; la única banda de color es la de la casa, en `sutil`. Las composiciones son de dos columnas desde 1024px (texto 1fr, lista 1.6fr, o mitades) y se apilan en una sola columna por debajo.

La información repetida se dispone como filas divididas por filetes de 1px (entrantes, carta, origen del producto, cómo llegar, horario) con nombre a la izquierda y precio tabular a la derecha. Las únicas rejillas de tarjetas son la de arroces (2 columnas en móvil, 4 desde 1024px, huecos de 12–16px) y las opiniones (3 columnas desde 768px, sin tarjeta, solo filete superior).

La cabecera es una barra fija de 64px en `fondo` al 80 % con desenfoque y saturación; bajo ella puede colgar una línea de disponibilidad real. En móvil, una barra fija inferior con «Reservar mesa» sustituye a la acción de la cabecera y se oculta mientras la tarjeta de reserva está a la vista; el pie reserva 128px abajo para no quedar tapado. Las páginas interiores arrancan a 128–160px y usan una columna de 768px (576px en la reserva). El hero lleva una retícula de puntos de 24px en `linea-fuerte` desvanecida con una máscara radial.

## Elevation & Depth

Sistema híbrido: casi todo es plano y se ordena con filetes; tres niveles de sombra multicapa marcan lo que se toca. Cada sombra empieza con un anillo de 1px que hace de borde, así que las superficies elevadas no llevan `border`. En modo oscuro las sombras cambian de receta: anillo blanco al 6–8 %, un brillo interior de 1px arriba y sombras negras densas.

### Shadow Vocabulary
- **Tarjeta** (`--shadow-tarjeta`, claro: `0 0 0 1px rgba(0,0,0,0.04), 0 1px 1px -0.5px rgba(0,0,0,0.04), 0 3px 3px -1.5px rgba(0,0,0,0.04), 0 6px 6px -3px rgba(0,0,0,0.04)`): reposo de botones, fichas, tarjetas de arroz, horario, enlaces de contacto, la píldora activa del idioma.
- **Elevada** (`--shadow-elevada`, claro: seis capas hasta `0 32px 32px -16px rgba(0,0,0,0.05)`): hover de lo anterior y reposo de la tarjeta de reserva, el bloque de cierre, la foto de la casa y la confirmación.
- **Flotante** (`--shadow-flotante`, claro: `0 0 0 1px rgba(0,0,0,0.06), 0 12px 24px -6px rgba(0,0,0,0.12), 0 32px 64px -12px rgba(0,0,0,0.16)`): solo la hoja modal.
- **Sombra de ilustración** (`drop-shadow(0 12px 14px rgba(0,0,0,0.16))`, y `0 30px 40px rgba(0,0,0,0.18)` en la paella del hero): siluetas de paella sobre su placa.

### Named Rules
**The Border-in-the-Shadow Rule.** Las superficies elevadas no llevan borde CSS; el filo es la primera capa de la sombra. El único borde visible de 1px es el interior de la tarjeta de reserva y los filetes de las listas.

**The Shadow-as-State Rule.** El hover sube un nivel (tarjeta → elevada) con transición de 150–300ms; no hay desplazamiento salvo en las tarjetas de arroz (-3px con muelle).

## Shapes

Lenguaje de píldoras y esquinas generosas. Todo lo que se pulsa suelto es píldora o círculo (botones, enlaces de navegación, selector de idioma, botones de paso de 44px, días del calendario, pastillas de aviso). Lo que se elige en rejilla, como comensales y horas, son fichas de 16px. Los campos tienen 12px. Las tarjetas van de 24px (arroz, horario, calendario, resumen) a 28px (tarjeta de reserva, hoja, confirmación) y 32px (el bloque de cierre). Las placas interiores (imagen de la casa, plato de paella) llevan 20–22px dentro de un marco de 6–8px de `superficie`. La hoja es 28px solo arriba en móvil y 28px en las cuatro esquinas en escritorio. Las horas agotadas se muestran como ficha de borde discontinuo con el texto tachado.

## Components

### Buttons
Píldoras sobrias que ceden al pulsar.
- **Shape:** píldora completa (9999px).
- **Primary:** tinta sobre invertido, peso 500, tracking -0.01em, sombra tarjeta; tres tamaños: 36px/16px de lado a 14px, 44px/20px a 15px y 48px/24px a 16px. Las flechas de «seguir» van a la derecha (16px, trazo 2) y en la tarjeta de reserva se desplazan 2px en hover.
- **Hover / Focus / Active:** hover a tinta al 88 %; foco con anillo azafrán de 2px separado 2px; al pulsar, escala 0.98 con el muelle; deshabilitado al 50 %; cargando, un aro giratorio de 16px.
- **Secondary:** `superficie` con sombra tarjeta que pasa a elevada en hover (volver, ver carta completa). La variante de peligro es la secundaria con texto `peligro`.
- **Ghost:** solo texto, fondo `sutil` en hover.
- **Paso (− / +):** círculo de 44px en `sutil`, hover `linea-fuerte`, escala 0.92 al pulsar, deshabilitado al 35 %.

### Chips
- **Fichas de elección** (comensales, horas): 48px de alto, 16px de radio, `superficie` con sombra tarjeta y hover elevada; la elegida pasa a tinta invertida; escala 0.96 al pulsar.
- **Pastilla de aviso:** velo de azafrán con texto azafrán, 13px/500, píldora (carta de ejemplo).
- **Saltos de sección de la carta:** píldoras de 36px en `superficie` con sombra tarjeta.

### Cards / Containers
- **Corner Style:** 24px estándar; 28px para la elevada; 32px para el cierre.
- **Background:** `superficie`, placa interior en `sutil`.
- **Shadow Strategy:** tarjeta en reposo, elevada en hover o cuando es la superficie de acción (ver Elevation & Depth).
- **Border:** ninguno; la tarjeta de reserva es un marco de 6px con una segunda caja interior de 22px y filete `linea`.
- **Internal Padding:** 20–24px (32px en escritorio para el horario; 24–40px en la confirmación).

### Inputs / Fields
- **Style:** `superficie`, radio 12px, relleno 12px × 16px, 16px de texto, sin borde y con un anillo de 1px de tinta al 20 %; etiqueta de 14px en 600 encima; ayuda en `suave` de 14px debajo.
- **Focus:** el anillo pasa a 2px de azafrán; el cursor es azafrán.
- **Error / Disabled:** mensaje en `peligro` de 14px/500 con `role="alert"`; las casillas usan `accent-color` tinta.

### Navigation
- **Escritorio:** enlaces de 14px/500 en `suave`, píldora con fondo `sutil` y texto tinta en hover; a la derecha, el selector de idioma y «Reservar mesa» en tamaño pequeño.
- **Selector de idioma:** control segmentado en `sutil` (píldora de 2px de relleno) con códigos en mayúsculas de 12px/600; la píldora activa (`superficie` + sombra tarjeta) se desliza entre opciones con el muelle.
- **Móvil:** botón de menú de 44px que abre una pantalla completa en `fondo`; enlaces de 24px/500 con filete inferior y flecha `tenue`, entrando 8px desde abajo con un escalonado de 30ms; acción de reserva grande abajo, respetando el área segura.
- **Pie:** tres columnas a 14px, enlaces `suave` que pasan a tinta; texto legal y acceso al panel en 13px `tenue`.
- **Enlace en texto:** subrayado de 1px con separación de 4px en `linea-fuerte` que toma el color del texto en hover.

### Tarjeta de reserva (signature)
El primer paso real de la reserva en la portada: la frase «Mesa para − 2 + personas» con el número en el estilo numeral, que rueda verticalmente (±70 %, desenfoque de 4px) con el muelle en la dirección del cambio; botón primario grande a todo el ancho que abre `/reservar?comensales=n` (o comidas de grupo por encima del máximo); punto vivo en azafrán con la disponibilidad real; enlace en texto a grupos. Lleva el brillo que sigue al puntero.

### Brillo (signature)
Superficies elevadas de acción (tarjeta de reserva, cierre) llevan un halo radial de 420px de `brillo` y un filo de 1px iluminado en azafrán (degradado de 260px enmascarado al borde) que siguen al ratón y aparecen en 300ms. Desactivado en pantallas sin hover.

### Tarjeta de arroz y hoja
Tarjeta de 24px con 8px de marco, placa cuadrada de 20px en `sutil` con la paella dentro; en hover y foco la tarjeta sube 3px y la paella gira 8° y escala 1.03 con el muelle. Al pulsar abre la hoja: sube desde abajo en móvil y aparece centrada (máx. 512px) en escritorio, con velo negro al 30 % (60 % en oscuro) y desenfoque de 2px, entrada desde 40px y escala 0.98, sombra flotante, asa de 40×4px en móvil y cierre circular de 44px.

### Flujo de reserva
Columna de 576px con indicador «Paso n de m» y barras de progreso de 4px (`linea` con relleno tinta que crece con el muelle); un resumen en `sutil` con filete y radio 16px; cada paso entra con 8px y opacidad; calendario en tarjeta de 24px con días circulares de al menos 44px, elegido en tinta, cerrados o completos tachados, cabecera de días en 12px mayúsculas `tenue`.

## Do's and Don'ts

### Do:
- **Do** usar el muelle único (stiffness 300, damping 30) para todo movimiento con física, escala 0.98 al pulsar y entradas de 8px con opacidad; respetar `prefers-reduced-motion` y el modo `.ligera` (ahorro de datos o equipos de ≤2 GB), que paran la rotación de la paella y el pulso del punto vivo.
- **Do** dejar la acción principal en píldora de tinta y reservar el azafrán para foco, selección, cursor, disponibilidad viva y avisos.
- **Do** separar listas con filetes `linea` de 1px y precios tabulares alineados a la derecha, en lugar de convertir cada fila en tarjeta.
- **Do** subir la sombra un nivel (tarjeta → elevada) como respuesta al hover en lo que se pulsa.
- **Do** usar iconos Lucide a 16–20px con trazo 1.75 (trazo 2 dentro de botones y pasos), en `suave` o `tenue`.
- **Do** mantener objetivos táctiles de al menos 44px y el anillo de foco azafrán de 2px separado 2px.
- **Do** consumir los tokens `.web` (`texto`, `suave`, `superficie`, `linea`, `acento`…) en código nuevo.

### Don't:
- **Don't** abrir con una foto de comida a sangre; la fotografía va enmarcada dentro de una tarjeta elevada.
- **Don't** usar caligrafía ni el crema cálido de categoría (`.papel`, `arroz`): son del panel, no de la web pública.
- **Don't** usar Marcellus fuera de la palabra YERGA del logotipo.
- **Don't** rellenar botones, titulares ni secciones de azafrán.
- **Don't** poner bordes CSS a las tarjetas elevadas ni sombras duras desplazadas; el filo está en la sombra.
- **Don't** poner antetítulos en mayúsculas (kickers) sobre los títulos de sección; el título va directo.
- **Don't** usar glifos o emojis como iconos; solo SVG de Lucide.
- **Don't** escribir código nuevo con los alias heredados (`tinta`, `niebla`, `pimenton`, `azafran-oscuro`, `huerta-claro`, `white`); existen solo para que los componentes compartidos tomen la paleta nueva.
