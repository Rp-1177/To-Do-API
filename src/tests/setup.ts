import { afterAll, beforeEach } from "vitest";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { error } from "node:console";

// Trava de segurança: os testes APAGAM dados. Nunca podem rodar no banco de desenvolvimento

if (!env.DATABASE_URL.includes("test")) {
    throw new Error(
       `Recusando rodar testes no banco "${env.DATABASE_URL}". Use um banco de teste.` 
    );
}

beforeEach(async () => {
    await prisma.task.deleteMany(); // tarefas primeiro, pois dependem do usuário
    await prisma.user.deleteMany();
});

afterAll(async () => {
    await prisma.$disconnect();
});

// Os testes apagam dados a cada execução. Se um erro de configuração os apontasse para o banco de desenvolvimento, você perderia tudo sem aviso. A trava faz o pior caso ser uma mensagem de erro
// A ordem importa: a tarefa tem uma chave estrangeira (userId) apontando para o usuário. Apagar o usuário primeiro, em bancos que fazem valer essa regra, falharia por deixar tarefas órfãs. Por isso, filhos primeiro, pais depois. E fazemos explicitamente (sem depender do onDelete: Cascade) para funcionar em qualquer cenário.

// O afterAll com $disconnect: fecha a conexão com o banco ao final. Sem isso, o processo pode ficar “pendurado” esperando a conexão fechar.