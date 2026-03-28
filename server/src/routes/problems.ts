import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { squadGuard } from "../middleware/squadGuard";
import {
    listProblems,
    createProblem,
    getProblemById,
    shareProblem,
    getSquadProblems,
    markSolved,
} from "../controllers/problems.controller";

const router = Router();

router.use(requireAuth);

// ─── Global Problem Routes ────────────────────────────────
/** GET  /api/problems          — list problems (with filters) */
router.get("/problems", listProblems);

/** POST /api/problems          — create / upsert a problem */
router.post("/problems", createProblem);

/** GET  /api/problems/:problemId — get single problem details */
router.get("/problems/:problemId", getProblemById);

// ─── Squad-specific Problem Routes ────────────────────────
/** POST /api/squads/:squadId/problems — share problem to a squad */
router.post("/squads/:squadId/problems", squadGuard, shareProblem);

/** GET /api/squads/:squadId/problems — get squad's problem feed */
router.get("/squads/:squadId/problems", squadGuard, getSquadProblems);

/** POST /api/squads/:squadId/problems/:problemId/solve — mark problem as solved */
router.post("/squads/:squadId/problems/:problemId/solve", squadGuard, markSolved);

export default router;
