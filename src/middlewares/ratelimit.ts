import { rateLimit } from "express-rate-limit";

const WINDOW_MS = 15 * 60 * 1000;  // 15 minutos

export function createRateLimiter(limit: number) {
    return rateLimit({
        windowMs: WINDOW_MS,
        limit,
        standardHeaders: "draft-7", // cabeçalhos RateLimit-* e Retry-After
        legacyHeaders: false, // sem os antigos X-RateLimit-*
        message: { error: "Muitas requisições. Tente novamente mais tarde" },
    });
}

// É uma função que fabrica limitadores (e não um limitador pronto) por um motivo: cada chamada cria um contador independente. Isso permite usar limites diferentes por rota e, nos testes, criar um app com limite pequeno sem afetar os outros.