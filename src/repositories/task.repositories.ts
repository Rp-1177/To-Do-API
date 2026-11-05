import { prisma } from "../lib/prisma";
import type { Task } from "../types/task";

export const taskRepository = {
  findAll(userId: number, filters: { done?: boolean | undefined } = {}): Promise<Task[]> {
    return prisma.task.findMany({
      where: filters.done === undefined ? {userId} : { userId,done: filters.done },
      orderBy: { id: "asc" },
    });
  },

  findById(userId: number, id: number): Promise<Task | null> {

// null no lugar de undefined. O Prisma usa null para “não achei”, então o tipo vira Task | null. O service continua testando if (!task), que funciona nos dois casos.

    return prisma.task.findFirst({ where: { id, userId } });
  },

// Repare no padrão where: { id, userId }. A verificação de dono está dentro da própria consulta. Se a tarefa 5 é de outro usuário, a busca { id: 5, userId: meu } simplesmente não acha nada, e o resultado é o mesmo de “não existe”: 404. Isso é intencional. Responder 403 (“existe, mas não é sua”) confirmaria a um estranho que aquele id existe. A família de erros de autorização que se faz por “esquecer de checar o dono” (conhecida como IDOR) está entre as falhas mais comuns em APIs.
// findUnique vs findFirst: findUnique busca por coluna única (como o id); findFirst serve para filtros comuns (como o title).


  findByTitle(userId: number, title: string): Promise<Task | null> {
    return prisma.task.findFirst({ where: { title, userId } });
  },

  create(userId: number, title: string): Promise<Task> {
    return prisma.task.create({ data: { userId, title } });
  },

  async update(
    userId: number,
    id: number,
    data: { title?: string | undefined; done?: boolean | undefined }
  ): Promise<Task | null> {
    const changes: { title?: string; done?: boolean } = {};
    if (data.title !== undefined) changes.title = data.title;
    if (data.done !== undefined) changes.done = data.done;

    const { count } = await prisma.task.updateMany({

// updateMany/deleteMany com count: o update e o delete “normais” do Prisma lançam erro se a linha não existir. Com as versões Many recebemos um count (quantas linhas foram afetadas)

      where: { id, userId },
      data: changes,

// O objeto changes monta os campos que realmente chegaram, sem nenhum undefined dentro. Isso também evita o problema do exactOptionalPropertyTypes

    });
    if (count === 0) return null;

    return prisma.task.findFirst({ where: { id, userId } });
  },

  async remove(userId: number, id: number): Promise<boolean> {
    const { count } = await prisma.task.deleteMany({ where: { id, userId } });
    return count > 0;
  },
};