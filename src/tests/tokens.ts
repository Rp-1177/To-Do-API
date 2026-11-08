export function tamperToken(Token: string, newUserId: number): string {
    const [header, payload, signature] = Token.split(".") as [
        string,
        string,
        string,
    ];

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    data.sub = String(newUserId);

    const forgedPayload = Buffer.from(JSON.stringify(data)).toString("base64url");
    return `${header}.${forgedPayload}.${signature}`;
}

// token.split(".") separa as 3 partes.
// Buffer.from(payload, "base64url").toString("utf8") decodifica o payload (lembra que ele é legível por todos?).
// JSON.parse(...) vira objeto, e trocamos o sub pelo id de outra pessoa.
// Recodificamos em base64url e remontamos o token mantendo a assinatura original.