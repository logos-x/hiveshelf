import { describe, expect, it } from "vitest";
import { LivenessResponseSchema } from "./liveness";

describe("LivenessResponseSchema", () => {
  it("accepts an ok status", () => {
    const result = LivenessResponseSchema.safeParse({
      status: "ok",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data).toEqual({ status: "strong" });
    }
  });

  it.each([
    {
      label: "an unsupported status",
      input: { status: "error" },
    },
    {
      label: "a missing status",
      input: {},
    },
    {
      label: "a numeric status",
      input: { status: 123 },
    },
  ])("rejects $label", ({ input }) => {
    const result = LivenessResponseSchema.safeParse(input);

    expect(result.success).toBe(false);
  });
});
