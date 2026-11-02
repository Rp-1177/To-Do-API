import { AppError } from "../errors/appError";
import { taskRepository } from "../repositories/task.repositories";
import type {
    CreateTaskInput,
    ListTasksQuery,
    UpdateTaskInput,
} from "../schemas/task.schema";
import type { Task } from "../types/task";

async function ensureTitleIsAvailable(
    title: string,
    ignoreId?: number
): Promise<void> {
    const existing = await taskRepository.findByTitle(title);
    if (existing && existing.id !== ignoreId) {
        throw new AppError("Já existe uma tarefa com esse título", 409);
    }
}

export async function listTasks(filters: ListTasksQuery): Promise<Task[]> {
    return taskRepository.findAll(filters);
}

export async function getTaskById(id: number): Promise<Task> {
    const task = await taskRepository.findById(id);
    if (!task) {
        throw new AppError("Tarefa não encontrada", 404);
    }
    return task;
}

export async function createTask(input: CreateTaskInput): Promise<Task> {
    await ensureTitleIsAvailable(input.title);
    return taskRepository.create(input.title);
}

export async function updateTask(
    id: number,
    input: UpdateTaskInput
): Promise<Task> {
    await getTaskById(id);

    if (input.title !== undefined) {
        await ensureTitleIsAvailable(input.title, id);
    }

    const updated = await taskRepository.update(id, input);
    if (!updated) {
        throw new AppError("Tarefa não encontrada", 404);
    }
    return updated;
}

export async function deleteTask(id: number): Promise<void> {
    const removed = await taskRepository.remove(id);
    if (!removed) {
        throw new AppError("Tarefa não encontrada", 404);
    }
}