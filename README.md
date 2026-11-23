# Todo API

API REST de tarefas com cadastro e login de usuários. Cada usuário enxerga e edita apenas as próprias tarefas.

Projeto de estudo focado em boas práticas de back end: arquitetura em camadas, validação, autenticação, testes automatizados, documentação e banco em container.

## Tecnologias

| Área | Tecnologia |
|---|---|
| Runtime e linguagem | Node.js, TypeScript (ES Modules) |
| Framework HTTP | Express 5 |
| Banco de dados | PostgreSQL 18 (Docker Compose) |
| ORM e migrations | Prisma 7 (adapter `@prisma/adapter-pg`) |
| Validação | Zod 4 |
| Senhas | bcryptjs (hash com salt e custo configurável) |
| Autenticação | JWT (jsonwebtoken, HS256) |
| Segurança HTTP | Helmet, CORS com lista de origens, express-rate-limit |
| Logs | pino e pino-http (JSON, com campos sensíveis censurados) |
| Documentação | OpenAPI 3.0 e Swagger UI |
| Testes | Vitest e Supertest |

## Funcionalidades

- CRUD de tarefas (criar, listar, buscar, atualizar parcialmente e remover), com filtro por status (`?done=true`)
- Cadastro, login e perfil do usuário logado
- Senhas guardadas apenas como hash (bcrypt)
- Autenticação por token JWT (`Authorization: Bearer <token>`)
- Isolamento entre usuários: tarefas de outros respondem 404
- Título de tarefa único por usuário, sem diferenciar maiúsculas de minúsculas
- Validação de entrada com mensagens de erro por campo
- Erros padronizados (400, 401, 404, 409, 413, 429, 500), sem vazar detalhes internos
- Limite de requisições (geral e mais rígido em login e cadastro)
- Logs estruturados com ID por requisição (`X-Request-Id`)
- Health checks (`/health` e `/health/ready`) e encerramento gracioso do servidor
- Documentação interativa em `/docs`

## Como rodar

**Pré-requisitos:** Node.js (LTS) e Docker Desktop (aberto, com o motor rodando).

```bash
git clone https://github.com/Rp-1177/To-Do-API.git
cd To-Do-API
npm install
```

Crie o arquivo `.env` a partir do modelo (no PowerShell: `Copy-Item .env.example .env`):

```bash
cp .env.example .env
```

Gere um segredo para o JWT e cole em `JWT_SECRET` no `.env`:

```bash
node -p "require('crypto').randomBytes(48).toString('hex')"
```

Suba o banco, aplique as migrations e inicie a API:

```bash
npm run db:up
npx prisma migrate dev
npx prisma generate
npm run dev
```

A API fica em `http://localhost:3000`.

Se a porta `5432` estiver ocupada ou reservada pelo Windows, mude a porta publicada no `docker-compose.yml` e use a mesma porta na `DATABASE_URL` do `.env` e em `src/tests/constants.ts`.

### Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Inicia a API em modo de desenvolvimento (reinicia ao salvar) |
| `npm test` | Roda a suíte de testes (o banco precisa estar no ar) |
| `npm run test:watch` | Testes em modo de observação |
| `npm run db:up` | Sobe o PostgreSQL e espera ficar saudável |
| `npm run db:down` | Para e remove o container (os dados ficam no volume) |
| `npm run db:logs` | Acompanha os logs do banco |
| `npm run db:psql` | Abre o `psql` no banco de desenvolvimento |

Para apagar também os dados do banco: `docker compose down -v`.

## Documentação da API

Com a API rodando:

- **Swagger UI:** http://localhost:3000/docs
- **Documento OpenAPI (JSON):** http://localhost:3000/openapi.json

Para testar rotas protegidas: faça login em `POST /auth/login`, copie o `token`, clique em **Authorize** e cole-o (sem a palavra `Bearer`).

A documentação pode ser desligada com `DOCS_ENABLED=false`. Há também o arquivo `requests.http` com exemplos de requisições (extensão REST Client do VS Code).

## Endpoints

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/health` | O processo está vivo | Não |
| GET | `/health/ready` | Pronta para receber tráfego (testa o banco) | Não |
| POST | `/auth/register` | Cadastra um usuário | Não |
| POST | `/auth/login` | Autentica e devolve o token | Não |
| GET | `/auth/me` | Dados do usuário logado | Sim |
| GET | `/tasks` | Lista as tarefas (filtro `?done=true\|false`) | Sim |
| POST | `/tasks` | Cria uma tarefa | Sim |
| GET | `/tasks/:id` | Busca uma tarefa | Sim |
| PATCH | `/tasks/:id` | Atualiza parcialmente | Sim |
| DELETE | `/tasks/:id` | Remove uma tarefa | Sim |

## Variáveis de ambiente

O modelo está em `.env.example`. As variáveis são validadas ao iniciar: com configuração inválida, o servidor não sobe.

| Variável | Descrição | Padrão |
|---|---|---|
| `NODE_ENV` | `development`, `test` ou `production` | `development` |
| `PORT` | Porta da API | `3000` |
| `DATABASE_URL` | URL do PostgreSQL (`postgresql://usuario:senha@localhost:porta/banco`) | obrigatória |
| `JWT_SECRET` | Segredo do JWT (mínimo de 32 caracteres) | obrigatória |
| `JWT_EXPIRES_IN_SECONDS` | Validade do token | `3600` |
| `BCRYPT_COST` | Custo do bcrypt (4 a 15) | `12` |
| `LOG_LEVEL` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent` | `info` |
| `CORS_ORIGINS` | Origens permitidas no navegador, separadas por vírgula | vazio (nenhuma) |
| `TRUST_PROXY_HOPS` | Quantos proxies confiáveis existem na frente da API | `0` |
| `RATE_LIMIT_MAX` | Requisições por IP a cada 15 minutos | `100` |
| `AUTH_RATE_LIMIT_MAX` | Tentativas por IP a cada 15 minutos em login e cadastro | `10` |
| `DOCS_ENABLED` | Liga a documentação (`true` ou `false`) | `true` |

## Testes

```bash
npm run db:up
npm test
```

Os testes rodam contra um banco separado (`todo_test`), criado pelo script em `docker/postgres-init`. Se o volume do banco já existia antes desse script, recrie com `docker compose down -v` e `npm run db:up`.

A suíte cobre: hash de senha e JWT (unitários), cadastro, login, rotas protegidas, isolamento entre usuários, cabeçalhos de segurança, CORS, limite de requisições, validação do documento OpenAPI e comportamento do CRUD.

## Arquitetura

```
Routes → Controllers → Services → Repositories → PostgreSQL (Prisma)
```

| Camada | Responsabilidade |
|---|---|
| Routes | Ligam URL e verbo HTTP a um controller |
| Controllers | Traduzem HTTP: validam a entrada com Zod e respondem |
| Services | Regras de negócio |
| Repositories | Acesso a dados |
| Middlewares | Autenticação, limite de requisições, logs e tratamento de erros |

```
src/
├── app.ts            # monta a aplicação (createApp)
├── server.ts         # liga o servidor e trata o encerramento
├── config/           # variáveis de ambiente validadas
├── controllers/
├── services/
├── repositories/
├── routes/
├── middlewares/
├── schemas/          # schemas do Zod
├── docs/             # documento OpenAPI
├── lib/              # prisma, jwt, bcrypt e logger
├── errors/
├── types/
└── tests/
```

## Segurança

- Hash de senha com salt e custo configurável
- JWT com expiração e algoritmo fixo na verificação
- Mensagem genérica no login (não revela quais e-mails existem)
- Resposta pública do usuário com lista de campos permitidos (nunca expõe o hash)
- Cabeçalhos de segurança (Helmet) e CORS com lista de origens
- Limite de requisições por IP e limite de tamanho do corpo (10 KB)
- Segredos em variáveis de ambiente (`.env` fora do git)

## Próximos passos

- Dockerfile de produção e build da API
- Integração contínua (GitHub Actions)
- Deploy
