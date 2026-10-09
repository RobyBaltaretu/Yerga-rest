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
  aceptarMesa: { es: "Aceptar la mesa", va: "Acceptar la taula", en: "Accept the table" },
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

/**
 * Al liberarse una mesa, se la ofrece al primero de la lista de espera que cabe: queda
 * retenida durante el plazo configurado y le llega un enlace para aceptarla con un toque.
 */
export async function avisarListaEspera(reservaId: string): Promise<void> {
  const db = createAdminClient();
  const { data: entrada } = await db.rpc("avisar_lista_espera", { p_reserva: reservaId });
  const e = entrada as { id: string; nombre: string; correo: string; idioma: string; fecha: string; comensales: number; oferta_token: string; oferta_inicio: string } | null;
  if (!e?.correo || !e.oferta_token) return;
  const { data: c } = await db.from("configuracion").select("nombre_local, telefono, espera_plazo_min").eq("id", 1).single();
  const enlace = `${publicEnv.siteUrl}/${e.idioma}/reservar/espera/${e.oferta_token}`;
  await enviarCorreo({
    tipo: "lista_espera",
    destinatario: e.correo,
    idioma: e.idioma,
    listaEsperaId: e.id,
    variables: {
      nombre: e.nombre.split(" ")[0],
      fecha: formatFecha(e.oferta_inicio, e.idioma),
      hora: formatHora(e.oferta_inicio),
      comensales: comensalesTexto(e.comensales, e.idioma),
      plazo: String(c?.espera_plazo_min ?? 15),
      enlace,
      telefono: c?.telefono ?? "",
      restaurante: c?.nombre_local ?? "Arrocería Yerga",
    },
    boton: { texto: botones.aceptarMesa[e.idioma] ?? botones.aceptarMesa.es, url: enlace },
  });
}

/** Ofertas de la lista de espera sin respuesta: caducan y pasan al siguiente. */
export async function rotarListaEspera(): Promise<number> {
  const { data } = await createAdminClient().rpc("caducar_ofertas_espera");
  const liberadas = (data ?? []) as string[];
  for (const id of liberadas) await avisarListaEspera(id);
  return liberadas.length;
}
