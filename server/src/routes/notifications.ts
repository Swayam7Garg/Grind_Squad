import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
    listNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
} from "../controllers/notifications.controller";

const router = Router();

router.use(requireAuth);

/** GET   /api/notifications              — list notifications */
router.get("/", listNotifications);

/** PATCH /api/notifications/read         — mark specific as read */
router.patch("/read", markAsRead);

/** PATCH /api/notifications/read-all     — mark ALL as read */
router.patch("/read-all", markAllAsRead);

/** DELETE /api/notifications/:notificationId — delete notification */
router.delete("/:notificationId", deleteNotification);

export default router;
