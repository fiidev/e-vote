import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  ADMIN_EMAILS: z.string().optional(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().optional(),
  SMTP_RATE_PER_MINUTE: z.coerce.number().default(100),
  SMTP_DAILY_CAP: z.coerce.number().default(1990),
  SCHOOL_NAME: z.string().min(1),
  VOTING_LOCATION: z.string().min(1),
  FROM_NAME: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const flattened = z.flattenError(parsed.error);
  console.error("Environment invalid:", flattened.fieldErrors);
  throw new Error("Environment validation failed — perbaiki .env dulu");
}

export const env = parsed.data;
