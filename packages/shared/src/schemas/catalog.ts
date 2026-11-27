import { z } from "zod";

const CatalogTermSchema = z.object({
  slug: z.string(),
  name: z.string(),
});

export const PaginationSchema = z.object({
  page: z.int().min(1),
  pageSize: z.int().min(1).max(100),
  total: z.int().nonnegative(),
  totalPages: z.int().nonnegative(),
});

export const BookListItemSchema = z.object({
  workId: z.uuid(),
  slug: z.string(),
  editionId: z.uuid(),
  editionSlug: z.string(),
  languageTag: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  genres: z.array(CatalogTermSchema),
  tags: z.array(CatalogTermSchema),
  publishedAt: z.iso.datetime(),
});

export const BookListResponseSchema = z.object({
  items: z.array(BookListItemSchema),
  pagination: PaginationSchema,
});

export type Pagination = z.infer<typeof PaginationSchema>;
export type BookListItem = z.infer<typeof BookListItemSchema>;
export type BookListResponse = z.infer<typeof BookListResponseSchema>;

const ChapterSummarySchema = z.object({
  chapterId: z.uuid(),
  slug: z.string(),
  order: z.int().min(1),
  title: z.string(),
});

const BookSourceSchema = z.object({
  citation: z.string(),
  sourceUrl: z.string().nullable(),
  rightsStatement: z.string().nullable(),
});

export const BookDetailSchema = BookListItemSchema.extend({
  authorNames: z.array(z.string()),
  sources: z.array(BookSourceSchema),
  chapters: z.array(ChapterSummarySchema),
});

export const ChapterContentSchema = z.object({
  workId: z.uuid(),
  editionId: z.uuid(),
  chapterId: z.uuid(),
  chapterVersionId: z.uuid(),
  order: z.int().min(1),
  title: z.string(),
  html: z.string(),
  contentFormatVersion: z.int().min(1),
});

const PositiveIntInputSchema = z
  .union([
    z
      .string()
      .regex(/^[0-9]+$/)
      .transform(Number),
    z.number(),
  ])
  .pipe(z.int().min(1));

export const BookListQuerySchema = z.object({
  page: PositiveIntInputSchema.default(1),
  pageSize: PositiveIntInputSchema.pipe(z.int().max(100)).default(20),
});

export const BookSlugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const ChapterParamsSchema = BookSlugParamsSchema.extend({
  order: PositiveIntInputSchema.pipe(z.int().max(2_147_483_647)),
});

export type BookDetail = z.infer<typeof BookDetailSchema>;
export type ChapterContent = z.infer<typeof ChapterContentSchema>;
export type BookListQuery = z.infer<typeof BookListQuerySchema>;
export type BookSlugParams = z.infer<typeof BookSlugParamsSchema>;
export type ChapterParams = z.infer<typeof ChapterParamsSchema>;
