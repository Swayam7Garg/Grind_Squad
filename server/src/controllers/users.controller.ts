import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

/**
 * GET /api/users/me
 * Return the authenticated user's profile.
 */
export async function getMe(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                badges: { include: { badge: true } },
                squadMemberships: {
                    include: { squad: { select: { id: true, name: true, avatarUrl: true } } },
                },
                _count: { select: { solves: true, notifications: true } },
            },
        });

        if (!user) {
            throw new AppError("User not found", 404, "NOT_FOUND");
        }

        res.status(200).json({ data: user });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/users/:userId
 * Return a public user profile.
 */
export async function getUserById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
                bio: true,
                streak: true,
                maxStreak: true,
                totalPoints: true,
                createdAt: true,
                badges: { include: { badge: true } },
                _count: { select: { solves: true } },
            },
        });

        if (!user) {
            throw new AppError("User not found", 404, "NOT_FOUND");
        }

        res.status(200).json({ data: user });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/users/me
 * Update the authenticated user's profile.
 */
export async function updateMe(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { username, bio, avatarUrl } = req.body as {
            username?: string;
            bio?: string;
            avatarUrl?: string;
        };

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(username !== undefined ? { username } : {}),
                ...(bio !== undefined ? { bio } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            },
        });

        res.status(200).json({ data: user, message: "Profile updated" });
    } catch (err) {
        next(err);
    }
}
