import { z } from "zod";

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
  version: z.string().optional(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
