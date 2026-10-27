"use client";

import { useEffect } from "react";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    // Có thể tích hợp dịch vụ ghi nhận lỗi tại đây.
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">Đã xảy ra lỗi không mong muốn</h2>

      <p className="max-w-md text-sm text-gray-600">
        Đã có sự cố khi hiển thị trang. Vui lòng thử lại.
      </p>

      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        Thử lại
      </button>
    </main>
  );
}
