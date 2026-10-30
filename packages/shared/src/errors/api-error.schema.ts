import { z } from "zod";

export const apiErrorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
  code: z.string().optional(),
});

export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  code: z.string(),
  message: z.string(),
  details: z.array(apiErrorDetailSchema).optional(),
  requestId: z.string(),
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
