// monta a aplicação:
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { AppError } from "./errors/appError";
import { prisma } from "./lib/prisma";
import { errorHandler } from "./middlewares/errorHandler";
import { httpLogger } from "./middlewares/httpLogger";
import { createRateLimiter } from "./middlewares/ratelimit";
import authRoutes from "./routes/auth.routes";
import taskRoutes from "./routes/task.routes";

interface AppOptions {
  generalLimit?: number;
  authLimit?: number;
}

export function createApp(options: AppOptions = {}) {
  const generalLimit = options.generalLimit ?? env.RATE_LIMIT_MAX;
  const authLimit = options.authLimit ?? env.AUTH_RATE_LIMIT_MAX;

// Uma função que monta e devolve a aplicação. Cada chamada cria um app novo, com limitadores novos e contadores zerados. É uma forma leve de injeção de dependência: em vez de a função ler valores fixos do ambiente, ela os recebe como parâmetro (com padrões).
// ?? vs ||: o ?? só usa o valor da direita se o da esquerda for null ou undefined. O || também trocaria valores “falsos” como o número 0. Para configuração numérica, ?? é o correto.
// interface AppOptions com campos opcionais (?): chamar createApp() sem nada continua válido.

  const app = express();

  // Quantos proxies confiáveis existem na frente (0 = nenhum)
  app.set("trust proxy", env.TRUST_PROXY_HOPS);

  app.use(httpLogger);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 600,
    })
  );

  // Health checks ficam ANTES dos limitadores: não podem ser bloqueados
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/health/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  app.use(createRateLimiter(generalLimit));

  // Um limitador só para as duas rotas: tentativas de login e cadastros somam
  const authLimiter = createRateLimiter(authLimit);
  app.use("/auth/login", authLimiter);
  app.use("/auth/register", authLimiter);

  app.use(express.json({ limit: "10kb" }));

  app.use("/auth", authRoutes);
  app.use("/tasks", taskRoutes);

  // Se chegou aqui, nenhuma rota atendeu o pedido
  app.use((_req, _res) => {
    throw new AppError("Rota não encontrada", 404);
  });

  app.use(errorHandler); // sempre por último

  return app;
}

export default createApp();


// log → helmet → cors → health → limite geral → limite de auth → leitura do JSON → rotas → 404 → erros
// O CORS vem antes dos limitadores para os preflights (OPTIONS) serem respondidos sem gastar a cota.
// Os limitadores vêm antes da leitura do corpo: pedido bloqueado nem chega a ser processado.
// O limite de 10kb basta para esta API: o maior corpo possível é um cadastro de poucas linhas. Passou disso, é 413.

// Se...	                                                    O problema
// O /health viesse depois do limitador	                      Sob ataque, o balanceador seria bloqueado, acharia que a API caiu e a reiniciaria, o que piora a situação. O teste “nunca limita os health checks” existe por isso
// O express.json viesse antes dos limitadores	              Gastaríamos processamento lendo o corpo de pedidos que seriam bloqueados mesmo
// O cors viesse depois do limitador	                        Cada preflight consumiria a cota do usuário legítimo
// O httpLogger não fosse o primeiro	                        Pedidos bloqueados ficariam invisíveis no log
// O errorHandler não fosse o último	                        Erros não chegariam a ele

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