import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Cabeceras de seguridad. La CSP permite scripts en línea porque la web pública se
// prerenderiza (un nonce exigiría renderizar cada petición, que es lo que se evita para
// no gastar CPU en el plan gratuito); aun así limita orígenes, marcos y conexiones.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const supabaseWs = supabase.replace(/^http/, "ws");
const desarrollo = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${desarrollo ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${supabaseWs} https://cloudflareinsights.com`,
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const cabeceras = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
  // Toda la app lee datos vivos (disponibilidad, reservas): usamos el modelo de
  // renderizado clásico, sin Cache Components, que es el que OpenNext soporta mejor.
  cacheComponents: false,
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(nextConfig);
