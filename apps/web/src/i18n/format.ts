import { Language } from "@hiveshelf/shared";

export const TIME_ZONE = "Asia/Ho_Chi_Minh";

const intlLocales: Record<Language, string> = {
  [Language.VI]: "vi-VN",
  [Language.EN]: "en-US",
};

export function formatNumber(
  value: number,
  locale: Language,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(intlLocales[locale], options).format(value);
}

export function formatDate(
  value: Date | number,
  locale: Language,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
  },
): string {
  return new Intl.DateTimeFormat(intlLocales[locale], {
    timeZone: TIME_ZONE,
    ...options,
  }).format(value);
}
