import "server-only";
import { cache } from "react";
import {
  BookDetail,
  BookDetailSchema,
  ChapterContent,
  ChapterContentSchema,
} from "@hiveshelf/shared";
import { serverEnv } from "@/env";

export const getBook = cache(async (slug: string): Promise<BookDetail | null> => {
  const url = new URL(`/books/${encodeURIComponent(slug)}`, serverEnv.API_INTERNAL_URL);

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw new Error(`Book request failed with status ${response.status}`);
  }

  return BookDetailSchema.parse(await response.json());
});

export const getChapter = cache(
  async (slug: string, order: number): Promise<ChapterContent | null> => {
    const url = new URL(
      `/books/${encodeURIComponent(slug)}/chapters/${order}`,
      serverEnv.API_INTERNAL_URL,
    );

    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`Chapter request failed with status ${response.status}`);
    }

    return ChapterContentSchema.parse(await response.json());
  },
);
