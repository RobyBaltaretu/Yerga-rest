// Evento de calendario (.ics) para la reserva.

function utc(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapar(texto: string) {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function eventoReserva(opts: {
  id: string;
  inicio: string | Date;
  fin: string | Date;
  titulo: string;
  descripcion: string;
  lugar: string;
  url?: string;
}): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Arroceria Yerga//Reservas//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.id}@yerga`,
    `DTSTAMP:${utc(new Date())}`,
    `DTSTART:${utc(new Date(opts.inicio))}`,
    `DTEND:${utc(new Date(opts.fin))}`,
    `SUMMARY:${escapar(opts.titulo)}`,
    `DESCRIPTION:${escapar(opts.descripcion)}`,
    `LOCATION:${escapar(opts.lugar)}`,
    ...(opts.url ? [`URL:${opts.url}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT3H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapar(opts.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.join("\r\n");
}
