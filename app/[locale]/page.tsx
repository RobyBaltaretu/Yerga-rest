import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations("home");

  return (
    <main className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="font-display text-5xl">{t("title")}</h1>
      <p className="mt-4 text-lg">{t("subtitle")}</p>
    </main>
  );
}
