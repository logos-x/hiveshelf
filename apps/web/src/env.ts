import { z } from "zod";

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_INTERNAL_URL: z.url(),
});

const clientSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_SITE_URL: z.url(),
});

function fail(scope: string, err: z.ZodError): never {
  const lines = err.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
  throw new Error(`Invalid ${scope} enviroment variables:\n${lines.join("\n")}`);
}

const skip = !!process.env.SKIP_ENV_VALIDATION;

const clientParsed = clientSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
if (!clientParsed.success && !skip) fail("public (client)", clientParsed.error);
export const clientEnv = clientParsed.data as z.infer<typeof clientSchema>;

let serverEnvValue = {} as z.infer<typeof serverSchema>;
if (typeof window === "undefined") {
  const p = serverSchema.safeParse(process.env);
  if (!p.success && !skip) fail("server", p.error);
  if (p.success) serverEnvValue = p.data;
}
export const serverEnv = serverEnvValue;
