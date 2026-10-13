---
version: 1
slug: "app-locale-page-tsx"
primary_target: "app/[locale]/page.tsx"
related_targets: ["app/[locale]/reservar/page.tsx","app/[locale]/carta/page.tsx"]
---

Scope: web pública de Arrocería Yerga (portada, carta, páginas SEO, legales) y flujo de reserva con gestión. Panel fuera. Mode: Persuade (portada y páginas), Operate dentro del flujo de reserva.

Audience: clientes en el móvil, tres idiomas. Job: saber si hay mesa y reservar con su arroz. Proof: disponibilidad real, carta con precios y alérgenos del panel. Constraints: prerender, WCAG AA, movimiento reducido, modo ligero, logotipo conservado, nada de azulejo ni fondos de color.

## Direction contract

THESIS: La web se comporta como una buena app: la reserva es un control que funciona desde el primer viewport, no un botón que lleva a otra parte. Rechaza el hero de foto de comida a sangre, la caligrafía y el crema cálido de categoría.

OWN-WORLD: Neutros fijados por el brief: fondo #fcfcfc / #0d0d0d, superficies #ffffff / #161616, tinta #111111 / #ededed, texto secundario #63635e / #a1a1a1, líneas 1px rgba(0,0,0,0.08) / rgba(255,255,255,0.08). Un solo acento cálido: azafrán (#a8560f texto claro, #f0a24a en oscuro) solo en estados y foco. Geist con tracking -0.02em a -0.035em en títulos. Tarjetas con sombra multicapa difuminada, radios 12–24 px, píldoras para acciones, iconos Lucide de trazo 1.75.

STORY: El visitante entiende en una frase qué es Yerga, ve que hay mesa, elige cuántos son y entra al flujo con ese dato ya puesto; después recorre arroces, carta, la casa y cómo llegar, y cierra reservando.

FIRST VIEWPORT: Logotipo y navegación en barra translúcida fina. Titular del panel a 56–88 px, subtítulo en gris. Bajo él, la tarjeta de reserva elevada con un selector de personas en forma de frase («Mesa para − 2 + personas») cuyo número rueda con un spring, el aviso real de disponibilidad y el botón «Ver horas» que abre /reservar?comensales=n. Brillo radial que sigue al puntero sobre la tarjeta. En móvil, la tarjeta ocupa el ancho bajo el titular y el botón fijo inferior se mantiene.

FORM: Brief fijado por el usuario (estética Emil Kowalski, animations.dev, rigor impeccable); sin tirada de dirección. Lista propia: 1) app de reservas con control en frase, 2) carta como documento tipográfico, 3) tablero de horas. seed: none (unavailable)

Motion grammar: springs stiffness 300, damping 30; scale 0.98 al pulsar; entradas cortas de 8 px con opacidad desde estado visible; el número de personas rueda; las tarjetas de arroz se elevan y la paella gira 8° con spring; reduced-motion lo anula.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
