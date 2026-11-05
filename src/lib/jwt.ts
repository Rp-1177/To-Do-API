import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../errors/appError";

export function signToken(userId: number): string {
    return jwt.sign({}, env.JWT_SECRET, {

// subject: String(userId): sub é o campo padrão do JWT para “quem é o dono do token”, e por padrão é texto.

        subject: String(userId),
        expiresIn: env.JWT_EXPIRES_IN_SECONDS,
        algorithm: "HS256",

// algorithms: ["HS256"] no verify: força o algoritmo esperado. Sem isso, existem ataques em que o token pede para ser validado com outro algoritmo.

    });
}

export function verifyToken(token: string): number {
    try {
        const payload = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ["HS256"],
        });
        const userId = typeof payload === "string" ? NaN : Number(payload.sub);
        if (Number.isInteger(userId)) return userId;
    } catch {
// assinatura inválida, token expirado ou formato quebrado
    }
    throw new AppError("Token inválido ou expirado", 401);
}

// Todo erro vira o mesmo 401: assinatura errada, expirado ou lixo, o cliente não precisa saber qual foi.

// Por que dois arquivos pequenos em lib/? Eles escondem a biblioteca. Se um dia você trocar de bcryptjs para argon2, só password.ts muda.