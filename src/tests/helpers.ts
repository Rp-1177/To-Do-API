import request from "supertest";
import app from "../app";
import { email } from "zod";

export interface TestUser {
    token: string;
    userId: number;
    email: string;
    password: string;
}

export async function createUser(overrides: { name?: string; email?: string; password?: string } = {}
): Promise<TestUser> {
    const credentials = {
        name: "Maria",
        email: "maria@exemplo.com",
        password: "senha-forte-123",
        ...overrides,
    };

    const res = await request(app).post("/auth/register").send(credentials);

    return {
        token: res.body.token,
        userId: res.body.user.id,
        email: credentials.email,
        password: credentials.password,
    };
}

export const bearer = (token: string) => `Bearer ${token}`;

export async function createTask(token: string, title = "Estudar testes") {
    const res = await request(app)
    .post("/tasks")
    .set("Authorization", bearer(token))
    .send({ title });

    return res.body as {
        id: number;
        title: string;
        done: boolean;
        userId: number;
    };
}

// Os valores padrão são de uma “Maria”. O ...overrides sobrescreve o que você quiser: createUser({ name: "João", email: "joao@exemplo.com" }) troca só esses dois campos.
// createUser devolve { token, userId, email, password }: tudo que o teste precisa para agir “como” aquela pessoa.
// createTask usa as { id: number; ... } porque o Supertest devolve res.body como any. Dizemos o formato esperado para ganhar autocomplete nos testes.
// Os ajudantes passam pela API real (POST /auth/register), não inserem direto no banco. Assim também exercitam o caminho completo.