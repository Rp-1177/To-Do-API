import { AppError } from "../errors/appError";
import { signToken } from "../lib/jwt";
import { hashPassword, verifyPassword } from "../lib/password";
import { userRepository } from "../repositories/user.repository";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";
import type { PublicUser, User } from "../types/user";

interface AuthResult {
  user: PublicUser;
  token: string;
}

// Lista de campos PERMITIDOS: se a tabela ganhar um campo sensível um dia, ele não vaza
function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) throw new AppError("E-mail já cadastrado", 409);

// No register, o 409 revela que o e-mail existe. É um trade-off comum: usabilidade (o usuário precisa saber) contra privacidade. Sistemas muito sensíveis enviam um e-mail em vez de responder isso na tela.


  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return { user: toPublicUser(user), token: signToken(user.id) };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await userRepository.findByEmail(input.email);
  const passwordOk = user
    ? await verifyPassword(input.password, user.passwordHash)
    : false;

  // Mesma mensagem para "e-mail não existe" e "senha errada"
  if (!user || !passwordOk) {
    throw new AppError("E-mail ou senha incorretos", 401);
  }

  return { user: toPublicUser(user), token: signToken(user.id) };
}

export async function getProfile(userId: number): Promise<PublicUser> {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError("Usuário não encontrado", 401);
  return toPublicUser(user);
}

// Mensagem genérica no login. Se você dissesse “e-mail não encontrado” ou “senha errada” separadamente, um atacante descobriria quais e-mails existem no sistema (enumeração de usuários).