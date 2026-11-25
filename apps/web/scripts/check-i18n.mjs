import { fileURLToPath } from "url";
import { dirname, resolve } from "node:path";
import { Language } from "@hiveshelf/shared";
import { readdirSync, readFileSync } from "node:fs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

const messagesDirectory = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(scriptDirectory, "../messages");

const locales = Object.values(Language);
const requiredNamespaces = ["common", "auth", "reader", "catalog"];
const errors = [];

function collectKeys(value, path, keys, locale) {
  if (typeof value === "string") {
    keys.set(path, "string");

    if (value.trim() === "") errors.push(`[${locale}] Empty translation: ${path}`);

    return;
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`[${locale}] Invalid value: ${path}`);
    return;
  }

  keys.set(path, "object");

  for (const [key, child] of Object.entries(value)) {
    collectKeys(child, `${path}.${key}`, keys, locale);
  }
}

function readLocale(locale) {
  const directory = resolve(messagesDirectory, locale);
  const keys = new Map();

  let files;

  try {
    files = readdirSync(directory).filter((file) => file.endsWith(".json"));
  } catch (error) {
    errors.push(`[${locale}] Cannot read directory: ${error.message}`);
    return keys;
  }

  for (const namespace of requiredNamespaces) {
    if (!files.includes(`${namespace}.json`))
      errors.push(`[${locale}] Missing namespace: ${namespace}`);
  }

  for (const file of files.sort()) {
    const namespace = file.slice(0, -".json".length);
    let messages;

    try {
      messages = JSON.parse(readFileSync(resolve(directory, file), "utf8"));
    } catch (error) {
      errors.push(`[${locale}] Cannot read ${file}: ${error.message}`);
      continue;
    }

    if (messages === null || typeof messages !== "object" || Array.isArray(messages)) {
      errors.push(`[${locale}] Namespace must be an object: ${namespace}`);
      continue;
    }

    collectKeys(messages, namespace, keys, locale);
  }

  return keys;
}

const dictionaries = new Map(locales.map((locale) => [locale, readLocale(locale)]));

const referenceLocale = Language.VI;
const referenceKeys = dictionaries.get(referenceLocale);

for (const locale of locales) {
  if (locale === referenceLocale) continue;

  const translatedKeys = dictionaries.get(locale);

  for (const [key, type] of referenceKeys) {
    if (!translatedKeys.has(key)) errors.push(`[${locale}] Missing key: ${key}`);
    else if (translatedKeys.get(key) !== type) errors.push(`[${locale}] Type mismatch: ${key}`);
  }

  for (const key of translatedKeys.keys()) {
    if (!referenceKeys.has(key))
      errors.push(`[${locale}] Extra key compared with ${referenceLocale}: ${key}`);
  }
}

if (errors.length > 0) {
  console.error("Translation validation failed:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exitCode = 1;
} else {
  console.log(`Translation validation passed: ${locales.join(", ")}`);
}
