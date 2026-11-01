import { Task } from "../types/task";

const tasks: Task[] = [];
let nextId = 1;

// O array e o contador ficam aqui dentro, escondidos. Ninguém de fora mexe neles diretamente, só pelas funções que o repository oferece. É como o estoque: o garçom não entra lá, pede ao estoquista.

// Decisão 1: o repository não valida nada. Se você pedir create(""), ele cria uma tarefa vazia sem reclamar. Isso parece errado, mas é de propósito: validar é trabalho do chef (service). O estoquista guarda o que lhe entregam. Misturar as duas coisas é o jeito mais rápido de a bagunça voltar.

export const taskRepository = {
    findAll(filters: { done?: boolean | undefined } = {}): Task[] {
        if (filters.done === undefined) return tasks;
        return tasks.filter((t) => t.done === filters.done);
    },

    findByTitle(title: string): Task | undefined {
        return tasks.find((t) => t.title.toLowerCase() === title.toLowerCase());
    },

    findById(id: number): Task | undefined {  // "talvez tenha, talvez não"
        
// Decisão 2: quando não acha, devolve undefined ou false em vez de dar erro.
        
        return tasks.find((t) => t.id ===id);
    },

    create(title: string): Task {
        const task: Task = {
            id: nextId++,
            title,
            done: false,
            createdAt: new Date().toISOString(),
        };
        tasks.push(task);
        return task;
    },

    update(id: number, data: { title?: string | undefined; done?: boolean | undefined }): Task | undefined {
        const task = tasks.find((t) => t.id === id);
        if (!task) return undefined;
        Object.assign(task,data);

// Decisão 3: por que Object.assign(task, data) no update? Ele copia os campos de data para dentro de task. Se data for { done: true }, só o done muda e o resto permanece. É o PATCH em ação: alterar só o que foi enviado.

        return task;
    },

    remove(id: number): boolean { // true = apagou, false = não existia
        const index = tasks.findIndex((t) => t.id === id);
        if (index === -1) return false;
        tasks.splice(index, 1);
        return true;
    },
};

// ele não valida nada e não responde HTTP. Só guarda e busca. Quando não acha, devolve undefined ou false e deixa a decisão para quem chamou.

// “Não achei” não é um erro para o estoquista, é uma informação. Quem decide se isso é um problema (404) é o service. O tipo Task | undefined obriga o TypeScript a te lembrar de tratar o caso de não achar.