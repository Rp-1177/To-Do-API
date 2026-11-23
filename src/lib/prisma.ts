import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "../config/env";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });





// import "dotenv/config" lê o .env e coloca as variáveis em process.env.



// A checagem do url faz o programa falhar na hora, com mensagem clara, se a configuração estiver faltando. É melhor do que um erro estranho minutos depois.

// Um único prisma exportado é reaproveitado por todo o projeto, porque cada PrismaClient abre conexões. Nunca crie um por requisição.