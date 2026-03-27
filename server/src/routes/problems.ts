import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
    listProblems,
    createProblem,
    getProblemById,
    shareProblem,
    markSolved,
} from "../controllers/problems.controller";

const router = Router();

router.use(requireAuth);

/** GET  /api/problems          — list problems (with filters) */
router.get("/", listProblems);

/** POST /api/problems          — create / upsert a problem */
router.post("/", createProblem);

/** POST /api/problems/share    — share problem to a squad */
router.post("/share", shareProblem);

/** POST /api/problems/solve    — mark problem as solved */
router.post("/solve", markSolved);

/** GET  /api/problems/:problemId — get single problem details */
router.get("/:problemId", getProblemById);

export default router;
