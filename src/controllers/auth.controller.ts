import type { Request, Response } from 'express';
import { requireUserId } from '../middlewares/authenticate';
import { loginSchema, registerSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';

export async function register(req: Request, res: Response) {
    const input = registerSchema.parse(req.body);
    res.status(201).json(await authService.register(input));
}

export async function login(req: Request, res: Response) {
    const input = loginSchema.parse(req.body);
    res.json(await authService.login(input));
}

export async function me(req: Request, res: Response) {
    res.json(await authService.getProfile(requireUserId(req)));
}