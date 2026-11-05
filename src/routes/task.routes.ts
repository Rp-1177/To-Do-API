// Só o “cardápio”: URL + verbo → quem atende.

import { Router } from "express";
import * as taskController from "../controllers/task.controller";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

router.use(authenticate); // tudo abaixo exige login

// O router.use(authenticate) protege todas as rotas abaixo dele de uma vez, em vez de repetir em cada uma

router.get("/", taskController.list);
router.get("/:id", taskController.getOne);
router.post("/", taskController.create);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.remove);

export default router;

// Só liga verbo + caminho → função. Não há lógica nenhuma. Se você quiser saber “que endpoints minha API tem?”, abre este arquivo e lê.

// Por que / e não /tasks? Porque no app.ts fazemos app.use("/tasks", taskRoutes), que significa “tudo que começa com /tasks vai para este router”. O router só enxerga o resto do caminho. É como entrar numa sala: dentro dela, você não repete o nome do prédio.

// Vantagem: se um dia quiser mudar para /api/v1/tasks, muda em um lugar só, no app.ts.