"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations("common");

  useEffect(() => {
    // Có thể tích hợp dịch vụ ghi nhận lỗi tại đây.
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold">{t("errors.unexpectedTitle")}</h2>

      <p className="max-w-md text-sm text-gray-600">{t("errors.unexpectedDescription")}</p>

      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
      >
        {t("actions.retry")}
      </button>
    </main>
  );
}
