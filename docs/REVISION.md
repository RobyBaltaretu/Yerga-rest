# Revisión de la definición de producto

Revisión crítica de `docs/definicion-producto.pdf` antes de construir. Para cada punto se
indica la **decisión aplicada** en la construcción, de modo que nada queda bloqueado. Las
que necesitan confirmación del restaurante o del propietario están también en `docs/DUDAS.md`.

Valoración general: el documento es sólido. Tiene un objetivo claro (llenar mesas sin
sobreventa), un modelo de datos bien pensado (la separación reserva/asignación es la
decisión correcta) y criterios de aceptación verificables. Los problemas encontrados son
sobre todo de alcance entre fases, de valores que no encajan entre sí y de supuestos sobre
planes gratuitos que no se sostienen.

## 1. Contradicciones de alcance

| # | Hallazgo | Decisión aplicada |
|---|---|---|
| 1.1 | El flujo de reserva (paso 2) y el módulo «Lista de espera» del panel están en la fase 1, pero «Lista de espera con avisos» aparece en la fase 2 y ninguna etapa la construye. | Fase 1 incluye la captura («Avísame si se libera»), la lista en el panel y un aviso por correo al primero de la lista cuando se cancela una reserva. Los 15 min de aceptación y el WhatsApp quedan para la fase 2. |
| 1.2 | «Clientes», «Arroces del día» e «Informes» están en la tabla de módulos del panel pero son fase 2. El objetivo «Agilizar cocina» (50 % con arroz elegido) se mide en los primeros 3 meses. | Se construye una versión básica de los tres (ficha con historial, resumen imprimible de arroces, cuatro indicadores). Su coste es bajo porque los datos ya existen; sin ellos no se pueden medir los objetivos. |
| 1.3 | El estado «sin confirmar» (sin respuesta al recordatorio) no figura en la tabla de estados. | Se modela como marca (`sin_confirmar`) sobre una reserva confirmada, no como estado: la mesa sigue bloqueada y la sala ve el aviso para llamar. |
| 1.4 | «Garantía con tarjeta» aparece como pregunta abierta, en riesgos y en fase 2. | Fuera de la fase 1. El modelo deja sitio (estado `pendiente` para grupos). |

## 2. Valores que no encajan entre sí

| # | Hallazgo | Decisión aplicada |
|---|---|---|
| 2.1 | Tamaño máximo online 10, pero con la semilla la mayor capacidad reservable es 8 (dos mesas de 4 juntas). Un grupo de 9 o 10 nunca verá horas y no sabrá por qué. | Cuando ningún candidato admite el grupo, el flujo muestra directamente la solicitud de grupo. Se recomienda definir combinaciones mayores (ver dudas). |
| 2.2 | Última hora de comida 15:30 + 105 min = 17:15, pero el turno de la semilla termina a las 16:30. Igual en cena: 22:30 + 105 = 00:15 frente a 23:30. | Se interpreta «fin de turno» como cierre de cocina, no como hora de salida. Las estancias pueden pasar del fin; la última hora reservable es la que manda. |
| 2.3 | La cena acaba después de medianoche. | Todos los intervalos son `tstzrange` reales, así que cruzar el día no da problemas. Pruebas cubren la cena del sábado. |
| 2.4 | «Tope por franja» no tiene valor inicial. | 20 comensales nuevos cada 15 min, configurable por turno. |
| 2.5 | La retención empieza «al elegir hora», pero la zona y el arroz se eligen después. | Se retiene al elegir hora en la mejor zona libre; si el cliente elige otra zona se cambia la retención. Cuenta atrás visible; si caduca se intenta renovar en silencio. |
| 2.6 | «Alergia grave» no se distingue de una alergia normal en el formulario. | Se resalta cualquier reserva con alergias o necesidades de accesibilidad. |
| 2.7 | «Datos legales» (lo que el encargado no puede editar) no está definido. | Se interpreta como los datos de la empresa (razón social, CIF, domicilio) y los textos legales. |
| 2.8 | Supuesto «cena fines de semana» frente a semilla «viernes y sábado». | Se sigue la semilla. Domingo noche cerrado. |

## 3. Riesgos técnicos no recogidos

| # | Hallazgo | Impacto | Decisión aplicada |
|---|---|---|---|
| 3.1 | **Cloudflare Workers gratuito**: límite de 3 MiB comprimidos por worker y 10 ms de CPU por petición. Una aplicación Next.js con panel, Konva y GSAP suele pasar de 3 MiB, y el renderizado en servidor suele superar 10 ms. | El despliegue en el plan gratuito puede fallar o dar errores 1102 en producción. | **Actualizado (8 oct 2026):** se mantiene el plan gratuito. La web pública se prerenderiza y el panel pasa a aplicación de navegador para no superar los 10 ms; ver `docs/INFRA-COSTE-CERO.md`. Workers de pago (5 USD/mes) queda solo como último recurso, a decidir por el propietario. La documentación de Cloudflare ya no fija un límite de tamaño comprimido; lo confirma el primer despliegue. |
| 3.2 | **Supabase gratuito** no incluye copias de seguridad diarias descargables y pausa proyectos sin actividad 7 días. El requisito de seguridad pide copias diarias. | Pérdida de datos posible. | **Actualizado (8 oct 2026):** se mantiene el plan gratuito. Copia diaria cifrada a un repositorio privado mediante un flujo programado; ver `docs/INFRA-COSTE-CERO.md`. La pausa no aplica porque el cron consulta la base cada 5 minutos. |
| 3.3 | El documento cita `middleware`; en Next.js 16 se llama `proxy.ts`. | Ninguno si se sabe. | Se usa `proxy.ts`. |
| 3.4 | La analítica sin cookies de Cloudflare no registra eventos, así que no mide «visitas que completan una reserva» ni el «tiempo para reservar». | Dos de los siete objetivos no serían medibles. | El tiempo se mide en servidor (de retención a confirmación) y se guarda en la reserva. La conversión se calcula con visitas de Cloudflare frente a reservas web, y aparece en Informes. |
| 3.5 | Recordatorios solo por correo en fase 1: la tasa de respuesta suele ser baja. | Muchas reservas «sin confirmar» y llamadas para la sala. | Se aplica. Conviene adelantar WhatsApp si el volumen de llamadas molesta. |
| 3.6 | Un cliente se identifica por teléfono; una familia que comparte número sobrescribiría nombre y correo. | Datos de cliente mezclados. | Al reservar online no se sobrescribe el nombre de un cliente existente; el correo solo se rellena si estaba vacío. La reserva guarda su propio nombre. |
| 3.7 | Las alergias son dato de salud (categoría especial, art. 9 RGPD). | Requiere consentimiento explícito o base legal clara. | Casilla específica que aparece solo si se escriben alergias; se borran a los 24 meses con el cliente. A revisar por asesor. |
| 3.8 | «Sentar a alguien retira la mesa de la web en menos de 5 s»: cualquier caché de páginas lo rompe. | Criterio de aceptación incumplido. | La disponibilidad nunca se cachea; se consulta a la base en cada petición. |
| 3.9 | Una distribución publicada con reservas futuras: el documento cubre el caso, pero no qué pasa con la mesa de una reserva ya sentada. | Mover gente en pleno servicio. | Las reservas sentadas o del servicio en curso no se reasignan nunca al publicar; si su mesa desaparece se publica igual a partir del siguiente turno y se avisa. |
| 3.10 | Portada con vídeo en móvil: no existe vídeo y el plan pide ilustración generada en código. | — | Se usa una versión SVG ligera y estática por escenas en lugar del vídeo. |
| 3.11 | Sonido del «chup-chup» sin archivo de audio. | — | Se sintetiza con Web Audio API (sin peso de descarga), desactivado por defecto. |

## 4. Huecos funcionales

| # | Hallazgo | Decisión aplicada |
|---|---|---|
| 4.1 | No se dice hasta cuándo puede **modificar** el cliente su reserva. | Mismas 3 horas que la cancelación. Una modificación es una nueva retención y confirmación atómica que libera la anterior. |
| 4.2 | No se define qué ve el cliente si el grupo supera 10. | Formulario de solicitud: crea una reserva `pendiente` sin mesa; la sala la aprueba asignando mesa. |
| 4.3 | No se dice qué ocurre si dos retenciones caducan y el cliente pulsa confirmar después. | Se intenta confirmar igualmente si la mesa sigue libre; si no, se ofrecen las tres horas más cercanas. |
| 4.4 | Plantillas de mensajes: se mencionan en Configuración pero no qué variables admiten. | Variables `{nombre}`, `{fecha}`, `{hora}`, `{comensales}`, `{enlace}`, `{telefono}` en los tres idiomas. |
| 4.5 | Festivos y vacaciones dependen de bloqueos manuales. | Se aplica. Fallas y Día de la Madre son buenos candidatos a bloqueos parciales o topes menores. |
| 4.6 | Reseñas «reales enlazadas a su origen»: no hay API gratuita fiable sin clave de Google. | Sección alimentada desde el panel (texto, autor, enlace al origen). |
| 4.7 | El panel abre en «Servicio de hoy», pero no hay criterio para elegir turno. | Se muestra el turno en curso o el siguiente del día. |
| 4.8 | Límite de intentos sin valores. | 10 retenciones por IP cada 10 min; 5 accesos fallidos al panel por correo cada 15 min (además del límite propio de Supabase Auth). |

## 5. Contenidos y legal

- Los textos en valenciano los redacto yo como borrador; deben revisarlos una persona nativa.
- Precios, alérgenos y platos de la semilla están marcados como «ejemplo» y aparecen así en la web hasta que se sustituyan.
- Aviso legal, privacidad y cookies son plantillas con campos entre corchetes: debe revisarlos un asesor.
- Sin cookies de terceros: no hace falta banner si la analítica es la de Cloudflare.

## 6. Lo que está especialmente bien

- La restricción de exclusión como garantía última de no sobreventa.
- Separar la reserva de su asignación, que es lo que permite mover y juntar mesas.
- Las reservas «puerta» que nacen sentadas para que la web cuente con ellas.
- Los modos separados del mapa (editar y servicio) para no descolocar la sala en pleno servicio.
- Criterios de aceptación concretos y verificables.
