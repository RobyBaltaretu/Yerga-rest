import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { fraunces, inter } from "@/lib/fonts";
import { htmlLang } from "@/lib/i18n";
import { Cabecera } from "@/components/web/Cabecera";
import { Pie } from "@/components/web/Pie";
import { BotonReservaFijo } from "@/components/web/CabeceraCliente";
import { ScrollSuave } from "@/components/web/ScrollSuave";
import { publicEnv } from "@/lib/env";
import "../globals.css";

// Modo ligero antes del primer pintado: ahorro de datos o equipos modestos.
const scriptLigero = `try{var c=navigator.connection;if((c&&c.saveData)||(navigator.deviceMemory&&navigator.deviceMemory<=2)){document.documentElement.classList.add('ligera')}}catch(e){}`;

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: t("title"), template: `%s · Arrocería Yerga` },
    description: t("description"),
    alternates: { languages: { es: "/es", "ca-ES": "/va", en: "/en", "x-default": "/es" } },
    openGraph: { siteName: "Arrocería Yerga", locale: locale === "va" ? "ca_ES" : locale === "en" ? "en_GB" : "es_ES", type: "website" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  // Al navegador solo viajan los textos que usan los componentes de cliente.
  const mensajes = (await getMessages()) as { reserva: unknown; web: { nav: unknown } };
  const cliente = { reserva: mensajes.reserva, web: { nav: mensajes.web.nav } };

  return (
    <html
      lang={htmlLang(locale)}
      className={`${fraunces.variable} ${inter.variable} antialiased`}
    >
      <body className="min-h-dvh">
        <script dangerouslySetInnerHTML={{ __html: scriptLigero }} />
        <NextIntlClientProvider messages={cliente as never}>
          <Cabecera locale={locale} />
          {children}
          <Pie />
          <BotonReservaFijo locale={locale} />
          <ScrollSuave />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
