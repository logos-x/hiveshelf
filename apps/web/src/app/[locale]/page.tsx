import { Alert } from "@/components/ui/alert";
import { getLiveness } from "@/lib/health";
import type { LivenessResponse } from "@hiveshelf/shared";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations("common");

  let liveness: LivenessResponse | null = null;

  try {
    liveness = await getLiveness();
  } catch (err) {
    console.error("[web] Failed to fetch health", err);
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <div className="mb-6">
        <LanguageSwitcher />
      </div>
      <h1 className="text-2xl font-semibold">{t("appName")}</h1>

      {liveness ? (
        <div className="mt-4">
          {t.rich("home.apiStatus", {
            status: liveness.status,
            strong: (chunks) => <b className="text-green-600">{chunks}</b>,
          })}
        </div>
      ) : (
        <Alert className="mt-4">{t("home.apiUnavailable")}</Alert>
      )}
    </main>
  );
}
