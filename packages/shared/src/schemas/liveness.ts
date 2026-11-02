import { z } from "zod";

export const LivenessResponseSchema = z.object({
  status: z.literal("ok"),
});

export type LivenessResponse = z.infer<typeof LivenessResponseSchema>;
