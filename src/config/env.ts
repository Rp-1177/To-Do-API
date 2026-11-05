import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
    JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
});

export const env = envSchema.parse(process.env);