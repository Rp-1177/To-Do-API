import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env";
import { AppError } from "../errors/appError";
import { signToken, verifyToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { tamperToken } from "./tokens";

describe("password (bcrypt)", () => {
  it("não devolve a senha original e gera um hash no formato bcrypt", async () => {
    const hash = await hashPassword("senha-forte-123");

    expect(hash).not.toContain("senha-forte-123");
    expect(hash).toMatch(/^\$2[aby]\$/);

// A expressão /^\$2[aby]\$/ é uma regex: “começa (^) com $2, depois a, b ou y, depois $”. O \$ é um cifrão literal, e as versões do bcrypt ($2a$, $2b$, $2y$) casam com ela.

  });

  it("gera hashes diferentes para a mesma senha (salt aleatório)", async () => {
    const first = await hashPassword("mesma-senha");
    const second = await hashPassword("mesma-senha");

    expect(first).not.toBe(second);
  });

  it("aceita a senha correta e recusa a errada", async () => {
    const hash = await hashPassword("senha-certa");

    expect(await verifyPassword("senha-certa", hash)).toBe(true);
    expect(await verifyPassword("senha-errada", hash)).toBe(false);
  });
});

describe("jwt", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devolve o mesmo userId que foi colocado no token", () => {
    expect(verifyToken(signToken(42))).toBe(42);
  });

  it("recusa token adulterado (a assinatura não confere)", () => {
    const forged = tamperToken(signToken(1), 999);

    expect(() => verifyToken(forged)).toThrow(AppError);

// Por que expect(() => verifyToken(x)).toThrow(...) e não expect(verifyToken(x)).toThrow(...)? No segundo caso, o verifyToken(x) roda antes de o expect ser chamado, o erro estoura no meio do teste, e o expect nunca chega a ver. Embrulhando em uma função (() => ...), o expect a executa dentro de uma proteção e consegue conferir que ela lançou o erro. Regra: para testar que algo lança erro, passe uma função, não o resultado.

  });

  it("recusa token expirado", () => {
    const token = signToken(1);

    // "Viaja no tempo" para depois da validade (só o relógio é falsificado)
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + (env.JWT_EXPIRES_IN_SECONDS + 60) * 1000);

    expect(() => verifyToken(token)).toThrow(AppError);
  });

  it("recusa token assinado com outro segredo", () => {
    const foreign = jwt.sign({}, "um-segredo-totalmente-diferente-do-nosso-123", {
      subject: "1",
    });

    expect(() => verifyToken(foreign)).toThrow(AppError);
  });

  it("recusa um texto que nem é um token", () => {
    expect(() => verifyToken("isso-nao-e-um-token")).toThrow(AppError);
  });
});

// Relógio falso: esperar 1 hora de verdade para testar a expiração seria absurdo. O vi.useFakeTimers falsifica o relógio. Falsificamos só o Date de propósito: o bcryptjs assíncrono usa temporizadores internos, e falsificá-los travaria o teste.
// afterEach(vi.useRealTimers) devolve o relógio ao normal, para o teste seguinte não herdar o “futuro”.
// toThrow(AppError) confirma que é um erro nosso e controlado (o que carrega o status 401), e não um erro inesperado qualquer.