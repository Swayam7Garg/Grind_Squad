import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
    createDiscussion,
    listDiscussions,
    addReaction,
    deleteDiscussion,
} from "../controllers/discussions.controller";

const router = Router();

router.use(requireAuth);

/** GET  /api/discussions?problemId=&squadId=   — list discussions */
router.get("/", listDiscussions);

/** POST /api/discussions                       — create discussion / reply */
router.post("/", createDiscussion);

/** POST /api/discussions/:discussionId/reactions — add/toggle reaction */
router.post("/:discussionId/reactions", addReaction);

/** DELETE /api/discussions/:discussionId       — delete own discussion */
router.delete("/:discussionId", deleteDiscussion);

export default router;
