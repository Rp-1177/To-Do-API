import { title } from "node:process";
import { object, z } from "zod";

// /tasks/:id  → "5" (texto) vira 5 (número)
export const idParamSchema = z.object({
    id: z.coerce

// z.coerce.number(): lembra que params e query chegam sempre como texto? O coerce converte "5" em 5 antes de validar. Com "abc" a conversão resulta em NaN e o Zod rejeita

        .number({ error: "O id deve ser um número" })
        .int("O id deve ser um número inteiro")
        .positive("O id deve ser positivo"),
});

// POST /tasks
export const createTaskSchema = z.object({
    title: z
        .string({ error: "O título é obrigatório e deve ser texto" })
        .trim()

// .trim() antes de .min(1): a ordem importa. " " vira "" primeiro e só então falha no min(1). Se invertesse, espaços em branco passariam.

        .min(1, "O título não pode ser vazio")
        .max(100, "O título pode ter no máximo 100 caracteres"),
});

// PATCH /tasks/:id
export const updateTaskSchema = z
    .object({
        title: z
            .string({ error: "O título deve ser texto" })
            .trim()
            .min(1, "O título não pode ser vazio")
            .max(100, "O título pode ter no máximo 100 caracteres")
            .optional(),

// .optional(): o campo pode estar ausente. No PATCH tudo é opcional, porque só mandamos o que queremos alterar.

        done: z.boolean({ error: "'done' deve ser true ou false" }).optional(),
    })
    .refine(
        (data) => Object.keys(data).length > 0,
        "Envie ao menos um campo para atualizar"
    );

// .refine(...): regra que olha o objeto inteiro. Aqui impede um PATCH vazio ({}), que “funcionaria” sem alterar nada.


    // GET /tasks?done=true

    export const listTasksQuerySchema = z.object({
        done: z
            .enum(["true", "false"], { error: "'done' deve ser 'true' ou 'false'" })
            .transform((value) => value === "true")

// .transform(...): depois de validar "true"/"false", converte para boolean de verdade.

            .optional(),
});

// Os tipos TypeScript nascem dos schemas: uma fonte de verdade só
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

// z.infer: o tipo CreateTaskInput é gerado a partir do schema. Se você mudar o schema, o tipo muda junto, sem duas definições para manter em sincronia.
// por padrão, o Zod descarta campos que não estão no schema. Se o cliente mandar { "title": "ok", "id": 999 }, o id some. Se preferir rejeitar em vez de descartar, use .strict() no objeto.