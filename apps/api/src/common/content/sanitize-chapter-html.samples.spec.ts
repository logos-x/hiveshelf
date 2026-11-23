import { describe, expect, it } from 'vitest';
import { sanitizeChapterHtml } from './sanitize-chapter-html.ts';

const samples = [
  {
    name: 'prose with headings and emphasis',
    source:
      '<h2>Ngọn đèn</h2>' +
      '<p>An mở cửa.<br>Gió mang theo <strong>hương hoa</strong>.</p>' +
      '<h3>Buổi tối</h3>' +
      '<p>Một câu <em>thì thầm</em>, một lời <b>nhắc</b> và <i>hy vọng</i>.</p>' +
      '<h4>Ghi chú</h4><hr>',
    expected:
      '<h2>Ngọn đèn</h2>' +
      '<p id="p-1">An mở cửa.<br />Gió mang theo <strong>hương hoa</strong>.</p>' +
      '<h3>Buổi tối</h3>' +
      '<p id="p-2">Một câu <em>thì thầm</em>, một lời <b>nhắc</b> và <i>hy vọng</i>.</p>' +
      '<h4>Ghi chú</h4><hr />',
  },
  {
    name: 'quotation and numbered lists',
    source:
      '<blockquote><p>Hãy bắt đầu từ điều nhỏ nhất.</p></blockquote>' +
      '<ol start="3"><li>Bước ba</li><li value="5">Bước năm</li></ol>' +
      '<ul><li>Hạt giống</li><li>Nước</li></ul>' +
      '<p>Khu vườn đã sẵn sàng.</p>',
    expected:
      '<blockquote><p id="p-1">Hãy bắt đầu từ điều nhỏ nhất.</p></blockquote>' +
      '<ol start="3"><li>Bước ba</li><li value="5">Bước năm</li></ol>' +
      '<ul><li>Hạt giống</li><li>Nước</li></ul>' +
      '<p id="p-2">Khu vườn đã sẵn sàng.</p>',
  },
  {
    name: 'Unicode, escaped markup and permitted links',
    source:
      '<h2>Đọc &amp; ghi chép</h2>' +
      '<p>Tiếng Việt — 日本語 — 🌱. &lt;script&gt; là văn bản.</p>' +
      '<p><a href="https://example.com/book">Nguồn tham khảo</a></p>',
    expected:
      '<h2>Đọc &amp; ghi chép</h2>' +
      '<p id="p-1">Tiếng Việt — 日本語 — 🌱. &lt;script&gt; là văn bản.</p>' +
      '<p id="p-2"><a href="https://example.com/book" ' +
      'rel="noopener noreferrer nofollow">Nguồn tham khảo</a></p>',
  },
];

describe('sanitizeChapterHtml: representative content', () => {
  it.each(samples)(
    'preserves supported formatting for $name',
    ({ source, expected }) => {
      expect(sanitizeChapterHtml(source)).toBe(expected);
    },
  );

  it.each(samples)(
    'keeps canonical output stable for $name',
    ({ expected }) => {
      expect(sanitizeChapterHtml(expected)).toBe(expected);
    },
  );
});
