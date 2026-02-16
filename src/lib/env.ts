import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // Storage
  STORAGE_TYPE: z.enum(["local", "s3"]).default("local"),

  // Local storage
  LOCAL_STORAGE_PATH: z.string().default("./data/reports"),

  // S3 storage
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .transform((v) => v === "true")
    .default("false"),

  // App
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

export function getEnv(): Env {
  return envSchema.parse(process.env);
}

export function getEnvSafe(): Partial<Env> {
  const result = envSchema.safeParse(process.env);
  if (result.success) return result.data;
  return {};
}
