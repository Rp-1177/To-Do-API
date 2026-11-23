import SwaggerParser from "@apidevtools/swagger-parser";
import  request  from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";

describe("documentação da API", () => {
    it("serve um documento OpenAPI válido em /openapi.json", async () => {
        const res = await request(app).get("/openapi.json");

        expect(res.status).toBe(200);
        // O parser lança um erro detalhado se a especificação estiver incorreta
        await expect(SwaggerParser.validate(res.body)).resolves.toBeDefined();
    });

    it.each([
        ["get", "/health"],
        ["get", "/health/ready"],
        ["post", "/auth/register"],
        ["post", "/auth/login"],
        ["get", "/auth/me"],
        ["get", "/tasks"],
        ["post", "/tasks"],
        ["get", "/tasks/{id}"],
        ["patch", "/tasks/{id}"],
        ["delete", "/tasks/{id}"],
    ] as const)("documenta %s %s", async (method, path) => {

// Um teste por linha da tabela. Se você criar uma rota nova e esquecer de documentá-la, o teste não avisa sozinho (ele só confere as que estão na tabela). A disciplina é: rota nova → linha nova na tabela e entrada nova no documento. O ?. evita um erro de “undefined” caso o caminho não exista, dando uma falha clara em vez de um erro confuso.

        const res = await request(app).get("/openapi.json");

        expect(res.body.paths[path]?.[method]).toBeDefined();
    });

    it("serve a interface do Swagger UI em /docs/", async () => {
        const res = await request(app).get("/docs/");

        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/html");
    });

    it("afrouxa a CSP só em /docs, sem enfraquecer o resto da API", async () => {
        const docs = await request(app).get("/docs/");
        const api = await request(app).get("/health");

        expect(docs.headers["content-security-policy"]).toContain("style-src");
        expect(docs.headers["content-security-policy"]).not.toContain(
            "upgrade-insecure-requests"
        );
        expect(api.headers["content-security-policy"]).toContain(
            "upgrade-insecure-requests"
        );
    });
});