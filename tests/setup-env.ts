import { loadEnvConfig } from "@next/env";

// Carga .env.local igual que Next.js para que las pruebas usen la misma base.
loadEnvConfig(process.cwd());
