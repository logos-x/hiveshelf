import * as rootParams from "next/root-params";
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { loadMessages } from "@/i18n/messages";
import { notFound } from "next/navigation";
import { TIME_ZONE } from "./format";

export default getRequestConfig(async ({ locale: expliciLocale }) => {
  const locale = expliciLocale ?? (await rootParams.locale());

  if (!hasLocale(routing.locales, locale)) notFound();

  return {
    locale,
    messages: loadMessages(locale),
    timeZone: TIME_ZONE,
  };
});
