import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../app";
import { bearer, createTask, createUser } from "./helpers";

async function mariaAndJoao() {
  const maria = await createUser();
  const joao = await createUser({ name: "João", email: "joao@exemplo.com" });
  return { maria, joao };
}

describe("as rotas de tarefas exigem login", () => {
  it.each([
    ["get", "/tasks"],
    ["post", "/tasks"],
    ["get", "/tasks/1"],
    ["patch", "/tasks/1"],
    ["delete", "/tasks/1"],
  ] as const)("%s %s sem token devolve 401", async (method, path) => {

// Em vez de escrever 5 testes quase iguais, descrevemos os casos em uma tabela e o Vitest gera um teste para cada linha (o %s é preenchido com os valores). O as const diz ao TypeScript que "get", "post"... são exatamente esses textos (e não “qualquer string”), o que permite chamar request(app)[method].

    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
  });
});

describe("POST /tasks", () => {
  it("cria uma tarefa que pertence ao usuário logado", async () => {
    const maria = await createUser();

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", bearer(maria.token))
      .send({ title: "  Estudar testes  " });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: "Estudar testes",
      done: false,
      userId: maria.userId,
    });
  });

  it("recusa título vazio com 400", async () => {
    const maria = await createUser();

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", bearer(maria.token))
      .send({ title: "   " });

    expect(res.status).toBe(400);
  });

  it("recusa título repetido do mesmo usuário com 409", async () => {
    const maria = await createUser();
    await createTask(maria.token, "Estudar");

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", bearer(maria.token))
      .send({ title: "Estudar" });

    expect(res.status).toBe(409);
  });

  it("permite o mesmo título para usuários diferentes", async () => {
    const { maria, joao } = await mariaAndJoao();
    await createTask(maria.token, "Estudar");

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", bearer(joao.token))
      .send({ title: "Estudar" });

    expect(res.status).toBe(201);
  });

  it("ignora um userId enviado no corpo: o dono vem sempre do token", async () => {
    const { maria, joao } = await mariaAndJoao();

    const res = await request(app)
      .post("/tasks")
      .set("Authorization", bearer(maria.token))
      .send({ title: "Tentativa", userId: joao.userId });

// O teste do userId no corpo (send({ title: "Tentativa", userId: joao.userId })): é uma defesa contra mass assignment (atribuição em massa): o cliente tenta enviar campos que não deveria controlar (como o dono da tarefa) esperando que o servidor os aceite. O teste prova que o dono vem sempre do token, e que o Zod descarta o campo extra.

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(maria.userId);
  });
});

describe("GET /tasks", () => {
  it("lista apenas as tarefas do usuário logado", async () => {
    const { maria, joao } = await mariaAndJoao();
    await createTask(maria.token, "Da Maria");
    await createTask(joao.token, "Do João");

    const res = await request(app)
      .get("/tasks")
      .set("Authorization", bearer(maria.token));

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Da Maria");
  });

  it("filtra por done=true", async () => {
    const maria = await createUser();
    const done = await createTask(maria.token, "Concluída");
    await createTask(maria.token, "Pendente");
    await request(app)
      .patch(`/tasks/${done.id}`)
      .set("Authorization", bearer(maria.token))
      .send({ done: true });

    const res = await request(app)
      .get("/tasks?done=true")
      .set("Authorization", bearer(maria.token));

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Concluída");
  });

  it("recusa um filtro inválido com 400", async () => {
    const maria = await createUser();

    const res = await request(app)
      .get("/tasks?done=talvez")
      .set("Authorization", bearer(maria.token));

    expect(res.status).toBe(400);
  });
});

describe("GET /tasks/:id", () => {
  it("devolve a tarefa do próprio usuário", async () => {
    const maria = await createUser();
    const task = await createTask(maria.token);

    const res = await request(app)
      .get(`/tasks/${task.id}`)
// Nenhum id fixo: usamos sempre o id devolvido pela API (task.id), nunca /tasks/1. Mesmo depois de apagar a tabela, o SQLite continua numerando de onde parou, então o “primeiro” id muda entre execuções.

      .set("Authorization", bearer(maria.token));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(task.id);
  });

  it("devolve 404 para um id que não existe", async () => {
    const maria = await createUser();

    const res = await request(app)
      .get("/tasks/999999")
      .set("Authorization", bearer(maria.token));

    expect(res.status).toBe(404);
  });

  it("devolve 400 para um id que não é número", async () => {
    const maria = await createUser();

    const res = await request(app)
      .get("/tasks/abc")
      .set("Authorization", bearer(maria.token));

    expect(res.status).toBe(400);
  });
});

describe("PATCH /tasks/:id", () => {
  it("marca a tarefa como concluída", async () => {
    const maria = await createUser();
    const task = await createTask(maria.token);

    const res = await request(app)
      .patch(`/tasks/${task.id}`)
      .set("Authorization", bearer(maria.token))
      .send({ done: true });

    expect(res.status).toBe(200);
    expect(res.body.done).toBe(true);
  });

  it("recusa um corpo vazio com 400", async () => {
    const maria = await createUser();
    const task = await createTask(maria.token);

    const res = await request(app)
      .patch(`/tasks/${task.id}`)
      .set("Authorization", bearer(maria.token))
      .send({});

    expect(res.status).toBe(400);
  });

  it("permite manter o próprio título (não conflita consigo mesma)", async () => {
    const maria = await createUser();
    const task = await createTask(maria.token, "Estudar");

    const res = await request(app)
      .patch(`/tasks/${task.id}`)
      .set("Authorization", bearer(maria.token))
      .send({ title: "Estudar", done: true });

    expect(res.status).toBe(200);

// O teste do título repetido no PATCH (“permite manter o próprio título”): guarda uma decisão antiga, o ignoreId da Etapa 4. Se alguém removesse aquele parâmetro, ao editar uma tarefa mantendo o título ela “conflitaria consigo mesma” e daria 409. O teste impede essa regressão.

  });
});

describe("DELETE /tasks/:id", () => {
  it("apaga a tarefa com 204 e ela deixa de existir", async () => {
    const maria = await createUser();
    const task = await createTask(maria.token);

    const deleted = await request(app)
      .delete(`/tasks/${task.id}`)
      .set("Authorization", bearer(maria.token));
    const afterwards = await request(app)
      .get(`/tasks/${task.id}`)
      .set("Authorization", bearer(maria.token));

    expect(deleted.status).toBe(204);
    expect(afterwards.status).toBe(404);
  });
});

describe("isolamento entre usuários", () => {
  it("João não consegue ler a tarefa da Maria (404)", async () => {
    const { maria, joao } = await mariaAndJoao();
    const task = await createTask(maria.token, "Tarefa da Maria");

    const res = await request(app)
      .get(`/tasks/${task.id}`)
      .set("Authorization", bearer(joao.token));

    expect(res.status).toBe(404);
  });

  it("João não consegue alterar a tarefa da Maria, e ela continua intacta", async () => {
    const { maria, joao } = await mariaAndJoao();
    const task = await createTask(maria.token, "Tarefa da Maria");

    const attempt = await request(app)
      .patch(`/tasks/${task.id}`)
      .set("Authorization", bearer(joao.token))
      .send({ title: "Invadida", done: true });
    const afterwards = await request(app)
      .get(`/tasks/${task.id}`)
      .set("Authorization", bearer(maria.token));

    expect(attempt.status).toBe(404);
    expect(afterwards.body).toMatchObject({
      title: "Tarefa da Maria",
      done: false,

// Os três testes de isolamento: repare que eles não conferem só o 404 da tentativa. Depois dela, conferem a tarefa da Maria de novo: { title: "Tarefa da Maria", done: false } continua intacta, ou status 200 continua existindo. É a diferença entre testar a resposta e testar o efeito: um bug poderia devolver 404 e mesmo assim apagar a tarefa. Teste o que aconteceu, não só o que foi dito.

    });
  });

  it("João não consegue apagar a tarefa da Maria, e ela continua existindo", async () => {
    const { maria, joao } = await mariaAndJoao();
    const task = await createTask(maria.token, "Tarefa da Maria");

    const attempt = await request(app)
      .delete(`/tasks/${task.id}`)
      .set("Authorization", bearer(joao.token));
    const afterwards = await request(app)
      .get(`/tasks/${task.id}`)
      .set("Authorization", bearer(maria.token));

    expect(attempt.status).toBe(404);
    expect(afterwards.status).toBe(200);
  });
});

// toBe para números, textos e booleanos (e para status HTTP).
// toEqual quando o objeto inteiro importa e é estável.
// toMatchObject quando só alguns campos importam (o mais comum em APIs).

// request(app): “faça pedidos a este app”.
// .post("/tasks"): o verbo e o caminho (também .get, .patch, .delete).
// .set("Authorization", ...): define um cabeçalho.
// .send({ ... }): o corpo, que vira JSON.
// await: o pedido só é disparado e esperado ao usar o await.
// res.status e res.body: o status e o corpo já convertido de JSON para objeto.

// Gancho	      Quando roda	                          Quantas vezes	            Para quê
// globalSetup	Antes de tudo, no processo principal	1	                        Criar o banco de teste
// setupFiles	  Antes de cada arquivo de teste	      1 por arquivo	            Registrar a limpeza e a trava
// beforeEach	  Antes de cada teste	                  1 por teste	              Esvaziar as tabelas
// afterAll	    Depois do último teste do arquivo	    1 por arquivo	            Fechar a conexão com o banco

// Por que fileParallelism: false? Por padrão, o Vitest roda arquivos de teste ao mesmo tempo (dentro de um arquivo, os testes rodam em sequência). Mas todos os arquivos usam o mesmo test.db. Se rodassem juntos, o beforeEach de um apagaria os dados que outro está usando no meio do teste. Rodando um arquivo por vez, o problema some.

// 7. O caminho completo de um teste

// O teste “João não consegue ler a tarefa da Maria”:

// beforeEach esvazia as tabelas.
// Arrange: mariaAndJoao() faz dois POST /auth/register reais (bcrypt custo 4) e guarda os tokens.
// createTask(maria.token, ...) faz POST /tasks e devolve a tarefa com o id, por exemplo, 7.
// Act: GET /tasks/7 com o token do João.
// Por dentro: authenticate valida o token e grava req.userId = (id do João) → o controller → o service → o repository busca findFirst({ where: { id: 7, userId: (do João) } }) → não existe tal linha → null → o service lança 404 → o errorHandler responde 404.
// Assert: expect(res.status).toBe(404) ✅.

// E se alguém “quebrar” o repository tirando o userId do where? O passo 5 acharia a tarefa 7, devolveria 200, e o teste reprovaria com Expected 404, Received 200. É exatamente para isso que o teste existe.