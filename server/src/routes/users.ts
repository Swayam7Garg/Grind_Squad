import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getMe, getUserById, updateMe } from "../controllers/users.controller";

const router = Router();

router.use(requireAuth);

/** GET  /api/users/me       — authenticated user's profile */
router.get("/me", getMe);

/** PATCH /api/users/me      — update own profile */
router.patch("/me", updateMe);

/** GET  /api/users/:userId  — public user profile */
router.get("/:userId", getUserById);

export default router;
