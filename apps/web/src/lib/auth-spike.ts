import "server-only";

import { z } from "zod";
import { cookies } from "next/headers";
import { serverEnv } from "@/env";

const meSchema = z.object({
  user: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

export async function getSpikeMe() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hs_access")?.value;

  const requestHeaders = new Headers();

  if (token && /^[a-f0-9]{64}$/.test(token)) requestHeaders.set("Cookie", `hs_access=${token}`);

  const apiBaseUrl = serverEnv.API_INTERNAL_URL.replace(/\/+$/, "");

  const response = await fetch(`${apiBaseUrl}/auth-spike/me`, {
    headers: requestHeaders,
    cache: "no-store",
    redirect: "error",
  });

  if (response.status === 401) return null;

  if (!response.ok) throw new Error(`Spike me request failed: ${response.status}`);

  const data = meSchema.parse(await response.json());

  return data.user;
}
