// O garçom: pega as coisas do req, chama o service e devolve a resposta.

import { Request, Response } from "express";
import {
    createTaskSchema,
    idParamSchema,
    listTasksQuerySchema,
    updateTaskSchema,
} from "../schemas/task.schema";
import * as taskService from "../services/task.service";


// import * as taskService: importa todas as funções do arquivo sob um nome só, e na hora de ler fica claro de onde cada uma vem (taskService.createTask). Ajuda a lembrar que aquilo é do service.

export function list(req: Request, res: Response) {
    const filters = listTasksQuerySchema.parse(req.query);

// .parse() lança erro se o dado for inválido. Não precisamos de if nem de try/catch: o erro sobe sozinho até o errorHandler, como já acontecia com o AppError.

    res.json(taskService.listTasks(filters));
}

export function getOne(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    res.json(taskService.getTaskById(id));
}

export function create (req: Request, res: Response) {
    const input = createTaskSchema.parse(req.body);

// O req.body?.title (com ?.) existe porque, se o cliente não mandar corpo nenhum, req.body pode ser undefined, e acessar .title nele derrubaria a requisição com um erro 500.
// O ?. em req.body?.title: é o “acesso seguro”. Se o cliente não mandar corpo nenhum, req.body é undefined, e undefined.title derruba o programa. Com ?., o resultado simplesmente vira undefined e o service reclama com um 400 decente. É a diferença entre uma resposta educada e um erro 500.

    res.status(201).json(taskService.createTask(input));
}

export function update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const input = updateTaskSchema.parse(req.body);
    res.json(taskService.updateTask(id, input));
}

// O ?? {} em req.body ?? {}: “se for undefined, use um objeto vazio”. O mesmo cuidado.

// Quem converte o status? Só o controller escreve números de sucesso (201, 204). Os de erro vêm do AppError.

export function remove(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    taskService.deleteTask(id);
    res.status(204).send();
}

// Cada função faz só três coisas:

// Tira os dados do req
// Chama o service
// Devolve o resultado com o status certo

// Os dados que saem do parse já vêm tipados. id é number, input.title é string. O editor autocompleta e o TypeScript avisa de erros.