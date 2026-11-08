import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

describe("app", () => {
    it("responde 200 e { status: 'ok' } em /health", async () => {
        const res = await request(app).get("/health");

        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: "ok" });
    });

    it("responde 404 em JSON para uma rota que não existe", async () => {
        const res = await request(app).get("/rota-inexistente");

        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "Rota não encontrada"});
    });
});