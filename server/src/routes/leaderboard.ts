import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
    getSquadLeaderboard,
    getGlobalLeaderboard,
} from "../controllers/leaderboard.controller";

const router = Router();

router.use(requireAuth);

/** GET /api/leaderboard/global           — global leaderboard */
router.get("/global", getGlobalLeaderboard);

/** GET /api/leaderboard/squad/:squadId   — squad leaderboard */
router.get("/squad/:squadId", getSquadLeaderboard);

export default router;
