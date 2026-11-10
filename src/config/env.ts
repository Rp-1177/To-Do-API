import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])

// z.enum([...]) em NODE_ENV e LOG_LEVEL: só aceita valores válidos. Um erro de digitação (LOG_LEVEL=infoo) derruba o servidor na inicialização, com mensagem clara, em vez de causar um comportamento estranho depois.

    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET deve ter pelo menos 32 caracteres"),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(3600),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  // Lista separada por vírgula → vira array. Vazio = nenhuma origem de navegador permitida
  CORS_ORIGINS: z
    .string()
    .default("")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)

// O transform do CORS_ORIGINS: o .env só guarda texto, mas queremos uma lista. A cadeia faz: "a, b,c" → .split(",") → ["a", " b", "c"] → .map(trim) → remove espaços → .filter(Boolean) descarta vazios. Um texto vazio vira [], e lista vazia = nenhum site de navegador autorizado. O padrão é o lado seguro.

    ),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
});

export const env = envSchema.parse(process.env);

// Nos testes, os limites são 100000 e o log é silent. A suíte faz centenas de requisições “do mesmo IP” (127.0.0.1); com os limites reais, ela levaria 429 no meio. E sem silent, o terminal ficaria inundado de logs.