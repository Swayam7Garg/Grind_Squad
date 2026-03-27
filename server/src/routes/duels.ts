import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
    createDuel,
    getDuel,
    acceptDuel,
    completeDuel,
    cancelDuel,
} from "../controllers/duels.controller";

const router = Router();

router.use(requireAuth);

/** POST  /api/duels                   — create a duel challenge */
router.post("/", createDuel);

/** GET   /api/duels/:duelId           — get duel details */
router.get("/:duelId", getDuel);

/** PATCH /api/duels/:duelId/accept    — opponent accepts */
router.patch("/:duelId/accept", acceptDuel);

/** PATCH /api/duels/:duelId/complete  — mark duel completed (first solver wins) */
router.patch("/:duelId/complete", completeDuel);

/** PATCH /api/duels/:duelId/cancel    — challenger cancels a pending duel */
router.patch("/:duelId/cancel", cancelDuel);

export default router;
