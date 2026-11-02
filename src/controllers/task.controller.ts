// O garçom: pega as coisas do req, chama o service e devolve a resposta.

import type { Request, Response } from "express";
import {
    createTaskSchema,
    idParamSchema,
    listTasksQuerySchema,
    updateTaskSchema,
} from "../schemas/task.schema";
import * as taskService from "../services/task.service";


// import * as taskService: importa todas as funções do arquivo sob um nome só, e na hora de ler fica claro de onde cada uma vem (taskService.createTask). Ajuda a lembrar que aquilo é do service.

export async function list(req: Request, res: Response) {

// O await não é opcional. Sem ele, o controller enviaria a Promise em vez do resultado (você veria {} na resposta), e erros como o 404 escapariam sem tratamento.

    const filters = listTasksQuerySchema.parse(req.query);
    res.json(await taskService.listTasks(filters));
}

export async function getOne(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json(await taskService.getTaskById(id));
}

export async function create(req: Request, res: Response) {
    const input = createTaskSchema.parse(req.body);
    res.status(201).json(await taskService.createTask(input));
}

export async function update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const input = updateTaskSchema.parse(req.body);
    res.json(await taskService.updateTask(id, input));
}

export async function remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    await taskService.deleteTask(id);
    res.status(204).send();
}

// Os erros continuam chegando ao errorHandler sozinhos. O Express 5 captura erros de funções async automaticamente (confira com npm ls express).

// Cada função faz só três coisas:

// Tira os dados do req
// Chama o service
// Devolve o resultado com o status certo

// Os dados que saem do parse já vêm tipados. id é number, input.title é string. O editor autocompleta e o TypeScript avisa de erros.