import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

// ─── Create a discussion post ─────────────────────────────
/**
 * POST /api/discussions
 * Create a new discussion (or threaded reply) on a problem within a squad.
 */
export async function createDiscussion(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { content, problemId, squadId, isSpoiler, parentId } = req.body as {
            content: string;
            problemId: string;
            squadId: string;
            isSpoiler?: boolean;
            parentId?: string;
        };

        if (!content || !problemId || !squadId) {
            throw new AppError(
                "content, problemId, and squadId are required",
                400,
                "VALIDATION_ERROR"
            );
        }

        // Verify membership
        const member = await prisma.squadMember.findUnique({
            where: { userId_squadId: { userId, squadId } },
        });

        if (!member) {
            throw new AppError("You are not a member of this squad", 403, "NOT_A_MEMBER");
        }

        // Verify parent discussion exists if replying
        if (parentId) {
            const parent = await prisma.discussion.findUnique({ where: { id: parentId } });
            if (!parent) {
                throw new AppError("Parent discussion not found", 404, "PARENT_NOT_FOUND");
            }
        }

        const discussion = await prisma.discussion.create({
            data: {
                content,
                isSpoiler: isSpoiler ?? false,
                userId,
                problemId,
                squadId,
                parentId: parentId ?? null,
            },
            include: {
                user: { select: { id: true, username: true, avatarUrl: true } },
                _count: { select: { replies: true, reactions: true } },
            },
        });

        // Notify squad members about new discussion (except author)
        const squadMembers = await prisma.squadMember.findMany({
            where: { squadId, userId: { not: userId } },
            select: { userId: true },
        });

        if (squadMembers.length > 0 && !parentId) {
            await prisma.notification.createMany({
                data: squadMembers.map((m) => ({
                    userId: m.userId,
                    type: "PROBLEM_SHARED" as const,
                    payload: {
                        discussionId: discussion.id,
                        problemId,
                        authorUsername: discussion.user.username,
                    },
                })),
            });
        }

        res.status(201).json({
            data: discussion,
            message: "Discussion posted",
        });
    } catch (err) {
        next(err);
    }
}

// ─── List discussions for a problem in a squad ────────────
/**
 * GET /api/discussions?problemId=&squadId=&page=&limit=
 */
export async function listDiscussions(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const problemId = req.query.problemId as string | undefined;
        const squadId = req.query.squadId as string | undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        if (!problemId || !squadId) {
            throw new AppError(
                "problemId and squadId query params are required",
                400,
                "VALIDATION_ERROR"
            );
        }

        const where = {
            problemId,
            squadId,
            parentId: null, // top-level discussions only
        };

        const [discussions, total] = await Promise.all([
            prisma.discussion.findMany({
                where,
                include: {
                    user: { select: { id: true, username: true, avatarUrl: true } },
                    reactions: {
                        select: { emoji: true, userId: true },
                    },
                    replies: {
                        include: {
                            user: { select: { id: true, username: true, avatarUrl: true } },
                            reactions: { select: { emoji: true, userId: true } },
                        },
                        orderBy: { createdAt: "asc" },
                    },
                    _count: { select: { replies: true, reactions: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.discussion.count({ where }),
        ]);

        res.status(200).json({
            data: discussions,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        next(err);
    }
}

// ─── Add a reaction ───────────────────────────────────────
/**
 * POST /api/discussions/:discussionId/reactions
 */
export async function addReaction(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { discussionId } = req.params;
        const { emoji } = req.body as { emoji: string };

        if (!emoji) {
            throw new AppError("emoji is required", 400, "VALIDATION_ERROR");
        }

        const discussion = await prisma.discussion.findUnique({
            where: { id: discussionId },
        });

        if (!discussion) {
            throw new AppError("Discussion not found", 404, "NOT_FOUND");
        }

        // Upsert — toggle reaction
        const existing = await prisma.reaction.findUnique({
            where: {
                userId_discussionId_emoji: { userId, discussionId, emoji },
            },
        });

        if (existing) {
            await prisma.reaction.delete({ where: { id: existing.id } });
            res.status(200).json({ message: "Reaction removed" });
            return;
        }

        const reaction = await prisma.reaction.create({
            data: { userId, discussionId, emoji },
        });

        res.status(201).json({
            data: reaction,
            message: "Reaction added",
        });
    } catch (err) {
        next(err);
    }
}

// ─── Delete a discussion ──────────────────────────────────
/**
 * DELETE /api/discussions/:discussionId
 * Only the author can delete their discussion.
 */
export async function deleteDiscussion(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { discussionId } = req.params;

        const discussion = await prisma.discussion.findUnique({
            where: { id: discussionId },
        });

        if (!discussion) {
            throw new AppError("Discussion not found", 404, "NOT_FOUND");
        }

        if (discussion.userId !== userId) {
            throw new AppError("You can only delete your own discussions", 403, "FORBIDDEN");
        }

        await prisma.discussion.delete({ where: { id: discussionId } });

        res.status(204).send();
    } catch (err) {
        next(err);
    }
}
