import "server-only";
import { LivenessResponseSchema, Language } from "@hiveshelf/shared";
import { serverEnv } from "@/env";

export const defaultLanguage = Language.VI;

export async function getLiveness() {
  const url = new URL("/health/live", serverEnv.API_INTERNAL_URL);

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Liveness check failed: ${response.status}`);
  }

  return LivenessResponseSchema.parse(await response.json());
}
