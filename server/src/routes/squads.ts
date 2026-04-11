import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { squadGuard } from "../middleware/squadGuard";
import {
    createSquad,
    getSquad,
    joinSquad,
    listPublicSquads,
    leaveSquad,
    deleteSquad,
    addMember,
    removeMember,
} from "../controllers/squads.controller";

const router = Router();

// All squad routes require authentication
router.use(requireAuth);

/** GET  /api/squads/public  — must come BEFORE /:squadId to avoid param conflict */
router.get("/public", listPublicSquads);

/** POST /api/squads         — create a squad */
router.post("/", createSquad);

/** POST /api/squads/join    — join via invite code */
router.post("/join", joinSquad);

/** GET  /api/squads/:squadId — get squad details (member only) */
router.get("/:squadId", squadGuard, getSquad);

/** DELETE /api/squads/:squadId/leave — leave squad (member only) */
router.delete("/:squadId/leave", squadGuard, leaveSquad);

/** DELETE /api/squads/:squadId — delete squad (owner only) */
router.delete("/:squadId", squadGuard, deleteSquad);

/** POST /api/squads/:squadId/members — add member (owner/admin only) */
router.post("/:squadId/members", squadGuard, addMember);

/** DELETE /api/squads/:squadId/members/:memberUserId — remove member (owner/admin only) */
router.delete("/:squadId/members/:memberUserId", squadGuard, removeMember);

export default router;
