import { AppError } from "../errors/appError";
import { taskRepository } from "../repositories/task.repositories";
import {
    CreateTaskInput,
    ListTasksQuery,
    UpdateTaskInput,
} from "../schemas/task.schema";
import { Task } from "../types/task";

// Regra de negócio: não pode haver dois títulos iguais
function ensureTitleIsAvailable(title: string, ignoreId?: number): void {

// O parâmetro ignoreId evita um bug clássico: ao editar a tarefa 3 mantendo o próprio título, a busca encontraria ela mesma e daria conflito. Ignoramos o id da tarefa que está sendo editada.

    const existing = taskRepository.findByTitle(title);
    if (existing && existing.id !== ignoreId) {
        throw new AppError("Já existe uma tarefa com esse título", 409);

// Status 409 Conflict: “o pedido está bem formado, mas conflita com o estado atual”. É o código certo para duplicidade. Recapitulando: 400 = pedido malformado, 404 = não existe, 409 = conflito com algo que já existe.

    }
}

export function listTasks(filters: ListTasksQuery): Task[] {
    return taskRepository.findAll(filters);
}

export function getTaskById(id: number): Task {
    const task = taskRepository.findById(id);
    if (!task) throw new AppError("Tarefa não encontrada", 404);

// Em vez de return com res.status(...), usamos throw. O erro “sobe” pelas camadas até alguém tratá-lo (passo 7).

    return task;
}

export function createTask(input: CreateTaskInput): Task {

// O service recebe o que o cliente mandou, e o cliente pode mandar qualquer coisa: número, lista, nada. Se você tipasse como string, estaria mentindo para o TypeScript.

// Tipo	     Significado	                        Resultado
// string	“garanto que é texto”	                Mentira, ninguém garantiu
// any	    “TypeScript, desliga a checagem”	    Perigoso, erros passam batido
// unknown	“não sei o que é, me obriga a conferir”	Honesto e seguro

    ensureTitleIsAvailable(input.title);

// ensureTitleIsAvailable é a nova regra de negócio. Repare que ela não aparece no schema: um schema só enxerga o dado isolado, não consegue saber que já existe outra tarefa com esse título.

    return taskRepository.create(input.title);
}

export function updateTask(
    id: number,
    input: UpdateTaskInput

// O parâmetro é unknown (e não any) porque não sabemos o que o cliente mandou. O TypeScript nos obriga a checar o tipo antes de usar, e isso é validação de verdade

): Task {
    getTaskById(id); // lança 404 se não existir

// Decisão 3: getTaskById(id) dentro do updateTask. Reaproveitar a função existente. Ela já lança o 404 se não existir, então não precisamos repetir esse if. Se uma regra já existe, chame, não copie.
// Decisão 4: o objeto changes. Em vez de repassar o que o cliente mandou, montamos um objeto novo só com o que passou na validação. Isso funciona como uma peneira: se o cliente enviar { "title": "ok", "id": 999, "hacker": true }, os campos id e hacker morrem aqui e nunca chegam ao repository. Nunca repasse o corpo direto para o armazenamento.

    if (input.title !== undefined) {
        ensureTitleIsAvailable(input.title, id);
    }

    const updated = taskRepository.update(id, input);
    if (!updated) throw new AppError("Tarefa não encontrada", 404);
    return updated;
}

export function deleteTask(id: number): void {
    const removed = taskRepository.remove(id);
    if (!removed) throw new AppError("Tarefa não encontrada", 404);
}

// Aqui ficam as regras de negócio

// throw interrompe a função na hora e joga o erro para cima, como gritar “Problema!” na cozinha e todo mundo parar. Ganhamos duas coisas: não precisamos mais do return manual, e o service não precisa conhecer res.