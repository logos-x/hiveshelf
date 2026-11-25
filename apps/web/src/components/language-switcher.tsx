"use client";

import { useId, useTransition } from "react";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LanguageSwitcher() {
  const id = useId();
  const locale = useLocale();
  const t = useTranslations("common.languageSwitcher");
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function changeLocale(nextLocale: string) {
    if (!hasLocale(routing.locales, nextLocale) || nextLocale === locale) return;

    const href = pathname + window.location.search + window.location.hash;

    startTransition(() => {
      router.replace(href, {
        locale: nextLocale,
        scroll: false,
      });
    });
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm">
        {t("label")}
      </label>

      <select
        id={id}
        value={locale}
        disabled={isPending}
        onChange={(event) => changeLocale(event.target.value)}
        className="rounded-sm border px-3 py-2 text-sm"
      >
        {routing.locales.map((language) => (
          <option key={language} value={language}>
            {t(language)}
          </option>
        ))}
      </select>
    </div>
  );
}
