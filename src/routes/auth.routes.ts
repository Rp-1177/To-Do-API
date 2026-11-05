import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authenticate, authController.me);

// Em /me, o authenticate vem antes do controller: o Express executa os handlers da esquerda para a direita, como uma fila.

export default router;