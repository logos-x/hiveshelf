import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function BookNotFound() {
  const t = await getTranslations("catalog.bookDetail");

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>

      <p className="text-muted-foreground">{t("notFound.description")}</p>

      <Link
        href="/"
        className="inline-block rounded-lg border px-4 py-2 underline underline-offset-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t("backToHome")}
      </Link>
    </main>
  );
}
