import { prisma } from "../lib/prisma";
import type { Task } from "../types/task";

export const taskRepository = {
  findAll(filters: { done?: boolean | undefined } = {}): Promise<Task[]> {
    return prisma.task.findMany({
      where: filters.done === undefined ? {} : { done: filters.done },
      orderBy: { id: "asc" },
    });
  },

  findById(id: number): Promise<Task | null> {

// null no lugar de undefined. O Prisma usa null para “não achei”, então o tipo vira Task | null. O service continua testando if (!task), que funciona nos dois casos.

    return prisma.task.findUnique({ where: { id } });
  },

// findUnique vs findFirst: findUnique busca por coluna única (como o id); findFirst serve para filtros comuns (como o title).


  findByTitle(title: string): Promise<Task | null> {
    return prisma.task.findFirst({ where: { title } });
  },

  create(title: string): Promise<Task> {
    return prisma.task.create({ data: { title } });
  },

  async update(
    id: number,
    data: { title?: string | undefined; done?: boolean | undefined }
  ): Promise<Task | null> {
    const changes: { title?: string; done?: boolean } = {};
    if (data.title !== undefined) changes.title = data.title;
    if (data.done !== undefined) changes.done = data.done;

    const { count } = await prisma.task.updateMany({

// updateMany/deleteMany com count: o update e o delete “normais” do Prisma lançam erro se a linha não existir. Com as versões Many recebemos um count (quantas linhas foram afetadas)

      where: { id },
      data: changes,

// O objeto changes monta os campos que realmente chegaram, sem nenhum undefined dentro. Isso também evita o problema do exactOptionalPropertyTypes

    });
    if (count === 0) return null;

    return prisma.task.findUnique({ where: { id } });
  },

  async remove(id: number): Promise<boolean> {
    const { count } = await prisma.task.deleteMany({ where: { id } });
    return count > 0;
  },
};