import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger";
import { info } from "node:console";

export const httpLogger = pinoHttp({
    logger,

    // Cada requisição ganha um ID único, devolvido no cabeçalho X-Request-Id
    genReqId: (_req, res) => {
        const id = randomUUID();
        res.setHeader("X-Request-Id", id);
        return id;
    },
     // Nível do log conforme o resultado
     customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
     },

     // Balanceadores chamam /health o tempo todo: não polui o log
     autoLogging: {
        ignore: (req) => req.url?.startsWith("/health") ?? false,
     },
});