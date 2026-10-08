# Pendientes: datos reales a sustituir

Todo lo de esta lista es configurable. Casi todo se cambia desde el panel; lo demás, en
`supabase/seed.sql` antes de la primera carga en producción.

| Qué | Dónde se cambia | Estado actual |
|---|---|---|
| Dirección, teléfono, WhatsApp, correo, enlace al mapa y a reseñas | Panel → Configuración → Datos del local | Valores de ejemplo entre corchetes |
| Razón social, NIF y domicilio social | Panel → Configuración → Datos legales (administrador) | Entre corchetes |
| Horarios, días de cierre y vacaciones | Panel → Configuración → Horarios y Bloqueos | Comida de martes a domingo 13:00–16:30; cena viernes y sábado 20:30–23:30; lunes cerrado |
| Plano real de sala y terraza, mesas combinables y mesas para la puerta | Panel → Mapa de mesas | Plano de ejemplo: 14 mesas en sala y 8 en terraza |
| Carta con precios y alérgenos reales | Panel → Carta y contenidos | 7 arroces, 5 entrantes, 4 postres y 1 menú de grupo marcados como «ejemplo» |
| Titular de la portada (elegir una de las tres propuestas) | Panel → Carta y contenidos → Textos | «El arroz no espera. Tu mesa, sí.» |
| Historia, equipo y textos de la casa | Panel → Carta y contenidos → Textos | Textos de ejemplo |
| Fotos y vídeo profesionales | Sección «La casa» y fotos de platos | Foto de la abuela recortada de la identidad (`public/marca/abuela.webp`); platos con ilustraciones en código |
| Logotipo en vector y placa de azulejos real | `public/marca/` (logo, emblema, iconos, azulejo) | Recortes de las imágenes de la identidad, en WebP |
| Reseñas reales enlazadas a su origen | Panel → Carta y contenidos → Opiniones | 3 reseñas de ejemplo |
| Textos legales revisados por un asesor | Panel → Carta y contenidos → Textos (legal.*) | Plantillas en `lib/legal.ts` |
| Revisión de los textos en valenciano por una persona nativa | `messages/va.json`, plantillas de correo y carta | Borrador propio |
| Dominio definitivo | `NEXT_PUBLIC_SITE_URL` y Cloudflare | Sin registrar |
| Usuarios reales del personal | Panel → Usuarios | Tres usuarios de ejemplo (`*@yerga.test`) |
| Claves de producción: Supabase, Cloudflare, Turnstile, Resend | Variables de entorno (ver README) | Solo local; Turnstile y correo en modo de desarrollo |
| Ficha de Google Business enlazada a la reserva | Google Business Profile → enlace de reservas a `/es/reservar` | Pendiente |

Antes de abrir al público:

1. Quitar la marca «ejemplo» de los platos.
2. Borrar los usuarios `*@yerga.test` y las reservas de la semilla. En producción no se
   ejecuta `seed.sql`: cargar solo los datos reales.
