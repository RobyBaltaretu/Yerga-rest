import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enlaceGestion, enviarCorreo, type TipoMensaje } from "@/lib/email/enviar";
import { formatFecha, formatHora } from "@/lib/format";
import { eventoReserva } from "@/lib/ics";
import { publicEnv } from "@/lib/env";

const botones: Record<string, Record<string, string>> = {
  gestionar: { es: "Ver o cambiar mi reserva", va: "Veure o canviar la meua reserva", en: "View or change my booking" },
  confirmar: { es: "Confirmo que voy", va: "Confirme que vinc", en: "Yes, I'm coming" },
  resena: { es: "Dejar una reseña", va: "Deixar una ressenya", en: "Leave a review" },
  reservar: { es: "Reservar ahora", va: "Reservar ara", en: "Book now" },
};

function comensalesTexto(n: number, idioma: string) {
  if (idioma === "en") return n === 1 ? "1 person" : `${n} people`;
  if (idioma === "va") return n === 1 ? "1 persona" : `${n} persones`;
  return n === 1 ? "1 persona" : `${n} personas`;
}

async function datosReserva(reservaId: string) {
  const db = createAdminClient();
  const [{ data: r }, { data: c }] = await Promise.all([
    db.from("reserva").select("*").eq("id", reservaId).single(),
    db.from("configuracion").select("nombre_local, telefono, url_resenas, direccion, localidad").eq("id", 1).single(),
  ]);
  return { r, c };
}

/** Correo transaccional sobre una reserva (confirmación, cambios, recordatorio...). */
export async function notificarReserva(reservaId: string, tipo: TipoMensaje): Promise<boolean> {
  const { r, c } = await datosReserva(reservaId);
  if (!r || !r.correo || !c) return false;
  const idioma = r.idioma;
  const enlace = enlaceGestion(r.codigo_gestion, idioma);
  const variables = {
    nombre: r.nombre.split(" ")[0],
    fecha: formatFecha(r.inicio, idioma),
    hora: formatHora(r.inicio),
    comensales: comensalesTexto(r.comensales, idioma),
    enlace,
    telefono: c.telefono,
    restaurante: c.nombre_local,
    resena: c.url_resenas,
  };

  const boton =
    tipo === "recordatorio"
      ? { texto: botones.confirmar[idioma], url: `${enlace}?accion=confirmar` }
      : tipo === "agradecimiento"
        ? { texto: botones.resena[idioma], url: c.url_resenas }
        : tipo === "cancelacion"
          ? undefined
          : { texto: botones.gestionar[idioma], url: enlace };

  const adjuntos =
    tipo === "confirmacion" || tipo === "modificacion"
      ? [
          {
            filename: "reserva-yerga.ics",
            contentType: "text/calendar",
            content: eventoReserva({
              id: r.id,
              inicio: r.inicio,
              fin: r.fin,
              titulo: `${c.nombre_local} · ${comensalesTexto(r.comensales, idioma)}`,
              descripcion: enlace,
              lugar: [c.direccion, c.localidad].filter(Boolean).join(", "),
              url: enlace,
            }),
          },
        ]
      : undefined;

  return enviarCorreo({ tipo, destinatario: r.correo, idioma, variables, reservaId: r.id, boton, adjuntos });
}

/** Al liberarse una mesa, avisa al primero de la lista de espera que ahora cabe. */
export async function avisarListaEspera(reservaId: string): Promise<void> {
  const db = createAdminClient();
  const { data: entrada } = await db.rpc("avisar_lista_espera", { p_reserva: reservaId });
  const e = entrada as { id: string; nombre: string; correo: string; idioma: string; fecha: string; comensales: number } | null;
  if (!e?.correo) return;
  const { data: c } = await db.from("configuracion").select("nombre_local, telefono").eq("id", 1).single();
  const enlace = `${publicEnv.siteUrl}/${e.idioma}/reservar?fecha=${e.fecha}&comensales=${e.comensales}`;
  await enviarCorreo({
    tipo: "lista_espera",
    destinatario: e.correo,
    idioma: e.idioma,
    listaEsperaId: e.id,
    variables: {
      nombre: e.nombre.split(" ")[0],
      fecha: formatFecha(`${e.fecha}T12:00:00Z`, e.idioma),
      comensales: comensalesTexto(e.comensales, e.idioma),
      enlace,
      telefono: c?.telefono ?? "",
      restaurante: c?.nombre_local ?? "Arrocería Yerga",
    },
    boton: { texto: botones.reservar[e.idioma] ?? botones.reservar.es, url: enlace },
  });
}
