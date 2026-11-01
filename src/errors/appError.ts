export class AppError extends Error {

// extends Error: é um tipo especial de erro, herda tudo de um erro normal (mensagem, rastreamento).

    statusCode: number;

    constructor(message: string, statusCode = 400) {
        super(message);

// statusCode = 400: se você não informar, assume 400. É o valor padrão.
// super(message): passa a mensagem para o Error original guardar.

        this.statusCode = statusCode;
    }
}

// O service precisa avisar “não achei” ou “dado inválido”, mas ele não pode usar res.status(404), porque não conhece HTTP. A solução é lançar um erro que carrega o status

// O problema que ele resolve: o service precisa dizer “não encontrei, isso é um 404”. Mas o service não conhece HTTP, então ele não pode escrever res.status(404). Ele não tem nem acesso ao res.

// A solução: um erro que carrega o número junto, como um bilhete com carimbo: “Tarefa não encontrada, carimbo: 404”. O service só entrega o bilhete. Quem sabe traduzir para HTTP é outra pessoa (o gerente).

// Decisão: criar uma classe própria para distinguir erros que nós previmos (título vazio, id inexistente) de bugs inesperados (undefined is not a function). O gerente trata cada um de um jeito, como você vai ver.