import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

// ─── List user notifications ──────────────────────────────
/**
 * GET /api/notifications?page=&limit=&unreadOnly=
 */
export async function listNotifications(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const unreadOnly = req.query.unreadOnly === "true";
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const where = {
            userId,
            ...(unreadOnly ? { isRead: false } : {}),
        };

        const [notifications, total, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.notification.count({ where }),
            prisma.notification.count({ where: { userId, isRead: false } }),
        ]);

        res.status(200).json({
            data: notifications,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                unreadCount,
            },
        });
    } catch (err) {
        next(err);
    }
}

// ─── Mark notifications as read ───────────────────────────
/**
 * PATCH /api/notifications/read
 * Body: { notificationIds: string[] }
 */
export async function markAsRead(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { notificationIds } = req.body as { notificationIds: string[] };

        if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
            throw new AppError("notificationIds array is required", 400, "VALIDATION_ERROR");
        }

        await prisma.notification.updateMany({
            where: {
                id: { in: notificationIds },
                userId, // ensure ownership
            },
            data: { isRead: true },
        });

        res.status(200).json({ message: "Notifications marked as read" });
    } catch (err) {
        next(err);
    }
}

// ─── Mark all notifications as read ───────────────────────
/**
 * PATCH /api/notifications/read-all
 */
export async function markAllAsRead(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (err) {
        next(err);
    }
}

// ─── Delete a notification ────────────────────────────────
/**
 * DELETE /api/notifications/:notificationId
 */
export async function deleteNotification(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { notificationId } = req.params;

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification) {
            throw new AppError("Notification not found", 404, "NOT_FOUND");
        }

        if (notification.userId !== userId) {
            throw new AppError("Cannot delete another user's notification", 403, "FORBIDDEN");
        }

        await prisma.notification.delete({ where: { id: notificationId } });

        res.status(204).send();
    } catch (err) {
        next(err);
    }
}
