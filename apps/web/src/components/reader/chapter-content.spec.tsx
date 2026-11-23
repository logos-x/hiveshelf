import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ChapterContent } from "@/components/reader/chapter-content";

const chapterVersionId = "11111111-1111-4111-8111-111111111111";

const samples = [
  {
    name: "prose with headings and emphasis",
    html:
      "<h2>Ngọn đèn</h2>" +
      '<p id="p-1">An mở cửa.<br />Gió mang theo <strong>hương hoa</strong>.</p>' +
      "<h3>Buổi tối</h3>" +
      '<p id="p-2">Một câu <em>thì thầm</em>, một lời <b>nhắc</b> và <i>hy vọng</i>.</p>' +
      "<h4>Ghi chú</h4><hr />",
    expectedParagraphIds: ["p-1", "p-2"],
  },
  {
    name: "quotation and numbered lists",
    html:
      '<blockquote><p id="p-1">Hãy bắt đầu từ điều nhỏ nhất.</p></blockquote>' +
      '<ol start="3"><li>Bước ba</li><li value="5">Bước năm</li></ol>' +
      "<ul><li>Hạt giống</li><li>Nước</li></ul>" +
      '<p id="p-2">Khu vườn đã sẵn sàng.</p>',
    expectedParagraphIds: ["p-1", "p-2"],
  },
  {
    name: "Unicode, escaped markup and permitted links",
    html:
      "<h2>Đọc &amp; ghi chép</h2>" +
      '<p id="p-1">Tiếng Việt — 日本語 — 🌱. &lt;script&gt; là văn bản.</p>' +
      '<p id="p-2"><a href="https://example.com/book" ' +
      'rel="noopener noreferrer nofollow">Nguồn tham khảo</a></p>',
    expectedParagraphIds: ["p-1", "p-2"],
  },
];

describe("ChapterContent", () => {
  it.each(samples)("preserves paragraph anchors for $name", (sample) => {
    const { rerender } = render(
      <ChapterContent
        chapter={{
          chapterVersionId,
          html: sample.html,
        }}
      />,
    );

    const article = screen.getByRole("article");

    expect(article).toHaveAttribute("data-chapter-version-id", chapterVersionId);

    const paragraphIds = () => Array.from(article.querySelectorAll("p")).map((p) => p.id);

    expect(paragraphIds()).toEqual(sample.expectedParagraphIds);

    for (const id of sample.expectedParagraphIds) {
      expect(document.getElementById(id)).toBeInTheDocument();
    }

    rerender(
      <ChapterContent
        chapter={{
          chapterVersionId,
          html: sample.html,
        }}
      />,
    );

    expect(paragraphIds()).toEqual(sample.expectedParagraphIds);
  });

  it("renders headings and emphasis as HTML elements", () => {
    render(
      <ChapterContent
        chapter={{
          chapterVersionId,
          html: samples[0]!.html,
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Ngọn đèn" })).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 3, name: "Buổi tối" })).toBeInTheDocument();

    expect(screen.getByRole("heading", { level: 4, name: "Ghi chú" })).toBeInTheDocument();

    const article = screen.getByRole("article");

    expect(article.querySelector("strong")).toHaveTextContent("hương hoa");
    expect(article.querySelector("em")).toHaveTextContent("thì thầm");
    expect(article.querySelector("b")).toHaveTextContent("nhắc");
    expect(article.querySelector("i")).toHaveTextContent("hy vọng");
    expect(article.querySelector("br")).toBeInTheDocument();
    expect(screen.getByRole("separator")).toBeInTheDocument();
  });

  it("preserves quotation and list numbering attributes", () => {
    render(
      <ChapterContent
        chapter={{
          chapterVersionId,
          html: samples[1]!.html,
        }}
      />,
    );

    const article = screen.getByRole("article");
    const orderedList = article.querySelector("ol");

    expect(article.querySelector("blockquote")).toHaveTextContent("Hãy bắt đầu từ điều nhỏ nhất.");
    expect(orderedList).toHaveAttribute("start", "3");

    if (orderedList === null) {
      throw new Error("Missing ordered list");
    }

    expect(within(orderedList).getByText("Bước năm")).toHaveAttribute("value", "5");

    expect(screen.getAllByRole("list")).toHaveLength(2);
  });

  it("preserves Unicode and keeps escaped markup as text", () => {
    render(
      <ChapterContent
        chapter={{
          chapterVersionId,
          html: samples[2]!.html,
        }}
      />,
    );

    const article = screen.getByRole("article");

    expect(article).toHaveTextContent("Tiếng Việt — 日本語 — 🌱. <script> là văn bản.");
    expect(article.querySelector("script")).toBeNull();

    const link = screen.getByRole("link", {
      name: "Nguồn tham khảo",
    });

    expect(link).toHaveAttribute("href", "https://example.com/book");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
  });
});
