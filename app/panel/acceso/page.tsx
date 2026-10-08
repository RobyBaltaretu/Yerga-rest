import type { Metadata } from "next";
import Link from "next/link";
import { FormAcceso } from "./FormAcceso";
import { CenefaAzulejo, LogoCompleto } from "@/components/marca/Marca";

export const metadata: Metadata = { title: "Acceso" };

export default async function AccesoPage({
  searchParams,
}: PageProps<"/panel/acceso">) {
  const sp = await searchParams;
  const siguiente = typeof sp.siguiente === "string" ? sp.siguiente : "/panel";
  return (
    <main className="grid min-h-dvh place-items-center bg-brasa px-4">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-arroz shadow-2xl">
        <CenefaAzulejo />
        <div className="p-8 pt-6">
          <LogoCompleto sizes="200px" className="mx-auto h-auto w-44" />
          <h1 className="mt-4 text-center font-display text-3xl">
            Panel de sala
          </h1>
          <FormAcceso
            siguiente={siguiente}
            aviso={
              sp.error === "sin_permiso"
                ? "Tu usuario no tiene acceso al panel."
                : sp.error === "enlace"
                  ? "El enlace ha caducado o ya se ha usado. Pide otro."
                  : undefined
            }
          />
          <p className="mt-4 text-center text-sm">
            <Link
              href="/panel/acceso/recuperar"
              className="font-semibold underline underline-offset-4"
            >
              ¿Has olvidado tu contraseña?
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
