import { getSpikeMe } from "@/lib/auth-spike";

export default async function AuthSpikePage() {
  const user = await getSpikeMe();

  return (
    <main className="mx-auto w-full max-w-xl p-8">
      <h1 className="text-2xl font-bold">Auth cookie spike - SSR</h1>

      {user ? (
        <dl className="mt-4 space-y-2">
          <dt>User ID</dt>
          <dd>{user.id}</dd>

          <dt>Name</dt>
          <dd>{user.name}</dd>
        </dl>
      ) : (
        <p className="mt-4">Chưa có phiên hợp lệ.</p>
      )}
    </main>
  );
}
