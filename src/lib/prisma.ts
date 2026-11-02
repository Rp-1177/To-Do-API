import "dotenv/config";

// import "dotenv/config" lê o .env e coloca as variáveis em process.env.

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

const url = process.env.DATABASE_URL;
if(!url) {
    throw new Error("DATABASE_URL não definida no .env");
}

// A checagem do url faz o programa falhar na hora, com mensagem clara, se a configuração estiver faltando. É melhor do que um erro estranho minutos depois.

const adapter = new PrismaBetterSqlite3({ url });

export const prisma = new PrismaClient({ adapter });

// Um único prisma exportado é reaproveitado por todo o projeto, porque cada PrismaClient abre conexões. Nunca crie um por requisição.