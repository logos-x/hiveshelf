import "server-only";

export type PingResponse = { status: "ok"; service: string };

function getApiUrl() {
  const url = process.env.API_URL;
  if (!url) throw new Error("Missing API_URL environment variable");
  return url;
}

export async function getPing(): Promise<PingResponse> {
  const res = await fetch(`${getApiUrl()}/ping`, {
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) {
    throw new Error(`Ping failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}
