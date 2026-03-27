import { Router } from "express";
import { syncUser } from "../controllers/auth.controller";

const router = Router();

/**
 * POST /api/auth/sync
 * No auth middleware — this is called right after Clerk login
 * before the user exists in our DB.
 */
router.post("/sync", syncUser);

export default router;
