import { NavPanel } from "@/components/panel/NavPanel";
import { TiempoReal } from "@/components/panel/TiempoReal";
import { ProveedorRecarga, ProveedorSesion } from "@/components/panel/DatosPanel";

/**
 * Carcasa del panel. No lee datos en el servidor: `proxy.ts` ya ha comprobado la sesión
 * y cada pantalla pide lo suyo desde el navegador (ver components/panel/DatosPanel.tsx).
 */
export default function PanelLayout({ children }: LayoutProps<"/panel">) {
  return (
    <ProveedorSesion>
      <ProveedorRecarga>
        <div className="min-h-dvh lg:flex">
          <NavPanel />
          <div className="min-w-0 flex-1">
            <TiempoReal>{children}</TiempoReal>
          </div>
        </div>
      </ProveedorRecarga>
    </ProveedorSesion>
  );
}
