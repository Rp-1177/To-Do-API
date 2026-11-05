export interface User {
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
}

// O que pode sair da API: tudo, menos o hash

export type PublicUser = Omit<User, "passwordHash">;