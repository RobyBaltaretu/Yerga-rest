// Plantillas de textos legales. Son un punto de partida razonable, NO
// asesoramiento jurídico: deben revisarlas un asesor antes de publicar. Los datos
// entre corchetes salen de la configuración (panel → Configuración → datos legales).

export const paginasLegales = ["aviso-legal", "privacidad", "cookies"] as const;
export type PaginaLegal = (typeof paginasLegales)[number];

type Datos = { razon_social: string; cif: string; domicilio_social: string; correo: string; nombre_local: string; telefono: string };
type Texto = { titulo: string; secciones: { titulo: string; parrafos: string[] }[] };

export function textoLegal(pagina: PaginaLegal, locale: string, d: Datos): Texto {
  const l = locale === "va" ? "va" : locale === "en" ? "en" : "es";
  return plantillas[pagina][l](d);
}

const plantillas: Record<PaginaLegal, Record<"es" | "va" | "en", (d: Datos) => Texto>> = {
  "aviso-legal": {
    es: (d) => ({
      titulo: "Aviso legal",
      secciones: [
        { titulo: "Titular del sitio web", parrafos: [`En cumplimiento de la Ley 34/2002 de servicios de la sociedad de la información (LSSI-CE), se informa de que este sitio web es titularidad de ${d.razon_social}, con NIF ${d.cif} y domicilio en ${d.domicilio_social}. Correo de contacto: ${d.correo}. Teléfono: ${d.telefono}.`] },
        { titulo: "Objeto", parrafos: [`Este sitio informa sobre el restaurante ${d.nombre_local} y permite reservar mesa. El uso del sitio implica la aceptación de este aviso.`] },
        { titulo: "Propiedad intelectual", parrafos: ["Los textos, ilustraciones, logotipos y el diseño del sitio son propiedad del titular o se usan con licencia. No se permite su reproducción sin autorización."] },
        { titulo: "Responsabilidad", parrafos: ["La información de la carta (platos, precios y alérgenos) puede cambiar; en caso de duda, prevalece la que facilite el personal del restaurante."] },
        { titulo: "Legislación aplicable", parrafos: ["Este aviso se rige por la legislación española."] },
      ],
    }),
    va: (d) => ({
      titulo: "Avís legal",
      secciones: [
        { titulo: "Titular del lloc web", parrafos: [`D'acord amb la Llei 34/2002 (LSSI-CE), aquest lloc web és titularitat de ${d.razon_social}, amb NIF ${d.cif} i domicili a ${d.domicilio_social}. Correu: ${d.correo}. Telèfon: ${d.telefono}.`] },
        { titulo: "Objecte", parrafos: [`Aquest lloc informa sobre el restaurant ${d.nombre_local} i permet reservar taula.`] },
        { titulo: "Propietat intel·lectual", parrafos: ["Els textos, il·lustracions i el disseny són propietat del titular o s'usen amb llicència."] },
        { titulo: "Responsabilitat", parrafos: ["La informació de la carta pot canviar; en cas de dubte, preval la que facilite el personal."] },
        { titulo: "Legislació aplicable", parrafos: ["Aquest avís es regix per la legislació espanyola."] },
      ],
    }),
    en: (d) => ({
      titulo: "Legal notice",
      secciones: [
        { titulo: "Website owner", parrafos: [`Under Spanish Law 34/2002 (LSSI-CE), this website is owned by ${d.razon_social}, tax ID ${d.cif}, registered at ${d.domicilio_social}. Email: ${d.correo}. Phone: ${d.telefono}.`] },
        { titulo: "Purpose", parrafos: [`This site provides information about ${d.nombre_local} and allows table bookings.`] },
        { titulo: "Intellectual property", parrafos: ["Texts, illustrations and design belong to the owner or are used under licence."] },
        { titulo: "Liability", parrafos: ["Menu information may change; if in doubt, the information given by our staff prevails."] },
        { titulo: "Applicable law", parrafos: ["This notice is governed by Spanish law."] },
      ],
    }),
  },
  privacidad: {
    es: (d) => ({
      titulo: "Política de privacidad",
      secciones: [
        { titulo: "Responsable", parrafos: [`${d.razon_social} (NIF ${d.cif}), ${d.domicilio_social}. Contacto: ${d.correo}.`] },
        { titulo: "Qué datos tratamos y para qué", parrafos: ["Para gestionar tu reserva: nombre, teléfono, correo electrónico, número de comensales, fecha y hora, y las observaciones que nos indiques. La base legal es la ejecución de la reserva que solicitas.", "Alergias e intolerancias: son datos de salud. Solo los tratamos si nos los indicas y nos das tu consentimiento explícito, y únicamente para preparar tu comida con seguridad.", "Comunicaciones comerciales: solo si lo aceptas expresamente con una casilla separada. Puedes retirar el consentimiento en cualquier momento."] },
        { titulo: "Conservación", parrafos: ["Conservamos los datos de cliente mientras haya actividad. Tras 24 meses sin reservas se anonimizan automáticamente."] },
        { titulo: "Destinatarios", parrafos: ["Usamos proveedores que tratan datos por cuenta nuestra: alojamiento de la base de datos (Supabase), envío de correos (Resend), alojamiento web y protección antispam (Cloudflare). [Revisar ubicación y garantías de cada proveedor.] No cedemos datos a terceros salvo obligación legal."] },
        { titulo: "Tus derechos", parrafos: [`Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${d.correo}. También puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`] },
      ],
    }),
    va: (d) => ({
      titulo: "Política de privacitat",
      secciones: [
        { titulo: "Responsable", parrafos: [`${d.razon_social} (NIF ${d.cif}), ${d.domicilio_social}. Contacte: ${d.correo}.`] },
        { titulo: "Quines dades tractem i per a què", parrafos: ["Per a gestionar la teua reserva: nom, telèfon, correu, comensals, data i hora i observacions. La base legal és l'execució de la reserva.", "Al·lèrgies: són dades de salut. Només les tractem amb el teu consentiment explícit i per a preparar el menjar amb seguretat.", "Comunicacions comercials: només si ho acceptes expressament."] },
        { titulo: "Conservació", parrafos: ["Després de 24 mesos sense reserves, les dades s'anonimitzen automàticament."] },
        { titulo: "Destinataris", parrafos: ["Proveïdors que tracten dades per compte nostre: Supabase, Resend i Cloudflare. No cedim dades a tercers llevat d'obligació legal."] },
        { titulo: "Els teus drets", parrafos: [`Pots exercir els teus drets escrivint a ${d.correo} i reclamar davant l'AEPD (www.aepd.es).`] },
      ],
    }),
    en: (d) => ({
      titulo: "Privacy policy",
      secciones: [
        { titulo: "Controller", parrafos: [`${d.razon_social} (tax ID ${d.cif}), ${d.domicilio_social}. Contact: ${d.correo}.`] },
        { titulo: "What data we process and why", parrafos: ["To manage your booking: name, phone, email, party size, date and time and any notes. Legal basis: performing the booking you request.", "Allergies: these are health data. We only process them with your explicit consent and only to prepare your food safely.", "Marketing: only if you expressly opt in."] },
        { titulo: "Retention", parrafos: ["After 24 months without bookings, customer data is automatically anonymised."] },
        { titulo: "Recipients", parrafos: ["Processors acting on our behalf: Supabase, Resend and Cloudflare. We do not share data with third parties unless legally required."] },
        { titulo: "Your rights", parrafos: [`You may exercise your data protection rights by writing to ${d.correo} and complain to the Spanish DPA (www.aepd.es).`] },
      ],
    }),
  },
  cookies: {
    es: () => ({
      titulo: "Política de cookies",
      secciones: [
        { titulo: "Qué usamos", parrafos: ["La web pública no usa cookies de publicidad ni de seguimiento. La analítica es la de Cloudflare, sin cookies.", "Cloudflare Turnstile puede usar almacenamiento técnico para proteger el formulario de reserva frente a robots.", "El panel interno usa cookies técnicas de sesión, imprescindibles para iniciar sesión."] },
        { titulo: "Por qué no hay banner", parrafos: ["Las cookies técnicas estrictamente necesarias no requieren consentimiento. Si en el futuro se añadieran cookies no necesarias, se pedirá antes."] },
      ],
    }),
    va: () => ({
      titulo: "Política de galetes",
      secciones: [
        { titulo: "Què usem", parrafos: ["La web no usa galetes de publicitat ni de seguiment. L'analítica de Cloudflare no usa galetes. El panel intern usa galetes tècniques de sessió."] },
        { titulo: "Per què no hi ha bàner", parrafos: ["Les galetes tècniques necessàries no requerixen consentiment."] },
      ],
    }),
    en: () => ({
      titulo: "Cookie policy",
      secciones: [
        { titulo: "What we use", parrafos: ["This website uses no advertising or tracking cookies. Cloudflare analytics is cookieless. The staff panel uses strictly necessary session cookies."] },
        { titulo: "Why there is no banner", parrafos: ["Strictly necessary cookies do not require consent."] },
      ],
    }),
  },
};
