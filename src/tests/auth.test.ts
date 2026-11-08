import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";
import { prisma } from "../lib/prisma";
import { createUser } from "./helpers";
import { tamperToken } from "./tokens";

const validBody = {
  name: "Maria",
  email: "maria@exemplo.com",
  password: "senha-forte-123",
};

describe("POST /auth/register", () => {
  it("cria o usuário e devolve um token", async () => {
    const res = await request(app).post("/auth/register").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      name: "Maria",
      email: "maria@exemplo.com",
    });
  });

  it("nunca devolve a senha nem o hash na resposta", async () => {
    const res = await request(app).post("/auth/register").send(validBody);

    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain(validBody.password);
  });

  it("guarda o hash no banco, nunca a senha", async () => {
    await request(app).post("/auth/register").send(validBody);

    const saved = await prisma.user.findUnique({
      where: { email: validBody.email },
    });

    expect(saved?.passwordHash).not.toBe(validBody.password);
    expect(saved?.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("normaliza o e-mail (espaços e maiúsculas)", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ ...validBody, email: "  MARIA@Exemplo.COM " });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("maria@exemplo.com");
  });

  it("recusa e-mail já cadastrado com 409", async () => {
    await createUser();

    const res = await request(app).post("/auth/register").send(validBody);

    expect(res.status).toBe(409);
  });

  it("recusa dados inválidos com 400 e aponta os campos com problema", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "M", email: "nao-e-email", password: "123" });

    expect(res.status).toBe(400);

    const fields = res.body.details.map((d: { field: string }) => d.field);

// No teste de dados inválidos, res.body.details.map((d) => d.field) extrai os nomes dos campos com problema, e expect.arrayContaining(["name", "email", "password"]) confere que os três aparecem. (O ?. em saved?.passwordHash é o acesso seguro: se saved fosse null, não quebraria.)

    expect(fields).toEqual(
      expect.arrayContaining(["name", "email", "password"])
    );
  });

  it("recusa JSON quebrado com 400", async () => {
    const res = await request(app)
      .post("/auth/register")
      .set("Content-Type", "application/json")
      .send("{ name: }");

    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("devolve um token para credenciais corretas", async () => {
    const user = await createUser();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("aceita o e-mail com maiúsculas", async () => {
    const user = await createUser();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email.toUpperCase(), password: user.password });

    expect(res.status).toBe(200);
  });

  it("recusa senha errada com 401", async () => {
    const user = await createUser();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "senha-errada-123" });

    expect(res.status).toBe(401);
  });

  it("usa a MESMA mensagem para e-mail inexistente e senha errada", async () => {
    const user = await createUser();

    const wrongPassword = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: "senha-errada-123" });
    const unknownEmail = await request(app)
      .post("/auth/login")
      .send({ email: "ninguem@exemplo.com", password: "senha-forte-123" });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error).toBe(wrongPassword.body.error);
  });
});

describe("GET /auth/me", () => {
  it("devolve o usuário dono do token", async () => {
    const user = await createUser();

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(user.email);
    expect(res.body).not.toHaveProperty("passwordHash");
  });

  it("recusa sem token (401)", async () => {
    const res = await request(app).get("/auth/me");

    expect(res.status).toBe(401);
  });

  it("recusa um cabeçalho que não segue o formato Bearer (401)", async () => {
    const user = await createUser();

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Token ${user.token}`);

    expect(res.status).toBe(401);
  });

  it("recusa token adulterado (401)", async () => {
    const user = await createUser();
    const forged = tamperToken(user.token, user.userId + 1);

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });

  it("recusa o token de um usuário que não existe mais (401)", async () => {
    const user = await createUser();
    await prisma.user.delete({ where: { id: user.userId } });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${user.token}`);

    expect(res.status).toBe(401);
  });
});