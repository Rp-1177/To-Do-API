import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/appError";
import { verifyToken } from "../lib/jwt";

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) throw new AppError("Token não informado", 401);

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new AppError("Use o formato: Authorization: Bearer <token>", 401);
  }

  req.userId = verifyToken(token);
  next();
}

// Dá ao controller um userId garantido (number, nunca undefined)
export function requireUserId(req: Request): number {
  if (req.userId === undefined) throw new AppError("Não autenticado", 401);
  return req.userId;
}

// É um middleware de verdade: recebe next e o chama quando está tudo certo, passando o pedido adiante. Se lança um erro, o pedido para ali e o errorHandler responde. O requireUserId aproveita o estreitamento de tipo que vimos: depois do if, o TypeScript sabe que é number.