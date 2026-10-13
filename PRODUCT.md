# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Clientes de la arrocería** (castellano, valenciano e inglés), sobre todo desde el
  móvil: quieren saber si hay mesa, para cuántos y a qué hora, elegir su arroz por
  encargo y reservar sin llamar.
- **La sala y la cocina** usan el panel (`/panel`) en tableta durante el servicio. El
  panel queda fuera de este rediseño.

## Product Purpose

Convertir visitas en reservas reales. La disponibilidad que ve el cliente sale siempre
del mapa de mesas: si no hay mesa, no hay reserva. El arroz se encarga al reservar para
que esté en su punto al llegar.

## Positioning

Una arrocería de leña en Valencia donde la mesa y el arroz se reservan juntos, con
disponibilidad real al minuto, en tres idiomas.

## Operating Context

- Web pública prerenderizada en `/es`, `/va` y `/en`; la reserva y la gestión por código
  son dinámicas.
- Flujo de reserva: personas → día → hora (y zona) → arroz → datos → confirmación y
  página de gestión (cambiar o cancelar). Grupos grandes por solicitud; lista de espera
  con plazo de 15 minutos cuando una hora está completa.

## Capabilities and Constraints

- Next.js 16 (App Router), Tailwind CSS 4, next-intl, Supabase, Cloudflare Workers con
  OpenNext. Coste de infraestructura 0 €.
- Textos de portada, carta, precios, alérgenos, horarios y reseñas se editan desde el
  panel; la web no los inventa.
- Accesibilidad: WCAG AA, teclado, lector de pantalla, movimiento reducido.

## Brand Commitments

- Nombre: Arrocería Yerga. Lema: «Arroces con alma».
- Se conservan el **logotipo** (emblema con espiga, casa y paella, y la palabra YERGA con
  su letra romana), el **azulejo** de la puerta («Yerga · Arrocería valenciana», cobalto,
  ocre y verde sobre cal), su cenefa y la **historia de la casa** (la abuela Yerga, «donde
  caben dos, caben tres», «Bienvenidos a su casa»).
- Decidido por el propietario el 13/10: aire tradicional y valenciano; la web va siempre
  en claro (no cambia a negro con el modo oscuro del sistema).

## Evidence on Hand

- Carta, horarios y reseñas de ejemplo en la base (marcados como ejemplo). Datos reales
  pendientes: `docs/PENDIENTES.md`.
- No hay fotografías reales del local; la portada usa una fotografía de paella valenciana
  recortada (`public/marca/paella-valenciana.webp`, aportada por el propietario el 13/10) y
  el resto de paellas son ilustraciones propias (`components/web/PaellaMini.tsx`). Una fotografía provisional de la familia
  (`public/marca/abuela.webp`).
- No inventar reseñas, premios, cifras ni precios.

## Product Principles

1. La reserva es el centro: a un toque desde cualquier pantalla.
2. Solo se muestra lo que es cierto (disponibilidad, precios, alérgenos).
3. Tres idiomas con la misma calidad.
4. Rápida en un móvil modesto: la web pública se prerenderiza.

## Accessibility & Inclusion

WCAG 2.1 AA; foco visible; navegación por teclado; `prefers-reduced-motion` respetado;
modo ligero con ahorro de datos.
