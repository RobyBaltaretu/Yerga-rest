import type { Metadata } from "next";
import { fraunces, inter } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s · Panel Yerga" },
  robots: { index: false, follow: false },
};

export default function PanelRootLayout({ children }: LayoutProps<"/panel">) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable} antialiased`}>
      <body className="min-h-dvh bg-arroz">{children}</body>
    </html>
  );
}
