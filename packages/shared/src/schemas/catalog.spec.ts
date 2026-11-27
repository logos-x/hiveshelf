import { describe, expect, it } from "vitest";
import { BookDetailSchema, BookListQuerySchema, ChapterParamsSchema } from "./catalog";

describe("BookListQuerySchema", () => {
  it("defaults to page 1 with 20 items", () => {
    expect(BookListQuerySchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("parses numeric strings and accepts the maximum page size", () => {
    expect(BookListQuerySchema.parse({ page: "2", pageSize: "100" })).toEqual({
      page: 2,
      pageSize: 100,
    });
  });

  it.each([
    { page: "0" },
    { page: "" },
    { page: "1.5" },
    { page: ["1", "2"] },
    { pageSize: "101" },
  ])("rejects invalid pagination input %j", (input) => {
    expect(BookListQuerySchema.safeParse(input).success).toBe(false);
  });
});

describe("ChapterParamsSchema", () => {
  const slug = "the-small-gargen";

  it.each(["2", "2147483647"])("parses chapter order %s", (order) => {
    expect(ChapterParamsSchema.parse({ slug, order })).toEqual({
      slug,
      order: Number(order),
    });
  });

  it.each(["0", "-1", "1.5", "2147483648"])("rejects chapter order %s", (order) => {
    expect(ChapterParamsSchema.safeParse({ slug, order }).success).toBe(false);
  });
});

describe("BookDetailSchema", () => {
  const book = {
    workId: "3b560c41-7759-4b28-9c06-92fe9d758b30",
    slug: "ngon-den-ben-cua-so",
    editionId: "a6fba639-7976-4837-b23c-b62716502375",
    editionSlug: "ngon-den-ben-cua-so-vi",
    languageTag: "vi",
    title: "Ngọn đèn bên cửa sổ",
    description: "Truyện ngắn mẫu.",
    genres: [],
    tags: [],
    publishedAt: "2026-11-26T00:00:00.000Z",
    authorNames: ["Nguyễn Văn A", "Trần Thị B"],
    sources: [
      {
        citation: "Sưu tầm",
        sourceUrl: null,
        rightsStatement: null,
      },
    ],
    chapters: [],
  };

  it("accepts multiple authors and a collected source without rights information", () => {
    const result = BookDetailSchema.parse(book);

    expect(result.authorNames).toEqual(["Nguyễn Văn A", "Trần Thị B"]);
    expect(result.sources).toEqual([
      {
        citation: "Sưu tầm",
        sourceUrl: null,
        rightsStatement: null,
      },
    ]);
  });

  it("accepts missing authors and sources as empty arrays", () => {
    const result = BookDetailSchema.parse({
      ...book,
      authorNames: [],
      sources: [],
    });

    expect(result.authorNames).toEqual([]);
    expect(result.sources).toEqual([]);
  });

  it("accepts a source URL and a free-text rights statement", () => {
    const sources = [
      {
        citation: "Nguồn do người nhập cung cấp",
        sourceUrl: "https://example.com/book",
        rightsStatement: "Được tác giả cho phép đăng tải.",
      },
    ];

    const result = BookDetailSchema.parse({
      ...book,
      sources,
    });

    expect(result.sources).toEqual(sources);
  });

  it("rejects an author list containing non-string values", () => {
    const result = BookDetailSchema.safeParse({
      ...book,
      authorNames: [123],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a source without a citation", () => {
    const result = BookDetailSchema.safeParse({
      ...book,
      sources: [
        {
          sourceUrl: null,
          rightsStatement: null,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
