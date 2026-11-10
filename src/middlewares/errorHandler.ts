// É o ponto único que transforma erros em respostas HTTP:

import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/appError";

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
) {

//     o Express descobre que isso é um tratador de erros contando os parâmetros. Quatro parâmetros (err, req, res, next) = tratador de erros. Três ou menos = middleware comum. Por isso o _next existe mesmo sem ser usado: se você o apagar, o Express passa a tratar a função como middleware normal e para de funcionar, sem avisar.

// Os _ (underscore) na frente de _req e _next são uma convenção: “sei que existe, não vou usar”.

// O Express reconhece um middleware de erro pelos 4 parâmetros (err, req, res, next). Se você tirar um deles, ele deixa de funcionar como tratador de erros. O _next é obrigatório na assinatura mesmo sem uso.
// 1. Erros que nós lançamos de propósito (regras de negócio)
    if (err instanceof AppError) {  // erro que NÓS previmos → responde com o status que veio no carimbo
        res.status(err.statusCode).json({ error: err.message });
        return;
    }

     // 2. Dados fora do formato esperado (Zod)
    if (err instanceof ZodError) {
        res.status(400).json({
            error: "Dados inválidos",
            details: err.issues.map((issue) =>({
                field: issue.path.join("."),
                message: issue.message,

// ZodError: o cliente mandou dados no formato errado. O err.issues lista todos os problemas de uma vez, cada um com o path (qual campo) e a message. O cliente corrige tudo numa tentativa só, em vez de descobrir um erro por vez.

            })),
        });
        return;
    }

    // 3. JSON quebrado no corpo da requisição
    if (err instanceof SyntaxError && "body" in err) {
        res.status(400).json({ error: "JSON inválido no corpo da requisição" });
        return;
    }

// SyntaxError com body: o express.json() lança isso quando o JSON está quebrado (uma vírgula faltando, por exemplo). Na Etapa 3 isso caía no 500, o que era errado: JSON quebrado é erro do cliente, não do servidor.

    // 4. Outros erros 4xx vindos de bibliotecas (ex.: corpo grande demais = 413)
    const { status } = err as Error & { status?: unknown };

// O tipo Error não tem campo status. Error & { status?: unknown } diz ao TypeScript: “este erro pode ter um status”.
// unknown (e não number) porque não sabemos o que vem lá, e o TypeScript nos obriga a conferir com typeof status === "number". É o mesmo estreitamento do Task | nul

    if (typeof status === "number" && status >= 400 && status < 500) {
        res.status(status).json({
            error:
            status === 413
            ? "Corpo da requisição grande demais"
            : "Requisição inválida",
        });
        return;
    }

    // 5. Bug nosso: registra com o ID da requisição e responde algo genérico
     // erro inesperado: registra para você investigar
    res.log.error({ err }, "Erro inesperado");

// req.log.error({ err }, "mensagem"): o pino usa a convenção objeto primeiro, mensagem depois. A chave err faz o pino registrar a pilha de execução (o stack trace). E como req.log é o logger daquela requisição, a linha já carrega o ID dela.

    res.status(500).json({ error: "Erro interno do servidor", requestId: req.id, 

    // O cliente recebe só o genérico e o requestId. Nenhum detalhe interno vaza, e mesmo assim você consegue achar o problema

    }); // cliente vê algo genérico
}

// A lógica: se o erro é um AppError, a gente o criou de propósito e sabemos o status. Qualquer outro é um bug inesperado, que vira 500 sem expor detalhes internos ao cliente.

// Por que esconder o erro real no 500? Mensagens internas (“cannot read property of undefined at line 42 of banco.ts”) são um mapa para atacantes e não ajudam o usuário. Você vê o detalhe no terminal; o cliente vê o genérico. Esse é um princípio de segurança que
// E como o erro chega até ele? Quando algo lança throw dentro de uma rota, o Express captura sozinho e procura o primeiro middleware de 4 parâmetros. Não precisa de try/catch em lugar nenhum.


// Os níveis


// Nível	    Número	        Quando usar
// fatal	    60	            O processo vai morrer
// error	    50	            Algo falhou e precisa de atenção (um 500)
// warn	        40	            Suspeito, mas o sistema funcionou (um 401, um 400)
// info	        30	            Eventos normais (requisição OK, servidor iniciado)
// debug	    20	            Detalhes para investigar
// trace	    10	            Ultra detalhado

// LOG_LEVEL=info significa “este nível e acima”: info, warn, error, fatal aparecem; debug e trace não. silent cala tudo (nos testes). O customLogLevel do pino-http mapeia o resultado: 2xx e 3xx = info, 4xx = warn, 5xx = error.