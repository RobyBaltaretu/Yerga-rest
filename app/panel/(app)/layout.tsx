import { redirect } from "next/navigation";
import { getSesion } from "@/lib/panel/sesion";
import { NavPanel } from "@/components/panel/NavPanel";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const sesion = await getSesion();
  if (sesion.debe_cambiar_clave) redirect("/panel/clave");
  return (
    <div className="min-h-dvh lg:flex">
      <NavPanel nombre={sesion.nombre} rol={sesion.rol} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
