import type { Metadata } from "next";
import Link from "next/link";
import { FormRecuperar } from "./FormRecuperar";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecuperarPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-brasa px-4">
      <div className="w-full max-w-sm rounded-3xl bg-arroz p-8 shadow-2xl">
        <h1 className="font-display text-3xl">Recuperar contraseña</h1>
        <p className="mt-2 text-sm text-niebla">Te enviaremos un enlace para elegir una contraseña nueva.</p>
        <FormRecuperar />
        <p className="mt-6 text-center text-sm">
          <Link href="/panel/acceso" className="font-semibold underline underline-offset-4">Volver al acceso</Link>
        </p>
      </div>
    </main>
  );
}
