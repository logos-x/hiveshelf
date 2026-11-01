import { Alert } from "@/components/ui/alert";
import { getLiveness } from "@/lib/health";
import type { LivenessResponse } from "@hiveshelf/shared";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let liveness: LivenessResponse | null = null;
  try {
    liveness = await getLiveness();
  } catch (err) {
    console.error("[web] Failed to fetch health", err);
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">HiveShelf</h1>

      {liveness ? (
        <div className="mt-4">
          API liveness: <b className="text-green-600">{liveness.status}</b>
        </div>
      ) : (
        <Alert className="mt-4">Could not connect to API</Alert>
      )}
    </main>
  );
}
