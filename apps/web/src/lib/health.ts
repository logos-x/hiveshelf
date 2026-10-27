import "server-only";
import { HealthResponseSchema, Language } from "@hiveshelf/shared";

export const defaultLanguage = Language.VI;

function getApiUrl() {
  const url = process.env.API_URL;
  if (!url) throw new Error("Missing API_URL environment variable");
  return url;
}

export async function getHealth() {
  const res = await fetch(`${getApiUrl()}/health`, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
  }
  return HealthResponseSchema.parse(await res.json());
}
