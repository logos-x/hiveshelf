import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z
      .url()
      .refine(
        (value) =>
          ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
        'DATABASE_URL must be use postgres:// or postgresql://',
      ),
    WEB_ORIGIN: z.string().default('http://localhost:3000'),
    STORAGE_DRIVER: z.enum(['memory', 's3']).default('memory'),
    S3_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_BUCKET: z.string().min(1).optional(),
    S3_ACCESS_KEY: z.string().min(1).optional(),
    S3_SECRET_KEY: z.string().min(1).optional(),
    S3_FORCE_PATH_STYLE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),

    EMAIL_DRIVER: z.enum(['memory', 'smtp']).default('memory'),
    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
    MAIL_FROM: z.string().min(1).optional(),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 's3') {
      const requiredFields = [
        'S3_BUCKET',
        'S3_ACCESS_KEY',
        'S3_SECRET_KEY',
      ] as const;

      for (const field of requiredFields) {
        if (!env[field]) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} is required when STORAGE_DRIVER=s3`,
          });
        }
      }
    }

    if (env.EMAIL_DRIVER === 'smtp') {
      const requiredFields = ['SMTP_HOST', 'MAIL_FROM'] as const;

      for (const field of requiredFields) {
        if (!env[field]) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: `${field} is required when EMAIL_DRIVER=smtp`,
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map(
      (i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`,
    );
    throw new Error(`Invalid environment variables:\n${lines.join('\n')}`);
  }
  return result.data;
}
