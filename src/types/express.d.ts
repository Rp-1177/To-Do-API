declare global {
    namespace Express {
        interface Request {
            userId?: number | undefined;
        }
    }
}

export {};

// Isso estende o tipo Request do Express com um campo novo (a técnica se chama declaration merging). O ? é honesto: antes do middleware rodar, o campo não existe. O export {} faz o arquivo ser tratado como módulo, requisito para o declare global.