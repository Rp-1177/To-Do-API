// É o ponto único que transforma erros em respostas HTTP:

import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/appError";

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
) {

//     o Express descobre que isso é um tratador de erros contando os parâmetros. Quatro parâmetros (err, req, res, next) = tratador de erros. Três ou menos = middleware comum. Por isso o _next existe mesmo sem ser usado: se você o apagar, o Express passa a tratar a função como middleware normal e para de funcionar, sem avisar.

// Os _ (underscore) na frente de _req e _next são uma convenção: “sei que existe, não vou usar”.

// O Express reconhece um middleware de erro pelos 4 parâmetros (err, req, res, next). Se você tirar um deles, ele deixa de funcionar como tratador de erros. O _next é obrigatório na assinatura mesmo sem uso.

    if (err instanceof AppError) {  // erro que NÓS previmos → responde com o status que veio no carimbo
        res.status(err.statusCode).json({ error: err.message });
        return;
    }

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

    if (err instanceof SyntaxError && "body" in err) {
        res.status(400).json({ error: "JSON inválido no corpo da requisição" });
        return;
    }

// SyntaxError com body: o express.json() lança isso quando o JSON está quebrado (uma vírgula faltando, por exemplo). Na Etapa 3 isso caía no 500, o que era errado: JSON quebrado é erro do cliente, não do servidor.

    console.error(err); // erro inesperado: registra para você investigar
    res.status(500).json({ error: "Erro interno do servidor" }); // cliente vê algo genérico
}

// A lógica: se o erro é um AppError, a gente o criou de propósito e sabemos o status. Qualquer outro é um bug inesperado, que vira 500 sem expor detalhes internos ao cliente.

// Por que esconder o erro real no 500? Mensagens internas (“cannot read property of undefined at line 42 of banco.ts”) são um mapa para atacantes e não ajudam o usuário. Você vê o detalhe no terminal; o cliente vê o genérico. Esse é um princípio de segurança que
// E como o erro chega até ele? Quando algo lança throw dentro de uma rota, o Express captura sozinho e procura o primeiro middleware de 4 parâmetros. Não precisa de try/catch em lugar nenhum.