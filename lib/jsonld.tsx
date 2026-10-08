import { publicEnv } from "@/lib/env";

type Config = { nombre_local: string; direccion: string; localidad: string; codigo_postal: string; telefono: string; latitud: number | null; longitud: number | null; url_mapa: string };
type Turno = { nombre: string; dia_semana: number; inicio: string; fin: string };
type Plato = { categoria: string; nombre: unknown; descripcion: unknown; precio: number | null };

const dias = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Datos estructurados del restaurante (schema.org Restaurant + ReserveAction). */
export function jsonLdRestaurante(c: Config, turnos: Turno[], locale: string) {
  const base = publicEnv.siteUrl;
  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${base}/#restaurante`,
    name: c.nombre_local,
    url: `${base}/${locale}`,
    telephone: c.telefono,
    servesCuisine: ["Valencian", "Spanish", "Paella"],
    priceRange: "€€",
    acceptsReservations: true,
    hasMenu: `${base}/${locale}/carta`,
    address: {
      "@type": "PostalAddress",
      streetAddress: c.direccion,
      addressLocality: c.localidad,
      postalCode: c.codigo_postal,
      addressCountry: "ES",
    },
    ...(c.latitud && c.longitud ? { geo: { "@type": "GeoCoordinates", latitude: c.latitud, longitude: c.longitud } } : {}),
    openingHoursSpecification: turnos.map((t) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: dias[t.dia_semana],
      opens: t.inicio.slice(0, 5),
      closes: t.fin.slice(0, 5),
    })),
    potentialAction: {
      "@type": "ReserveAction",
      target: { "@type": "EntryPoint", urlTemplate: `${base}/${locale}/reservar`, inLanguage: locale, actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] },
      result: { "@type": "FoodEstablishmentReservation", name: "Reserva" },
    },
  };
}

/** Carta en schema.org Menu. */
export function jsonLdCarta(platos: Plato[], locale: string, nombre: (v: unknown) => string, secciones: Record<string, string>) {
  const grupos = ["arroz", "entrante", "postre", "menu_grupo"];
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    "@id": `${publicEnv.siteUrl}/${locale}/carta`,
    inLanguage: locale === "va" ? "ca-ES-valencia" : locale,
    hasMenuSection: grupos.map((g) => ({
      "@type": "MenuSection",
      name: secciones[g],
      hasMenuItem: platos
        .filter((p) => p.categoria === g)
        .map((p) => ({
          "@type": "MenuItem",
          name: nombre(p.nombre),
          description: nombre(p.descripcion),
          ...(p.precio != null ? { offers: { "@type": "Offer", price: p.precio, priceCurrency: "EUR" } } : {}),
        })),
    })),
  };
}

export function JsonLd({ datos }: { datos: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }} />;
}
