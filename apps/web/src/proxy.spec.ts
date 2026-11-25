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

  it("forwards the generated nonce and CSP to the renderer", () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = proxy(
      new NextRequest("http://localhost:3000/vi", {
        headers: {
          "x-nonce": "attacker-controlled",
          "Content-Security-Policy": "script-src 'unsafe-inline'",
        },
      }),
    );

    const forwardedNonce = response.headers.get("x-middleware-request-x-nonce");

    const forwardedCsp = response.headers.get("x-middleware-request-content-security-policy");

    const responseCsp = response.headers.get("Content-Security-Policy");

    expect(response.status).toBe(200);
    expect(forwardedNonce).toBeTruthy();
    expect(forwardedNonce).not.toBe("attacker-controlled");

    expect(forwardedCsp).not.toBeNull();
    expect(forwardedCsp).toBe(responseCsp);
    expect(forwardedCsp).toContain(`'nonce-${forwardedNonce}'`);
    if (forwardedCsp === null) {
      throw new Error("Missing forwarded CSP");
    }

    expect(getScriptDirective(forwardedCsp)).not.toContain("unsafe-inline");
  });
});

describe("Locale routing", () => {
  function makeRequest({
    path = "/",
    cookie,
    acceptLanguage,
  }: {
    path?: string;
    cookie?: string;
    acceptLanguage?: string;
  } = {}) {
    const headers = new Headers();

    if (cookie) {
      headers.set("Cookie", cookie);
    }

    if (acceptLanguage) {
      headers.set("Accept-Language", acceptLanguage);
    }

    return new NextRequest(`http://localhost:3000${path}`, {
      headers,
    });
  }

  it("mặc định chuyển đến tiếng Việt", () => {
    const response = proxy(makeRequest());

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/vi");
  });

  it("chọn tiếng Anh từ Accept-Language", () => {
    const response = proxy(
      makeRequest({
        acceptLanguage: "en-US,en;q=0.9",
      }),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/en");
  });

  it("ưu tiên cookie hơn Accept-Language", () => {
    const response = proxy(
      makeRequest({
        cookie: "NEXT_LOCALE=vi",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/vi");
  });

  it("bỏ qua cookie có locale không được hỗ trợ", () => {
    const response = proxy(
      makeRequest({
        cookie: "NEXT_LOCALE=fr",
        acceptLanguage: "en-US,en;q=0.9",
      }),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/en");
  });

  it("dùng tiếng Việt khi Accept-Language không khớp", () => {
    const response = proxy(
      makeRequest({
        acceptLanguage: "ja-JP,ja;q=0.9",
      }),
    );

    expect(response.headers.get("location")).toBe("http://localhost:3000/vi");
  });

  it("giữ đường dẫn và query khi thêm locale", () => {
    const response = proxy(
      makeRequest({
        path: "/catalog?page=2&sort=newest",
        acceptLanguage: "en",
      }),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/en/catalog?page=2&sort=newest",
    );
  });

  it("ưu tiên locale trên URL hơn cookie và header", () => {
    const response = proxy(
      makeRequest({
        path: "/vi",
        cookie: "NEXT_LOCALE=en",
        acceptLanguage: "en",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });
});
