import { getTranslations } from "next-intl/server";

export default async function BookLoading() {
  const t = await getTranslations("catalog.bookDetail");

  return (
    <main aria-busy="true" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 sm:px-6">
      <p role="status" className="sr-only">
        {t("loading")}
      </p>

      <div aria-hidden="true" className="space-y-10 motion-safe:animate-pulse">
        <div className="h-5 w-28 rounded bg-muted" />

        <div className="grid gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="aspect-[2/3] w-full max-w-48 rounded-lg bg-muted" />

          <div className="min-w-0 space-y-5">
            <div className="h-10 w-4/5 rounded bg-muted" />
            <div className="h-6 w-1/2 rounded bg-muted" />
            <div className="h-5 w-1/3 rounded bg-muted" />
          </div>

          <div className="space-y-3">
            <div className="h-7 w-36 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>

          <div className="space-y-3">
            <div className="h-7 w-28 rounded bg-muted" />
            <div className="h-14 w-full rounded bg-muted" />
            <div className="h-14 w-full rounded bg-muted" />
            <div className="h-14 w-full rounded bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
