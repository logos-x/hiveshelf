import viCommon from "../../messages/vi/common.json";
import viAuth from "../../messages/vi/auth.json";
import viReader from "../../messages/vi/reader.json";
import viCatalog from "../../messages/vi/catalog.json";

import enCommon from "../../messages/en/common.json";
import enAuth from "../../messages/en/auth.json";
import enReader from "../../messages/en/reader.json";
import enCatalog from "../../messages/en/catalog.json";

import { Language } from "@hiveshelf/shared";

export type MessageTree = {
  [key: string]: string | MessageTree;
};

const viMessages: MessageTree = {
  common: viCommon,
  auth: viAuth,
  reader: viReader,
  catalog: viCatalog,
};

const enMessages: MessageTree = {
  common: enCommon,
  auth: enAuth,
  reader: enReader,
  catalog: enCatalog,
};

export function mergeMessages(fallback: MessageTree, translated: MessageTree): MessageTree {
  const result: MessageTree = { ...fallback };

  for (const [key, value] of Object.entries(translated)) {
    if (typeof value === "string") {
      result[key] = value;
      continue;
    }

    const fallbackValue = fallback[key];

    result[key] = mergeMessages(typeof fallbackValue === "object" ? fallbackValue : {}, value);
  }

  return result;
}

export function loadMessages(locale: Language): MessageTree {
  if (locale === Language.VI) {
    return viMessages;
  }

  return mergeMessages(viMessages, enMessages);
}
