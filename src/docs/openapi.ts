import { z } from "zod";
import { loginSchema, registerSchema } from "../schemas/auth.schema";
import { createTaskSchema, updateTaskSchema } from "../schemas/task.schema";

// Converte um schema do Zod no "Schema Object" do OpenAPI 3.0

function schemaOf(schema: z.ZodType) {
    const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema, {

// O destructuring { $schema: _ignored, ...jsonSchema }: o z.toJSONSchema devolve um objeto com uma chave extra, $schema, que indica a versão do JSON Schema. Dentro de um Schema Object do OpenAPI 3.0 essa chave não pertence, e um validador pode rejeitá-la. A sintaxe significa: “retire $schema e guarde (em _ignored, que descartamos) e junte todo o resto em jsonSchema”. O ... aqui se chama operador rest. O sublinhado em _ignored é a convenção de “variável que não vou usar”.

        target: "openapi-3.0",

// o JSON Schema tem várias versões (“dialetos”) e o OpenAPI 3.0 usa uma variante própria. Esta opção diz ao Zod: “gere no dialeto que o OpenAPI 3.0 entende”.


        io: "input", // o que o CLIENTE envia (antes das transformações)
    });
    return jsonSchema;

// O z.toJSONSchema converte um schema do Zod num formato universal chamado JSON Schema (um padrão para descrever a forma de dados JSON)
// io: "input": um schema do Zod pode ter dois formatos: o que entra e o que sai depois das transformações

}

// ---------- Atalhos para não repetir ----------
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}`});
const response = (name: string) => ({ $ref: `#/components/responses/${name}`});
const secured = [{ bearerAuth: [] as string[] }];

function jsonBody(schemaName: string, example: unknown) {
    return {
        required: true,
        content: {
            "application/json": { schema: ref(schemaName), example },
        },
    };
}

function jsonResponse(description: string, schema: object, example?: unknown) {
  return {
    description,
    content: {
      "application/json": {
        schema,
        ...(example !== undefined ? { example } : {}),

// “se há exemplo, inclua a chave example; se não, não inclua nada”.

      },
    },
  };
}

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  description: "ID da tarefa",
  schema: { type: "integer", minimum: 1 },
  example: 1,
};

const taskExample = {
  id: 1,
  title: "Estudar",
  done: false,
  createdAt: "2026-11-11T14:30:00.000Z",
  userId: 1,
};

const userExample = {
  id: 1,
  name: "Maria",
  email: "maria@exemplo.com",
  createdAt: "2026-11-11T14:00:00.000Z",
};

// ---------- Documento ----------
export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Todo API",
    version: "1.0.0",
    description: [
      "API REST de tarefas com autenticação por JWT. Cada usuário enxerga apenas as próprias tarefas.",
      "",
      "**Como testar:** faça login em `POST /auth/login`, copie o `token`, clique em **Authorize** e cole-o (sem a palavra `Bearer`).",
      "",
      "**Limites:** 100 requisições a cada 15 minutos por IP (10 em login e cadastro). Ao excedê-los a API responde `429` com o cabeçalho `Retry-After`.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Servidor atual" }],
  tags: [
    { name: "Sistema", description: "Verificações de saúde" },
    { name: "Autenticação", description: "Cadastro, login e perfil" },
    { name: "Tarefas", description: "CRUD de tarefas do usuário logado" },
  ],

// servers: [{ url: "/" }], no documento, faz o “Try it out” chamar a mesma origem. Assim nem existe CORS no caminho.

  paths: {
    "/health": {
      get: {
        tags: ["Sistema"],
        summary: "O processo está vivo? (liveness)",
        responses: {
          "200": jsonResponse("Processo respondendo", {
            type: "object",
            properties: { status: { type: "string", example: "ok" } },
          }),
        },
      },
    },
    "/health/ready": {
      get: {
        tags: ["Sistema"],
        summary: "A API está pronta, com o banco respondendo? (readiness)",
        responses: {
          "200": jsonResponse("Pronta para receber tráfego", {
            type: "object",
            properties: { status: { type: "string", example: "ready" } },
          }),
          "503": jsonResponse("Indisponível: o banco não respondeu", {
            type: "object",
            properties: { status: { type: "string", example: "unavailable" } },
          }),
        },
      },
    },

    "/auth/register": {
      post: {
        tags: ["Autenticação"],
        summary: "Cadastra um usuário",
        requestBody: jsonBody("RegisterInput", {
          name: "Maria",
          email: "maria@exemplo.com",
          password: "senha-forte-123",
        }),
        responses: {
          "201": jsonResponse("Usuário criado", ref("AuthResult")),
          "400": response("ValidationError"),
          "409": jsonResponse("E-mail já cadastrado", ref("Error"), {
            error: "E-mail já cadastrado",
          }),
          "429": response("TooManyRequests"),
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Autenticação"],
        summary: "Autentica e devolve o token JWT",
        requestBody: jsonBody("LoginInput", {
          email: "maria@exemplo.com",
          password: "senha-forte-123",
        }),
        responses: {
          "200": jsonResponse("Login realizado", ref("AuthResult")),
          "400": response("ValidationError"),
          "401": jsonResponse("E-mail ou senha incorretos", ref("Error"), {
            error: "E-mail ou senha incorretos",
          }),
          "429": response("TooManyRequests"),
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Autenticação"],
        summary: "Dados do usuário logado",
        security: secured,
        responses: {
          "200": jsonResponse("Usuário do token", ref("User"), userExample),
          "401": response("Unauthorized"),
        },
      },
    },

    "/tasks": {
      get: {
        tags: ["Tarefas"],
        summary: "Lista as tarefas do usuário logado",
        security: secured,
        parameters: [
          {
            name: "done",
            in: "query",
            required: false,
            description: "Filtra por status de conclusão",
            schema: { type: "string", enum: ["true", "false"] },
          },
        ],
        responses: {
          "200": jsonResponse("Lista de tarefas", {
            type: "array",
            items: ref("Task"),
          }),
          "400": response("ValidationError"),
          "401": response("Unauthorized"),
        },
      },
      post: {
        tags: ["Tarefas"],
        summary: "Cria uma tarefa",
        security: secured,
        requestBody: jsonBody("CreateTaskInput", { title: "Estudar" }),
        responses: {
          "201": jsonResponse("Tarefa criada", ref("Task"), taskExample),
          "400": response("ValidationError"),
          "401": response("Unauthorized"),
          "409": jsonResponse("Já existe uma tarefa com esse título", ref("Error"), {
            error: "Já existe uma tarefa com esse título",
          }),
        },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tarefas"],
        summary: "Busca uma tarefa",
        security: secured,
        parameters: [idParameter],
        responses: {
          "200": jsonResponse("A tarefa", ref("Task"), taskExample),
          "400": response("ValidationError"),
          "401": response("Unauthorized"),
          "404": response("NotFound"),
        },
      },
      patch: {
        tags: ["Tarefas"],
        summary: "Atualiza parcialmente uma tarefa",
        description:
          "Envie ao menos um campo (`title` e/ou `done`). Um corpo vazio é recusado com 400.",
        security: secured,
        parameters: [idParameter],
        requestBody: jsonBody("UpdateTaskInput", { done: true }),
        responses: {
          "200": jsonResponse("Tarefa atualizada", ref("Task"), {
            ...taskExample,
            done: true,
          }),
          "400": response("ValidationError"),
          "401": response("Unauthorized"),
          "404": response("NotFound"),
          "409": jsonResponse("Já existe uma tarefa com esse título", ref("Error"), {
            error: "Já existe uma tarefa com esse título",
          }),
        },
      },
      delete: {
        tags: ["Tarefas"],
        summary: "Remove uma tarefa",
        security: secured,
        parameters: [idParameter],
        responses: {
          "204": { description: "Tarefa removida (sem conteúdo)" },
          "400": response("ValidationError"),
          "401": response("Unauthorized"),
          "404": response("NotFound"),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },

    schemas: {
      // Vindos dos schemas do Zod: uma fonte de verdade só
      RegisterInput: schemaOf(registerSchema),
      LoginInput: schemaOf(loginSchema),
      CreateTaskInput: schemaOf(createTaskSchema),
      UpdateTaskInput: schemaOf(updateTaskSchema),

      // Escritos
      Task: {
        type: "object",
        required: ["id", "title", "done", "createdAt", "userId"],
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          done: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          userId: { type: "integer" },
        },
        example: taskExample,
      },
      User: {
        type: "object",
        required: ["id", "name", "email", "createdAt"],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          createdAt: { type: "string", format: "date-time" },
        },
        example: userExample,
      },
      AuthResult: {
        type: "object",
        required: ["user", "token"],
        properties: {
          user: ref("User"),
          token: { type: "string", description: "JWT para o cabeçalho Authorization" },
        },
      },
      Error: {
        type: "object",
        required: ["error"],
        properties: { error: { type: "string" } },
      },
      ValidationError: {
        type: "object",
        required: ["error", "details"],
        properties: {
          error: { type: "string", example: "Dados inválidos" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "title" },
                message: { type: "string", example: "O título não pode ser vazio" },
              },
            },
          },
        },
      },
    },

    responses: {
      ValidationError: jsonResponse("Dados inválidos", ref("ValidationError"), {
        error: "Dados inválidos",
        details: [{ field: "title", message: "O título não pode ser vazio" }],
      }),
      Unauthorized: jsonResponse("Token ausente, inválido ou expirado", ref("Error"), {
        error: "Token inválido ou expirado",
      }),
      NotFound: jsonResponse(
        "Não encontrado (ou pertence a outro usuário)",
        ref("Error"),
        { error: "Tarefa não encontrada" }
      ),
      TooManyRequests: {
        ...jsonResponse("Limite de requisições excedido", ref("Error"), {
          error: "Muitas requisições. Tente novamente mais tarde.",
        }),
        headers: {
          "Retry-After": {
            description: "Segundos até poder tentar de novo",
            schema: { type: "integer" },
          },
        },
      },
    },
  },
};