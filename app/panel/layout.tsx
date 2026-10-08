import type { Metadata } from "next";
import { inter, marcellus } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Yerga" },
  robots: { index: false, follow: false },
};

export default function PanelRootLayout({ children }: LayoutProps<"/panel">) {
  return (
    <html lang="es" className={`${marcellus.variable} ${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-arroz">{children}</body>
    </html>
  );
}
