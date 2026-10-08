import { z } from "zod";

// Esquemas compartidos entre los formularios (cliente) y las acciones (servidor).
// Los mensajes son claves de traducción del espacio «reserva.errores».

export const idiomas = ["es", "va", "en"] as const;
export const ocasiones = ["cumpleanos", "aniversario", "negocios", "celebracion", "otra"] as const;

export const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "fecha");
export const instanteISO = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "hora");

export const telefono = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{9,20}$/, "telefono");

export const arrozEncargado = z.object({
  plato_id: z.guid(),
  raciones: z.coerce.number().int().min(1).max(40),
});

export const datosCliente = z
  .object({
    nombre: z.string().trim().min(2, "nombre").max(80, "nombre"),
    telefono,
    correo: z.email("correo").max(120),
    idioma: z.enum(idiomas),
    alergias: z.string().trim().max(300).optional().default(""),
    consiente_salud: z.boolean().optional().default(false),
    ocasion: z.enum(ocasiones).optional().or(z.literal("")),
    tronas: z.coerce.number().int().min(0).max(4).default(0),
    silla_ruedas: z.boolean().default(false),
    notas: z.string().trim().max(500).optional().default(""),
    acepta_privacidad: z.literal(true, "privacidad"),
    consiente_comercial: z.boolean().default(false),
  })
  // Las alergias son un dato de salud: requieren consentimiento explícito.
  .refine((d) => !d.alergias || d.consiente_salud, {
    message: "salud",
    path: ["consiente_salud"],
  });

export type DatosCliente = z.infer<typeof datosCliente>;

export const confirmacion = z.object({
  token: z.guid().nullable(),
  inicio: instanteISO,
  comensales: z.coerce.number().int().min(1).max(40),
  zona_id: z.guid().nullable().optional(),
  arroces: z.array(arrozEncargado).max(4).default([]),
  segundos: z.coerce.number().int().min(0).max(36_000).optional(),
  turnstile: z.string().optional(),
  datos: datosCliente,
});

export const solicitudGrupo = z.object({
  fecha: fechaISO,
  hora: z.string().regex(/^\d{2}:\d{2}$/, "hora"),
  comensales: z.coerce.number().int().min(2).max(200),
  turnstile: z.string().optional(),
  datos: datosCliente,
});

export const listaEspera = z.object({
  fecha: fechaISO,
  turno: z.enum(["comida", "cena"]),
  hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  comensales: z.coerce.number().int().min(1).max(40),
  turnstile: z.string().optional(),
  nombre: z.string().trim().min(2, "nombre").max(80),
  telefono,
  correo: z.email("correo"),
  idioma: z.enum(idiomas),
  acepta_privacidad: z.literal(true, "privacidad"),
});

/** Primer mensaje de error de Zod por campo, para mostrar en el formulario. */
export function erroresPorCampo(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = issue.path.filter((p) => typeof p === "string").at(-1) ?? "form";
    out[campo as string] ??= issue.message;
  }
  return out;
}
