import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  RAWG_API_KEY: z.string().min(1, "RAWG_API_KEY is required"),
  API_JWT_SECRET: z.string().min(1, "API_JWT_SECRET is required"),
  CORS_ORIGIN: z.string().min(1, "CORS_ORIGIN is required"),
  MODERATION_STRIKE_LIMIT: z.coerce
    .number()
    .int()
    .positive("MODERATION_STRIKE_LIMIT must be greater than zero")
    .default(3),
  MODERATION_SUSPENSION_DAYS: z.coerce
    .number()
    .int()
    .positive("MODERATION_SUSPENSION_DAYS must be greater than zero")
    .default(7),
  ADMIN_EMAIL: z
    .string()
    .trim()
    .email("ADMIN_EMAIL must be a valid email")
    .optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_URL: z.string().optional()
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${issues}`);
}

export const env = parsed.data;

if (!env.ADMIN_EMAIL) {
  console.warn("[env] ADMIN_EMAIL is not configured. Admin moderation routes are disabled.");
}
