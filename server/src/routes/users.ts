import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getMe, getMySquads, getUserById, updateMe, getActivities, searchUsers } from "../controllers/users.controller";

const router = Router();

router.use(requireAuth);

/** GET  /api/users/me       — authenticated user's profile */
router.get("/me", getMe);

/** GET  /api/users/search   — search for users */
router.get("/search", searchUsers);

/** GET  /api/users/me/activities — user's chronological feed */
router.get("/me/activities", getActivities);

/** GET  /api/users/me/squads — authenticated user's squads */
router.get("/me/squads", getMySquads);

/** PATCH /api/users/me      — update own profile */
router.patch("/me", updateMe);

/** GET  /api/users/:userId  — public user profile */
router.get("/:userId", getUserById);

export default router;
