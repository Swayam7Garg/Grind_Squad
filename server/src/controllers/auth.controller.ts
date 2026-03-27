import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

interface SyncBody {
    clerkId: string;
    email: string;
    username: string;
    avatarUrl?: string;
}

/**
 * POST /api/auth/sync
 * Called immediately after Clerk login/registration on the frontend.
 * Upserts the user record so our DB stays in sync with Clerk.
 */
export async function syncUser(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { clerkId, email, username, avatarUrl } = req.body as SyncBody;

        if (!clerkId || !email || !username) {
            throw new AppError(
                "clerkId, email, and username are required",
                400,
                "VALIDATION_ERROR"
            );
        }

        const user = await prisma.user.upsert({
            where: { clerkId },
            create: {
                clerkId,
                email,
                username,
                avatarUrl: avatarUrl ?? null,
            },
            update: {
                email,
                username,
                avatarUrl: avatarUrl ?? null,
            },
        });

        res.status(200).json({
            data: user,
            message: "User synced successfully",
        });
    } catch (err) {
        next(err);
    }
}
