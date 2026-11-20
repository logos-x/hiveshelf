import { describe, expect, it } from "vitest";
import { BookListQuerySchema, ChapterParamsSchema } from "./catalog";

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
