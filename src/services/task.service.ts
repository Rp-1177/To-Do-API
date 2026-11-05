import { AppError } from "../errors/appError";
import { taskRepository } from "../repositories/task.repositories";
import type {
    CreateTaskInput,
    ListTasksQuery,
    UpdateTaskInput,
} from "../schemas/task.schema";
import type { Task } from "../types/task";

async function ensureTitleIsAvailable(
    userId: number,
    title: string,
    ignoreId?: number
): Promise<void> {
    const existing = await taskRepository.findByTitle(userId, title);
    if (existing && existing.id !== ignoreId) {
        throw new AppError("Já existe uma tarefa com esse título", 409);
    }
}

export async function listTasks(userId: number, filters: ListTasksQuery): Promise<Task[]> {
    return taskRepository.findAll(userId, filters);
}

export async function getTaskById(userId: number, id: number): Promise<Task> {
    const task = await taskRepository.findById(userId, id);
    if (!task) {
        throw new AppError("Tarefa não encontrada", 404);
    }
    return task;
}

export async function createTask(userId: number, input: CreateTaskInput): Promise<Task> {
    await ensureTitleIsAvailable(userId, input.title);
    return taskRepository.create(userId, input.title);
}

export async function updateTask(
    userId: number,
    id: number,
    input: UpdateTaskInput
): Promise<Task> {
    await getTaskById(userId, id); // 404 se não existir ou não for sua

    if (input.title !== undefined) {
        await ensureTitleIsAvailable(userId, input.title, id);
    }

    const updated = await taskRepository.update(userId, id, input);
    if (!updated) {
        throw new AppError("Tarefa não encontrada", 404);
    }
    return updated;
}

export async function deleteTask(userId: number, id: number): Promise<void> {
    const removed = await taskRepository.remove(userId, id);
    if (!removed) {
        throw new AppError("Tarefa não encontrada", 404);
    }
}