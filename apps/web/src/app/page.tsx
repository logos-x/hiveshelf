import { Alert } from "@/components/ui/alert";
import { getHealth } from "@/lib/health";
import type { HealthResponse } from "@hiveshelf/shared";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let health: HealthResponse | null = null;
  try {
    health = await getHealth();
  } catch (err) {
    console.error("[web] Failed to fetch health", err);
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">HiveShelf</h1>
      {health ? (
        <div className="mt-4 space-y-1">
          <p>
            Status: <b className="text-green-600">{health.status}</b>
          </p>
          <p className="text-sm text-gray-500">Timestamp: {health.timestamp}</p>
          <p className="text-sm text-gray-500">Version: {health.version}</p>
        </div>
      ) : (
        <Alert className="mt-4">Could not connect to API</Alert>
      )}
    </main>
  );
}
