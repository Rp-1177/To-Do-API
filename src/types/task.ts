export interface Task {
    id: number;
    title: string;
    done: boolean;
    createdAt: Date;
}

// É a definição do que é uma tarefa. Antes ela morava dentro do server.ts. Agora está num arquivo próprio, porque várias camadas precisam conhecê-la. Se ficasse dentro do repository, o service teria que importar do repository só para ter o tipo, o que cria dependências confusas.

// O export é o que permite outros arquivos usarem. Sem ele, o tipo fica “trancado” no arquivo.

// Decisão: tipos compartilhados vão numa pasta neutra.