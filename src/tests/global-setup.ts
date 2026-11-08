import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

export default function setup() {
    // Começa sempre de um banco de teste novo
    for (const suffix of ["", "-journal", "-wal", "-shm"]) {
        rmSync(`./test.db${suffix}`, { force: true });
    }

 // Cria as tabelas aplicando as migrations que já existem
    execSync("npx prisma migrate deploy", {
        stdio: "inherit",
        env: { ...process.env, DATABASE_URL: "file:./test.db" },
    });
}

// Comando	            Para que serve
// migrate dev	        Desenvolvimento: cria migrations novas, pode resetar o banco
// migrate deploy	    Testes, CI e produção: só aplica as existentes, sem perguntar nada, sem nunca apagar dados

// O laço dos sufixos: o SQLite pode criar arquivos auxiliares ao lado do banco (-journal, -wal, -shm). Apagamos todos para começar de um estado realmente limpo. O force: true evita erro se o arquivo não existir.
// execSync: executa um comando do terminal de dentro do código e espera ele terminar.
// stdio: "inherit": mostra a saída do comando no seu terminal (foi por isso que você viu as migrations sendo aplicadas).
// env: { ...process.env, DATABASE_URL: ... }: copia as variáveis existentes e sobrescreve só uma. Passamos o DATABASE_URL à mão porque o globalSetup roda no processo principal, que não recebe o env do config.
// migrate deploy e não migrate dev: o dev é para desenvolvimento (cria migrations novas, pode pedir para resetar). O deploy só aplica as migrations existentes, sem perguntar nada e sem nunca apagar dados. É o comando de testes, CI e produção.