import "server-only";
import { render, toPlainText } from "@react-email/render";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicEnv, serverEnv } from "@/lib/env";
import { CorreoYerga } from "./disenio";

export type TipoMensaje =
  | "confirmacion"
  | "recordatorio"
  | "agradecimiento"
  | "cancelacion"
  | "modificacion"
  | "lista_espera"
  | "solicitud_grupo";

type Envio = {
  tipo: TipoMensaje;
  destinatario: string;
  idioma: string;
  variables: Record<string, string | number>;
  reservaId?: string;
  listaEsperaId?: string;
  boton?: { texto: string; url: string };
  adjuntos?: { filename: string; content: string; contentType: string }[];
};

const pies: Record<string, string> = {
  es: "Recibes este correo por tu reserva en Arrocería Yerga. Tus datos se usan solo para gestionarla.",
  va: "Reps aquest correu per la teua reserva a l'Arrossera Yerga. Les teues dades s'usen només per a gestionar-la.",
  en: "You are receiving this email because of your booking at Arrocería Yerga. Your data is used only to manage it.",
};

/** Sustituye {variable} por su valor. */
export function rellenar(texto: string, variables: Record<string, string | number>): string {
  return texto.replace(/\{(\w+)\}/g, (_, k: string) => String(variables[k] ?? `{${k}}`));
}

/**
 * Envía un correo a partir de su plantilla editable en el panel. Siempre queda
 * registrado en la tabla `mensaje`. Sin RESEND_API_KEY se marca como «simulado»
 * y se muestra en consola: útil en desarrollo y pruebas.
 * Devuelve false si ya existía (recordatorios y agradecimientos son únicos).
 */
export async function enviarCorreo(envio: Envio): Promise<boolean> {
  const db = createAdminClient();
  const idioma = ["es", "va", "en"].includes(envio.idioma) ? envio.idioma : "es";

  const { data: plantilla } = await db
    .from("plantilla_mensaje")
    .select("asunto, cuerpo")
    .eq("tipo", envio.tipo)
    .eq("idioma", idioma)
    .maybeSingle();
  if (!plantilla) {
    console.error(`Falta la plantilla ${envio.tipo}/${idioma}`);
    return false;
  }

  const asunto = rellenar(plantilla.asunto, envio.variables);
  const cuerpo = rellenar(plantilla.cuerpo, envio.variables);
  const parrafos = cuerpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const html = await render(
    CorreoYerga({ idioma, asunto, parrafos, boton: envio.boton, pie: pies[idioma] }),
  );
  const texto = toPlainText(html);

  const { data: mensaje, error } = await db
    .from("mensaje")
    .insert({
      tipo: envio.tipo,
      reserva_id: envio.reservaId ?? null,
      lista_espera_id: envio.listaEsperaId ?? null,
      destinatario: envio.destinatario,
      idioma,
      asunto,
      cuerpo_texto: texto,
    })
    .select("id")
    .single();
  if (error) {
    // 23505: ya se envió (índice único de recordatorio/agradecimiento).
    if (error.code !== "23505") console.error("mensaje", error);
    return false;
  }

  const { resendApiKey, emailFrom } = serverEnv();
  if (!resendApiKey) {
    console.info(`[correo simulado] ${envio.tipo} → ${envio.destinatario}: ${asunto}`);
    await db.from("mensaje").update({ estado: "simulado", enviado_en: new Date().toISOString() }).eq("id", mensaje.id);
    return true;
  }

  try {
    const resend = new Resend(resendApiKey);
    const { data, error: errEnvio } = await resend.emails.send({
      from: emailFrom,
      to: envio.destinatario,
      subject: asunto,
      html,
      text: texto,
      attachments: envio.adjuntos?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        contentType: a.contentType,
      })),
    });
    if (errEnvio) throw new Error(errEnvio.message);
    await db
      .from("mensaje")
      .update({ estado: "enviado", proveedor_id: data?.id ?? null, enviado_en: new Date().toISOString() })
      .eq("id", mensaje.id);
    return true;
  } catch (e) {
    await db.from("mensaje").update({ estado: "error", error: String(e) }).eq("id", mensaje.id);
    console.error("Resend", e);
    return false;
  }
}

export function enlaceGestion(codigo: string, idioma: string) {
  return `${publicEnv.siteUrl}/${idioma}/reservar/gestion/${encodeURIComponent(codigo)}`;
}
