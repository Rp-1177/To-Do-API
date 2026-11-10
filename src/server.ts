import app from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => {
  logger.info(`Servidor rodando em http://localhost:${env.PORT}`);
});

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return; // ignora sinais repetidos
  shuttingDown = true;
  logger.info({ signal }, "Sinal recebido, encerrando o servidor");

  // Rede de segurança: se algo travar, força a saída depois de 10 s
  setTimeout(() => {
    logger.error("Tempo esgotado ao encerrar, forçando a saída");
    process.exit(1);
  }, 10_000).unref();

//   O .unref() do temporizador diz ao Node “este relógio não deve, sozinho, manter o processo vivo”. Se tudo fechar antes dos 10 s, o relógio não atrapalha a saída.

  // Para de aceitar conexões novas e espera as em andamento terminarem
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Erro ao fechar o servidor");
      process.exit(1);
    }
    await prisma.$disconnect();
    logger.info("Servidor encerrado com sucesso");
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Os sinais

// Sinal	    Quem manda	                                        Pode ser tratado?
// SIGINT	    Você, com Ctrl+C	                                Sim
// SIGTERM	    Docker/hospedagem num deploy: “por favor, encerre”	Sim
// SIGKILL	    A plataforma, quando o prazo acaba	                Não: mata na hora


// O void shutdown(...) marca que ignoramos a Promise de propósito.

// Falhas que ninguém tratou: o estado do processo é incerto, o certo é registrar e sair
process.on("unhandledRejection", (reason) => {
  logger.fatal({ err: reason }, "Promessa rejeitada sem tratamento");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Exceção não tratada");
  process.exit(1);
});

// Por que exit(1) nas falhas inesperadas? Depois de um erro que ninguém tratou, não dá para saber em que estado o programa ficou. É mais seguro sair e deixar o orquestrador (Docker, a hospedagem) iniciar um processo limpo.
// Código de saída: 0 = terminou bem, diferente de 0 = falhou. É como a plataforma sabe se o deploy deu certo.


// unhandledRejection e uncaughtException

// São os “últimos recursos”: uma Promise rejeitada que ninguém tratou, ou uma exceção que ninguém capturou. Depois de uma dessas, não dá para saber em que estado o programa ficou (uma conexão pela metade? um dado inconsistente?). A prática correta é registrar com nível fatal e sair com código 1, deixando a plataforma iniciar um processo limpo. Tentar “seguir em frente” depois disso é pior.