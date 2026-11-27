"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useTransition } from "react";

type BookErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function BookError({ retry }: BookErrorProps) {
  const t = useTranslations("catalog.bookDetail");
  const [isPending, startTransition] = useTransition();

  function handleRetry() {
    startTransition(() => {
      retry();
    });
  }

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-2xl font-bold">{t("error.title")}</h1>

      <p className="text-muted-foreground">{t("error.description")}</p>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={handleRetry}
          disabled={isPending}
          aria-busy={isPending}
          className="rounded-lg border px-4 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? t("error.retrying") : t("error.retry")}
        </button>

        <Link
          href="/"
          className="inline-block rounded-lg border px-4 py-2 underline underline-offset-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {t("backToHome")}
        </Link>

        <p role="status" className="sr-only">
          {isPending ? t("error.retrying") : ""}
        </p>
      </div>
    </main>
  );
}
