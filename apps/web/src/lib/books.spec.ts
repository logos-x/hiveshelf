import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  serverEnv: {
    API_INTERNAL_URL: "http://api.test",
  },
}));

import { getBook, getChapter } from "./books";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe.each([
  {
    name: "getBook",
    load: () => getBook("sample-book"),
  },
  {
    name: "getChapter",
    load: () => getChapter("sample-book", 1),
  },
])("$name", ({ load }) => {
  it("returns null when the API responds with 404", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));

    await expect(load()).resolves.toBeNull();
  });

  it.each([400, 500])("throws when the API responds with %i", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status }));

    await expect(load()).rejects.toThrow(`request failed with status ${status}`);
  });

  it("propagates network errors", async () => {
    const error = new TypeError("Network unavailable");

    fetchMock.mockRejectedValueOnce(error);

    await expect(load()).rejects.toBe(error);
  });

  it("propagates timeout errors", async () => {
    const error = new DOMException("Request timed out", "TimeoutError");

    fetchMock.mockRejectedValueOnce(error);

    await expect(load()).rejects.toBe(error);
  });

  it("rejects a successful response with invalid data", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ unexpected: true }));

    await expect(load()).rejects.toThrow();
  });
});
