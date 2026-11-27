import { ChapterParamsSchema } from "@hiveshelf/shared";
import { notFound } from "next/navigation";
import { getBook, getChapter } from "@/lib/books";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ChapterContent } from "@/components/reader/chapter-content";

type ChapterPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
    order: string;
  }>;
};

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { locale, slug, order } = await params;

  const parsed = ChapterParamsSchema.safeParse({
    slug,
    order,
  });

  if (!parsed.success) notFound();

  const [book, chapter, t] = await Promise.all([
    getBook(parsed.data.slug),
    getChapter(parsed.data.slug, parsed.data.order),
    getTranslations({
      locale,
      namespace: "catalog.bookDetail",
    }),
  ]);

  if (!book || !chapter) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8 sm:px-6">
      <Link
        href={`/books/${encodeURIComponent(book.slug)}`}
        className="inline-block rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {t("backToBook")}
      </Link>

      <header className="mt-8 min-w-0">
        <p
          lang={book.languageTag}
          className="text-sm text-muted-foreground [overflow-wrap:anywhere]"
        >
          {book.title}
        </p>

        <h1
          lang={book.languageTag}
          className="mt-2 text-2xl font-bold [overflow-wrap:anywhere] sm:text-3xl"
        >
          {chapter.title}
        </h1>

        <div lang={book.languageTag} className="mt-8 min-w-0">
          <ChapterContent chapter={chapter} />
        </div>
      </header>
    </main>
  );
}
