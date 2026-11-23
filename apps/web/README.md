This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Bảo mật nội dung chương

Policy: [ADR-007](../../docs/adr/007-sanitized-chapter-html.md).

ChapterContent trong src/components/reader chỉ render HTML đã lưu từ API chương.
Component giữ nguyên paragraph anchors và không sanitize lại trên client.
Không truyền HTML nguồn từ editor/import vào dangerouslySetInnerHTML.

CSS Modules dùng xử lý mặc định của Next.js.
Rule @tailwindcss/turbopack phải loại trừ *.module.css để giữ mapping class.

### Security headers và CSP

next.config.ts cấu hình X-Content-Type-Options: nosniff và
Referrer-Policy: strict-origin-when-cross-origin.

src/proxy.ts sinh nonce mới theo request, ghi đè nonce/CSP từ client,
truyền policy cho Next renderer và trả Content-Security-Policy enforce.
Root layout đọc nonce và truyền cho next-themes.

Production script-src dùng nonce và strict-dynamic, không có unsafe-inline
hoặc unsafe-eval. Development thêm unsafe-eval và WebSocket cho HMR.
style-src còn cho unsafe-inline để tương thích UI; HTML chương vẫn cấm style.
connect-src cho self và origin NEXT_PUBLIC_API_URL.

Nonce làm các trang dùng root layout render theo request.
Không phục vụ HTML chứa nonce qua static export hoặc cache HTML dùng chung
mà không có thiết kế CSP/cache phù hợp.

### Kiểm chứng

Chạy từ thư mục gốc repo; build package shared trước nếu chưa có output mới nhất.

```bash
pnpm --filter @hiveshelf/web test
pnpm --filter @hiveshelf/shared build
pnpm --filter @hiveshelf/web build
pnpm --filter @hiveshelf/web start
```

Kiểm tra response document có ba security headers, nonce thay đổi giữa request
và khớp script hợp lệ. Trên production, xác nhận hydration/theme hoạt động
và inline script không có nonce bị trình duyệt chặn.

Vitest/jsdom kiểm tra policy và DOM, không thay thế kiểm chứng CSP/layout
trong trình duyệt. Preview kiểm tra ba mẫu là trang tạm và không được commit.
