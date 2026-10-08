import { publicEnv } from "@/lib/env";

/**
 * Cloudflare Web Analytics: sin cookies ni datos personales, así que no necesita
 * consentimiento. Solo se incluye cuando hay token (producción).
 */
export function Analitica() {
  if (!publicEnv.cfAnalyticsToken) return null;
  return (
    <script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: publicEnv.cfAnalyticsToken })}
    />
  );
}
