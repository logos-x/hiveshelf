import { Language } from "@hiveshelf/shared";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: Object.values(Language),
  defaultLocale: Language.VI,
  localePrefix: "always",
  localeDetection: true,
  localeCookie: {
    name: "NEXT_LOCALE",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  },
  alternateLinks: false,
});
