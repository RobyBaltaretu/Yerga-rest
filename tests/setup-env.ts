import { existsSync } from "node:fs";

// Las pruebas usan la misma base que el desarrollo local (.env.local). En CI las
// variables llegan por el entorno.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
