// monta a aplicação:

import express from "express";
import taskRoutes from "./routes/task.routes";
import { AppError } from "./errors/appError";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

app.use("/tasks", taskRoutes);

// Se chegou aqui, nenhuma rota atendeu o pedido
app.use((_req, _res) => {
    throw new AppError("Rota não encontrada", 404)
});

app.use(errorHandler); // sempre por último

export default app;

// interface Task define o formato de uma tarefa. O TypeScript passa a avisar se você usar um campo que não existe.
// Caixa	     Onde aparece	         Para que serve	                      Exemplo
// req.params	no caminho da URL	    Qual recurso (identidade)	        /tasks/5 → id = 5
// req.query	depois do ?	           Como listar (filtro, ordem, página)	/tasks?done=true
// req.body	   dentro da requisição	     Os dados a criar/alterar	        { "title": "Estudar" }

// Macete: params = QUEM, query = FILTRO, body = CONTEÚDO.

// params e query chegam sempre como texto. Por isso o Number(req.params.id).
// body só funciona por causa do app.use(express.json()). Sem ele, req.body vem undefined.

// toda rota segue 4 passos

// Receber: pegar o que o cliente mandou (params, body, query)
// Validar: o que mandou faz sentido? Se não, responde 400 e para
// Agir: mexer nos dados (buscar, criar, alterar, apagar)
// Responder: devolver o status certo + o resultado

// res.json() envia a resposta, mas não interrompe a função. Sem return, o código continua e tenta responder de novo, o que dá o erro “Cannot set headers after they are sent”. Regra: respondeu para um caso de erro? return na hora. É o padrão de early return: resolva os casos ruins primeiro e deixe o caminho feliz no final, sem aninhamento.
// Na rota PATCH, repare na sequência: primeiro confere se a tarefa existe (404), depois valida o corpo (400), por fim altera. Valide barato antes do caro, e nunca altere nada antes de ter certeza de que o pedido é válido.

// return depois de responder: só se pode responder uma vez por requisição. Sem o return, o código continuaria rodando e tentaria responder de novo.

// Qual o recurso e o verbo? → /tasks/stats, GET (só leio)
// Vem dado do cliente? → não, então não tem body nem params
// O que pode dar errado? → nada a validar aqui
// Que dado devolvo e com que status? → { total, done }, 200

// Escrito:

// app.get("/tasks/stats", (_req, res) => {
//   const done = tasks.filter((t) => t.done).length;
//   res.json({ total: tasks.length, done });
// });

// Um alerta: essa rota precisa vir antes de /tasks/:id. O Express lê as rotas de cima para baixo, e se :id vier primeiro, ele acharia que "stats" é um id. A ordem das rotas importa, e quase ninguém te conta isso.

// Pedido = verbo + caminho + (body). Resposta = status + (JSON).
// 4 passos: receber → validar → agir → responder.
// 3 caixas: params (quem), query (filtro), body (conteúdo).
// Status: 2xx deu certo, 4xx cliente errou, 5xx servidor errou.
// Errou? return. Rotas específicas antes das genéricas.

// Como decidir onde cada código vai

// Quando for escrever algo novo, pergunte nesta ordem:

// Mexe com req/res ou status HTTP? → controller
// É uma regra ou validação do negócio? → service
// Lê ou grava dados? → repository
// Define qual URL/verbo chama o quê? → routes

// Exemplo: “tarefa concluída não pode ter o título alterado”. É uma regra, então vai no service. Não vai no controller nem no repository.

// Resumo para a parede

// Routes = cardápio · Controller = garçom (HTTP) · Service = chef (regras) · Repository = estoque (dados).
// Cada camada só chama a de baixo. O service não conhece Express.
// Erro de regra → throw new AppError(msg, status). Quem converte em resposta é o errorHandler.
// Refatorar = mudar a estrutura sem mudar o comportamento.

// app.ts recebe, o express.json() transforma o corpo em objeto, e app.use("/tasks", ...) manda para o router de tarefas.
// Routes vê “POST na raiz de /tasks” e chama taskController.create.
// Controller pega req.body?.title e entrega ao service. Não pensa, só repassa.
// Service confere: “é texto? não está vazio?”. Se estiver ok, pede ao repository para guardar.
// Repository cria o objeto, coloca no array e devolve a tarefa.
// A tarefa volta pelo mesmo caminho até o controller, que responde 201 com o JSON.

// E se o título vier vazio? No passo 4 o service faz throw new AppError(...). O fluxo normal é interrompido, o erro “sobe” até o errorHandler, e ele responde 400. Os passos 5 e 6 nunca acontecem.

// A regra de decisão: “onde esse código mora?”

// Pergunte nesta ordem e pare na primeira que for “sim”:

// Pergunta	                                              Se sim, vai para
// Usa req, res ou escolhe status de sucesso?	            Controller
// É uma regra, validação ou decisão do negócio?	        Service
// Lê ou grava dados?	                                    Repository
// Só liga uma URL a uma função?	                        Routes

// Exemplos práticos:

// “Título não pode passar de 100 caracteres” → Service
// “Ler o ?done=true da URL” → Controller (é req.query)
// “Filtrar o array pelas concluídas” → Repository
// “Tarefa concluída não pode ser editada” → Service

// Dois tipos de validação: formato (Zod, na borda) e regra de negócio (service).
// Parse, não só validar: dado de fora entra pelo .parse() e sai tipado e limpo.
// params e query chegam como texto: use z.coerce ou .transform.
// O Zod descarta campos desconhecidos (.strict() para rejeitar).
// O tipo nasce do schema (z.infer), uma fonte de verdade só.
// 400 pedido malformado · 404 não existe · 409 conflito com o que já existe.
// errorHandler = triagem do específico ao genérico, sempre com um 500 genérico no fim.