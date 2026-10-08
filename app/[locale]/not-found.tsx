import { Link } from "@/i18n/navigation";

export default function NoEncontrado() {
  return (
    <main id="contenido" className="grid min-h-[70dvh] place-items-center px-4 pt-24 text-center">
      <div>
        <p className="font-display text-7xl">404</p>
        <p className="mt-2 text-lg">Esta página se nos ha pegado como el socarrat.</p>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-pimenton px-6 font-semibold text-white">Arrocería Yerga</Link>
      </div>
    </main>
  );
}
