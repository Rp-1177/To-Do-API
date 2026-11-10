import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
        globalSetup: ["./src/tests/global-setup.ts"],
        setupFiles: ["./src/tests/setup.ts"],
        fileParallelism: false,
        env: {
            NODE_ENV: "test",
            DATABASE_URL: "file:./test.db",
            JWT_SECRET: "segredo-somente-para-testes-com-mais-de-32-caracteres",
            JWT_EXPIRES_IN_SECONDS: "3600",
            BCRYPT_COST: "4",
            LOG_LEVEL: "silent",
            CORS_ORIGINS: "http://localhost:5173",
            RATE_LIMIT_MAX: "100000",
            AUTH_RATE_LIMIT_MAX: "100000",
        }
    }
});

// env: variáveis só para os testes. Como o dotenv não sobrescreve variáveis já definidas, o DATABASE_URL do .env (dev.db) é ignorado durante os testes.
// fileParallelism: false: por padrão o Vitest roda arquivos de teste em paralelo, mas todos usariam o mesmo arquivo SQLite, e um limparia os dados do outro. Rodando um arquivo por vez, evitamos isso.

// Linha	O que faz
// environment: "node"	Os testes rodam no Node (não num navegador de mentira)
// include	Só arquivos *.test.ts dentro de src viram testes
// globalSetup / setupFiles	Os caminhos dos arquivos de preparação
// fileParallelism: false	Um arquivo de teste por vez
// env	Variáveis só para os testes

// O env tem um efeito importante. O env.ts do app faz import "dotenv/config", que lê o .env (com DATABASE_URL="file:./dev.db"). Mas o dotenv não sobrescreve variáveis que já existem. Como o Vitest define DATABASE_URL antes, o valor de teste vence, e os testes nunca tocam no seu dev.db.