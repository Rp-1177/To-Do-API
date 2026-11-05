import { z } from "zod";

const emailSchema = z
.string({ error: "O e-mail é obrigatório e deve ser texto" })
.trim()
.toLowerCase()

// .trim().toLowerCase() antes de validar o e-mail: Maria@Gmail.com e maria@gmail.com são a mesma pessoa. Normalizamos antes de comparar ou salvar.

.pipe(z.email("E-mail inválido"));

// .pipe(...): “o resultado da etapa anterior entra nesta”. Limpa primeiro, valida depois (a mesma lógica da esteira).

export const registerSchema = z.object({
    name: z
.string({ error: "O nome é obrigatório e deve ser texto" })
.trim()
.min(2, "O nome deve ter pelo menos 2 caracteres")
.max(50, "O nome deve ter no máximo 50 caracteres"),
    email: emailSchema,
    password: z
    .string({ error: "A senha é obrigatória e deve ser texto" })
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .max(72, "A senha deve ter no máximo 72 caracteres"),
});

// Senha sem .trim(): espaços podem fazer parte de uma senha. Nunca altere o que o usuário digitou.

export const loginSchema = z.object({
    email: emailSchema,
    password: z
    .string({ error: "A senha é obrigatória e deve ser texto" })
    .min(1, "A senha é obrigatória"),

// No login, só .min(1): as regras de criação (8 caracteres) não precisam ser reveladas nem reaplicadas, e senhas antigas continuam funcionando.

});


export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;