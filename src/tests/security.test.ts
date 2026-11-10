import request from "supertest";
import { describe, expect, it } from "vitest";
import app, { createApp } from "../app";

describe("cabeçalhos de segurança (helmet)", () => {
  it("não revela a tecnologia do servidor", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  it("impede o navegador de adivinhar o tipo do conteúdo", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("devolve um X-Request-Id para rastrear a requisição", async () => {
    const res = await request(app).get("/tasks");

    expect(res.headers["x-request-id"]).toEqual(expect.any(String));
  });
});

describe("CORS", () => {
  const allowed = "http://localhost:5173";

  it("libera uma origem que está na lista", async () => {
    const res = await request(app).get("/health").set("Origin", allowed);

    expect(res.headers["access-control-allow-origin"]).toBe(allowed);
  });

  it("não libera uma origem fora da lista", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://site-malicioso.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("responde ao preflight (OPTIONS) das origens permitidas", async () => {
    const res = await request(app)
      .options("/tasks")
      .set("Origin", allowed)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");

    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe(allowed);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
  });
});

describe("limite de tamanho do corpo", () => {
  it("recusa um corpo grande demais com 413", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "a".repeat(20_000) });

    expect(res.status).toBe(413);
    expect(res.body.error).toEqual(expect.any(String));
  });
});

describe("health checks", () => {
  it("/health/ready confirma que o banco responde", async () => {
    const res = await request(app).get("/health/ready");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });
});

describe("rate limiting", () => {
  it("bloqueia o login depois de exceder o limite (429)", async () => {
    const limitedApp = createApp({ authLimit: 3 });
    const attempt = () =>
      request(limitedApp)
        .post("/auth/login")
        .send({ email: "alguem@exemplo.com", password: "qualquer-senha" });

    for (let i = 0; i < 3; i++) {
      expect((await attempt()).status).toBe(401);
    }

    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.headers["retry-after"]).toBeDefined();
    expect(blocked.body.error).toEqual(expect.any(String));
  });

  it("bloqueia também o cadastro em massa", async () => {
    const limitedApp = createApp({ authLimit: 2 });
    const attempt = (n: number) =>
      request(limitedApp)
        .post("/auth/register")
        .send({
          name: "Spam",
          email: `spam${n}@exemplo.com`,
          password: "senha-forte-123",
        });

    expect((await attempt(1)).status).toBe(201);
    expect((await attempt(2)).status).toBe(201);
    expect((await attempt(3)).status).toBe(429);
  });

  it("aplica o limite geral às demais rotas", async () => {
    const limitedApp = createApp({ generalLimit: 2 });

    await request(limitedApp).get("/tasks");
    await request(limitedApp).get("/tasks");
    const blocked = await request(limitedApp).get("/tasks");

    expect(blocked.status).toBe(429);
  });

  it("nunca limita os health checks", async () => {
    const limitedApp = createApp({ generalLimit: 1 });

    for (let i = 0; i < 5; i++) {
      const res = await request(limitedApp).get("/health");
      expect(res.status).toBe(200);
    }
  });
});