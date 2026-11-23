// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

vi.mock("@/env", () => ({
  clientEnv: {
    NEXT_PUBLIC_API_URL: "http://localhost:3001",
  },
}));

function getPolicy() {
  const response = proxy(new NextRequest("http://localhost:3000"));
  const csp = response.headers.get("Content-Security-Policy");

  if (csp === null) throw new Error("Missing enforced CSP header");

  return csp;
}

function getScriptDirective(csp: string) {
  const directive = csp
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("script-src "));

  if (directive === undefined) throw new Error("Missing script-src");

  return directive;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CSP proxy", () => {
  it("uses a quoted nonce and blocks unsafe script execution in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    const csp = getPolicy();
    const scripts = getScriptDirective(csp);

    expect(scripts).toMatch(/'nonce-[A-Za-z0-9+/]+={0,2}'/);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("unsafe-inline");
    expect(scripts).not.toContain("unsafe-eval");
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-src 'none'");
  });

  it("generate a different nonce for each request", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(getScriptDirective(getPolicy())).not.toBe(getScriptDirective(getPolicy()));
  });

  it("allows eval only in development", () => {
    vi.stubEnv("NODE_ENV", "development");

    expect(getScriptDirective(getPolicy())).toContain("'unsafe-eval'");
  });

  it("replaces a client-supplied nonce and CSP", () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = proxy(
      new NextRequest("http://localhost:3000", {
        headers: {
          "x-nonce": "attacker-controlled",
          "Content-Security-Policy": "script-src 'nonce-attacker-controlled' 'unsafe-inline'",
        },
      }),
    );

    const csp = response.headers.get("Content-Security-Policy");

    expect(csp).not.toBeNull();
    expect(csp).not.toContain("attacker-controlled");
    expect(getScriptDirective(csp!)).not.toContain("unsafe-inline");
  });
});
