import { Alert } from "@/components/ui/alert";
import { getPing } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let ping: Awaited<ReturnType<typeof getPing>> | null = null;
  try {
    ping = await getPing();
  } catch (err) {
    console.error("[web] Failed to fetch ping", err);
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold">HiveShelf</h1>
      {ping ? (
        <p className="mt-4">
          API: <b>{ping.status}</b> · service: <b>{ping.service}</b>
        </p>
      ) : (
        <Alert>Could not connect to API</Alert>
      )}
    </main>
  );
}
