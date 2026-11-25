import { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { clientEnv } from "@/env";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const nonce = randomBytes(16).toString("base64");
  const isDevelopment = process.env.NODE_ENV === "development";

  const apiUrl = new URL(clientEnv.NEXT_PUBLIC_API_URL);

  if (!["http:", "https:"].includes(apiUrl.protocol))
    throw new Error("NEXT_PUBLIC_API_URL must use HTTP or HTTPS");

  const connectSources = ["'self'", apiUrl.origin];

  if (isDevelopment) {
    const websocketURl = new URL(request.nextUrl.origin);
    websocketURl.protocol = websocketURl.protocol === "https:" ? "wss:" : "ws:";

    connectSources.push(websocketURl.origin);
  }

  const directives = [
    "default-src 'self'",
    [
      "script-src 'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-eval'"] : []),
    ].join(" "),
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connectSources.join(" ")}`,
    "object-src 'none'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  const csp = directives.join("; ");

  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const response = handleI18nRouting(request);

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
