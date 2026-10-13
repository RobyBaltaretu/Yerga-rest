import { Link } from "@/i18n/navigation";

export default function NoEncontrado() {
  return (
    <main id="contenido" className="grid min-h-[70dvh] place-items-center px-4 pt-24 text-center">
      <div>
        <p className="text-7xl font-semibold tracking-[-0.05em]">404</p>
        <p className="mt-2 text-lg">Esta página se nos ha pegado como el socarrat.</p>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-texto px-6 font-medium text-invertido shadow-tarjeta transition-colors hover:bg-texto/88 active:scale-[0.98]">Arrocería Yerga</Link>
      </div>
    </main>
  );
}
