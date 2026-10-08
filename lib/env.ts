// Lectura centralizada de variables de entorno. Las públicas se inyectan en el
// cliente en tiempo de compilación; las privadas solo existen en el servidor.

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Vacía = Turnstile desactivado (desarrollo sin red). En producción es obligatoria.
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
};

export function serverEnv() {
  return {
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "Arrocería Yerga <reservas@example.com>",
    cronSecret: process.env.CRON_SECRET ?? "",
  };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}
