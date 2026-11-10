import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
    level: env.LOG_LEVEL,
    // Censura campos sensíveis ANTES de o log ser escrito
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
        ],
        censor: "[REDACTED]",

// O pino-http registra os cabeçalhos da requisição, e entre eles vem o Authorization: Bearer <token>. Token em log é token vazado: quem lê os logs vira o usuário. O redact troca esses campos por [REDACTED] antes de a linha ser escrita.

    },
    // Formato legível e colorido, só em desenvolvimento
    ...(env.NODE_ENV === "development"
        ? {
            transport: {
                target: "pino-pretty",
                options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
            },
        }
   : {}),
});