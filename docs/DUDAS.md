# Dudas para el final

Durante la construcción no he parado a preguntar: he aplicado el supuesto de partida y lo
he dejado configurable. Estas son las decisiones que conviene confirmar, ordenadas por
impacto.

## 1. Decisiones que necesitan tu respuesta (propietario del proyecto)

1. **Plan de Cloudflare Workers.** El worker ocupa **5,1 MB comprimido**. El plan gratuito
   admite 3 MiB y el de pago 10 MiB (unos 5 USD al mes). Con el gratuito, el despliegue
   fallará. ¿Contratamos el plan de pago? La alternativa sería Vercel, que ya figuraba como
   segunda opción en la definición.
2. **Plan de Supabase.** El plan gratuito no incluye copias de seguridad diarias
   descargables, que pide el requisito de seguridad, y pausa el proyecto tras 7 días sin
   actividad. ¿Supabase Pro (25 USD al mes) o montamos un volcado diario propio a R2?
3. **Carga de la portada en móvil.** Con estrangulamiento real, el LCP es de 1,8 s y
   cumple. La estimación simulada de Lighthouse da 2,6–3,1 s. ¿Damos por bueno el criterio
   con la medición real, o quieres que siga recortando, por ejemplo con una versión aún
   más ligera para móvil? Habría que volver a medir en producción con PageSpeed Insights.
4. **Lista de espera.** La definición la pone en el flujo y en el panel de la fase 1, y
   también en la fase 2. He construido la captura («Avísame si se libera»), la lista en el
   panel y el aviso automático por correo al primero que cabe cuando se cancela una
   reserva. Queda para la fase 2 el plazo de 15 minutos para aceptar y el aviso por
   WhatsApp. ¿Te vale?
5. **Clientes, Arroces del día e Informes** figuraban en la fase 2. Los he incluido en
   versión básica, porque sin ellos no se pueden medir los objetivos. ¿De acuerdo?
6. **Grupos de 9 y 10 personas.** El máximo online es 10, pero con el plano de ejemplo la
   combinación más grande es de 8. Esos grupos van a la solicitud de grupo. ¿Definimos
   combinaciones mayores en el plano real o bajamos el máximo online a 8?
7. **Último turno y hora de salida.** Con una última hora de 15:30 y 105 minutos de
   estancia, la mesa se libera a las 17:15, después del cierre de las 16:30. He
   interpretado el cierre del turno como cierre de cocina. ¿Es así?

## 2. Preguntas para el restaurante (de la definición, siguen abiertas)

- Dirección, horarios, días de cierre y vacaciones.
- Número real de mesas, capacidades y cuáles se pueden juntar.
- Carta actual, con precios y alérgenos.
- ¿Hay fotos y vídeo profesionales, o hay que presupuestar una sesión?
- ¿Se quiere garantía con tarjeta para grupos o días señalados (Fallas, Día de la Madre)?
  Ahora mismo es fase 2.
- ¿Tienen identidad de marca (logo, colores, tipografía)? He creado una provisional:
  tonos de brasa, azafrán y pimentón, con Fraunces e Inter.
- ¿Usan hoy algún sistema de reservas o TPV con el que haya que convivir?
- Dominio: ¿existe ya o hay que registrarlo?
- ¿Cuál de los tres titulares prefieren? Ahora está «El arroz no espera. Tu mesa, sí.»

## 3. Cosas que no he podido verificar en este entorno

- **Turnstile y Resend.** El entorno no tiene salida a `challenges.cloudflare.com` ni a
  `api.resend.com`. El código está hecho y se activa con las claves. Sin ellas:
  - Turnstile se desactiva.
  - Los correos se guardan como «simulados» en la tabla `mensaje`.

  Conviene hacer una reserva de prueba real en cuanto estén las claves.
- **Despliegue real en Cloudflare.** He comprobado el worker con `wrangler dev`: rutas en
  los tres idiomas, panel, API y Cron Trigger. No he desplegado porque faltan las
  credenciales.
- **Integración continua en GitHub.** El flujo `.github/workflows/ci.yml` está escrito
  (lint, tipos, Vitest con Supabase, Playwright y build de OpenNext) pero aún no se ha
  ejecutado en GitHub.

## 4. Decisiones menores ya aplicadas (por si quieres cambiarlas)

- Tope por franja: 20 comensales nuevos cada 15 minutos (configurable por turno).
- Límite de intentos:
  - reservas: 30 retenciones y 10 confirmaciones por IP cada 10 minutos;
  - acceso al panel: 5 fallos por correo o 20 por IP cada 15 minutos.
- Recordatorio solo si la reserva se hizo con más de 12 horas de antelación. Si no hay
  respuesta, se marca «sin confirmar» 4 horas antes.
- Agradecimiento con enlace a la reseña a partir de las 11:00 del día siguiente, solo
  para reservas finalizadas.
- Un teléfono existente no sobrescribe el nombre del cliente. La reserva guarda el
  nombre que se dio.
- Alergias con consentimiento explícito aparte, porque son un dato de salud.
- Las mesas que se quitan de una distribución se desactivan, no se borran, para conservar
  el historial.
- `@opennextjs/cloudflare` lleva un parche pequeño (`patches/`) para Next.js 16.4. Se
  puede quitar cuando OpenNext lo incluya.
