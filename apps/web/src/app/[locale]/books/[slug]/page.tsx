import type { Metadata } from "next";
import { getBook } from "@/lib/books";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";

type BookDetailPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: BookDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const [book, t] = await Promise.all([
    getBook(slug),
    getTranslations({
      locale,
      namespace: "catalog.bookDetail.metadata",
    }),
  ]);

  if (!book) notFound();

  const description =
    book.description?.replace(/\s+/g, " ").trim() ||
    t("fallbackDescription", {
      title: book.title,
    });

  return {
    title: t("title", {
      title: book.title,
    }),
    description,
  };
}

function getSourceHref(value: string | null): string | undefined {
  if (!value) return undefined;

  try {
    const url = new URL(value);

    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    return undefined;
  }

  return undefined;
}

export default async function BookDetailPage({ params }: BookDetailPageProps) {
  const { locale, slug } = await params;

  const [book, t] = await Promise.all([
    getBook(slug),
    getTranslations({
      locale,
      namespace: "catalog.bookDetail",
    }),
  ]);

  if (!book) notFound();

  const languageName =
    new Intl.DisplayNames([locale], {
      type: "language",
    }).of(book.languageTag) ?? book.languageTag;

  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t("backToHome")}
      </Link>

      <article className="mt-8 min-w-0">
        <header className="grid min-w-0 gap-6 md:grid-cols-[12rem_minmax(0,1fr)]">
          <Image
            src="/images/book-cover-placeholder.svg"
            alt={t("coverPlaceholder")}
            width={192}
            height={288}
            className="h-auto w-full max-w-48 rounded-lg border"
          />

          <div className="min-w-0">
            <h1
              lang={book.languageTag}
              className="text-3xl font-bold [overflow-wrap:anywhere] sm:text-4xl"
            >
              {book.title}
            </h1>

            <dl className="mt-6 space-y-4">
              <div>
                <dt className="font-semibold">{t("authors")}</dt>
                <dd className="mt-1 [overflow-wrap:anywhere]">
                  {book.authorNames.length > 0 ? book.authorNames.join(", ") : t("unknownAuthors")}
                </dd>
              </div>

              <div>
                <dt className="font-semibold">{t("language")}</dt>
                <dd className="mt-1">{languageName}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section aria-labelledby="book-description" className="mt-10 min-w-0">
          <h2 id="book-description" className="text-xl font-semibold">
            {t("description")}
          </h2>
          <p
            lang={book.description?.trim() ? book.languageTag : undefined}
            className="mt-3 whitespace-pre-line leading-relaxed [overflow-wrap:anywhere]"
          >
            {book.description?.trim() || t("noDescription")}
          </p>
        </section>

        <section aria-labelledby="book-sources" className="mt-10 min-w-0">
          <h2 id="book-sources" className="text-xl font-semibold">
            {t("sources")}
          </h2>

          {book.sources.length === 0 ? (
            <p className="mt-3">{t("noSources")}</p>
          ) : (
            <ul className="mt-3 space-y-4">
              {book.sources.map((source, index) => {
                const href = getSourceHref(source.sourceUrl);

                return (
                  <li
                    key={index}
                    className="min-w-0 rounded-lg border p-4 [overflow-wrap:anywhere]"
                  >
                    <p className="whitespace-pre-line">{source.citation}</p>

                    {href && (
                      <a
                        href={href}
                        className="mt-2 inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                      >
                        {t("sourceLink")}
                      </a>
                    )}

                    <dl className="mt-3">
                      <dt className="font-semibold">{t("rights")}</dt>
                      <dd className="mt-1 whitespace-pre-line">
                        {source.rightsStatement?.trim() || t("noRightsStatement")}
                      </dd>
                    </dl>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="book-chapters" className="mt-10 min-w-0">
          <h2 id="book-chapters" className="text-xl font-semibold">
            {t("tableOfContents")}
          </h2>

          {book.chapters.length === 0 ? (
            <p className="mt-3">{t("noChapters")}</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {book.chapters.map((chapter) => (
                <li key={chapter.chapterId} className="min-w-0">
                  <Link
                    href={`/books/${encodeURIComponent(book.slug)}/chapters/${chapter.order}`}
                    lang={book.languageTag}
                    className="block rounded-lg border px-4 py-3 [overflow-wrap:anywhere] hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-4"
                  >
                    {t("chapterLink", {
                      order: chapter.order,
                      title: chapter.title,
                    })}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </article>
    </main>
  );
}
