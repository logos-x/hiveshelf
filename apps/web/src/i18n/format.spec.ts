import { describe, expect, it } from "vitest";
import { Language } from "@hiveshelf/shared";
import { formatDate, formatNumber } from "./format";

describe("formatNumber", () => {
  it("định dạng số theo tiếng Việt", () => {
    expect(formatNumber(1234567.89, Language.VI)).toBe("1.234.567,89");
  });

  it("định dạng số theo tiếng Anh", () => {
    expect(formatNumber(1234567.89, Language.EN)).toBe("1,234,567.89");
  });

  it("hỗ trợ tùy chọn định dạng phần trăm", () => {
    expect(
      formatNumber(0.75, Language.EN, {
        style: "percent",
      }),
    ).toBe("75%");
  });
});

describe("formatDate", () => {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  it("định dạng ngày theo tiếng Việt", () => {
    const date = new Date("2026-11-24T10:00:00Z");

    expect(formatDate(date, Language.VI, options)).toBe("24/11/2026");
  });

  it("định dạng ngày theo tiếng Anh", () => {
    const date = new Date("2026-11-24T10:00:00Z");

    expect(formatDate(date, Language.EN, options)).toBe("11/24/2026");
  });

  it("dùng múi giờ Việt Nam khi ngày UTC vẫn là hôm trước", () => {
    const date = new Date("2026-11-23T18:30:00Z");

    expect(formatDate(date, Language.VI, options)).toBe("24/11/2026");
  });
});
