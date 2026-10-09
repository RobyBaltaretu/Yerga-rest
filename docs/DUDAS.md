# Dudas y decisiones

Durante la construcción no he parado a preguntar: he aplicado el supuesto de partida y lo
he dejado configurable. El 9 de octubre de 2026, en el trabajo autónomo, resolví las que
no implican gasto con el supuesto más razonable. Van marcadas **«decidido por Code, a
confirmar»**: si alguna no te encaja, se cambia sin coste.

## 1. Decisiones de proyecto

1. **Plan de Cloudflare Workers.** Decidido por el propietario: **plan gratuito, 0 €/mes**
   (`docs/INFRA-COSTE-CERO.md`). La web se prerenderiza y el panel corre en el navegador
   para caber en los 10 ms de CPU por petición. El Worker ocupa 5,1 MB comprimido; la
   documentación actual de Cloudflare ya no fija un límite comprimido en el plan
   gratuito. Se confirmará con el primer despliegue (`docs/BITACORA.md`).
2. **Plan de Supabase.** Decidido por el propietario: **gratuito**, con copia diaria
   propia, cifrada y en un repositorio privado (`infra/yerga-backups/`). La pausa por
   inactividad no afecta, porque el cron consulta la base cada 5 minutos.
3. **Carga de la portada en móvil.** **Decidido por Code, a confirmar:** el criterio se da
   por cumplido con la medición real. Una prueba automática lo repite en cada cambio
   (`tests/e2e/rendimiento.spec.ts`, mediana local de 1,85 s con 4G lenta y CPU ×4) y se
   confirmará con PageSpeed Insights sobre la URL de producción. No hace falta una versión
   aún más ligera para móvil.
4. **Lista de espera.** **Decidido por Code, a confirmar:** se completa en la fase 1 el
   plazo de 15 minutos para aceptar el aviso. El aviso es por correo; WhatsApp queda
   fuera porque tiene coste.
5. **Clientes, Arroces del día e Informes.** **Decidido por Code, a confirmar:** se
   quedan en la fase 1 en versión básica (hacen falta para medir los objetivos) y se
   amplían con lo que pide la fase 2.
6. **Grupos de 9 y 10 personas.** **Decidido por Code, a confirmar:** el máximo online
   sigue en 10. Con el plano de ejemplo, 9 y 10 pasan a la solicitud de grupo. Cuando
   esté el plano real, basta con definir combinaciones de mesas mayores en el panel para
   que se reserven online. Si no, se baja el máximo a 8 en Configuración.
7. **Último turno y hora de salida.** **Decidido por Code, a confirmar:** el cierre del
   turno (16:30) es el cierre de cocina. La última hora de reserva es 15:30 y la mesa se
   libera hacia las 17:15.

## 2. Preguntas para el restaurante (siguen abiertas: son datos que solo tiene él)

- Dirección, horarios, días de cierre y vacaciones.
- Número real de mesas, capacidades y cuáles se pueden juntar.
- Carta actual, con precios y alérgenos.
- Fotos y vídeo profesionales, o presupuestar una sesión.
- Garantía con tarjeta para grupos o días señalados: fuera de alcance mientras el coste
  sea 0 €.
- **Identidad de marca: aplicada** la de «Yerga · Arroces con alma». Paleta tierra,
  cobre, trigo, cal y oliva, con acentos de azulejo en cobalto y ocre. Tipografías
  Marcellus, Inter y Allura. Pendiente: el logotipo en vector (SVG o PDF) y la foto en
  alta resolución. ¿La foto de la abuela es real o una recreación? Si es una
  recreación, en la web debería ir una foto real de la familia.
- ¿Usan hoy algún sistema de reservas o TPV con el que haya que convivir?
- Dominio: por ahora no se registra (coste). La URL es la de workers.dev.
- Titular de la portada: ahora está «El arroz no espera. Tu mesa, sí.». Se cambia desde
  el panel.

## 3. Lo que solo se puede verificar con el despliegue

- **Turnstile y Resend** con claves reales: hay que hacer una reserva de prueba al
  desplegar. Con el remitente `onboarding@resend.dev`, Resend solo entrega a la
  dirección de la cuenta hasta verificar un dominio.
- **Despliegue real en Cloudflare:** lo hace la CI en cuanto estén los secretos. La CI
  verifica después la URL pública por sí sola (`scripts/produccion/verificar.mjs`).
- **Integración continua en GitHub:** ya se ejecuta y está en verde en cada pull request.

## 4. Decisiones menores ya aplicadas (decididas por Code, a confirmar)

- Tope por franja: 20 comensales nuevos cada 15 minutos (configurable por turno).
- Límite de intentos: ver `docs/SEGURIDAD.md`.
- Recordatorio solo si la reserva se hizo con más de 12 horas de antelación. Si no hay
  respuesta, se marca «sin confirmar» 4 horas antes.
- Agradecimiento con enlace a la reseña a partir de las 11:00 del día siguiente, solo
  para reservas finalizadas.
- Un teléfono existente no sobrescribe el nombre del cliente. La reserva guarda el
  nombre que se dio.
- Alergias con consentimiento explícito aparte, porque son un dato de salud.
- Las mesas que se quitan de una distribución se desactivan, no se borran, para conservar
  el historial.
- El primer administrador entra con «¿Has olvidado tu contraseña?». Ninguna contraseña
  inicial pasa por la CI ni por el repositorio.
- Cloudflare Web Analytics solo en la web pública, no en el panel.
- `@opennextjs/cloudflare` lleva un parche pequeño (`patches/`) para Next.js 16.4. Se
  puede quitar cuando OpenNext lo incluya.
