import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { DuelStatus } from "@prisma/client";

// ─── Create a duel ────────────────────────────────────────
/**
 * POST /api/duels
 * Challenge a squad member to a duel on a given problem.
 */
export async function createDuel(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { opponentId, problemId, squadId, timeLimit } = req.body as {
            opponentId: string;
            problemId: string;
            squadId: string;
            timeLimit?: number;
        };

        if (!opponentId || !problemId || !squadId) {
            throw new AppError(
                "opponentId, problemId, and squadId are required",
                400,
                "VALIDATION_ERROR"
            );
        }

        if (opponentId === userId) {
            throw new AppError("Cannot duel yourself", 400, "SELF_DUEL");
        }

        // Verify both users are members of the squad
        const [challengerMember, opponentMember] = await Promise.all([
            prisma.squadMember.findUnique({
                where: { userId_squadId: { userId, squadId } },
            }),
            prisma.squadMember.findUnique({
                where: { userId_squadId: { userId: opponentId, squadId } },
            }),
        ]);

        if (!challengerMember) {
            throw new AppError("You are not a member of this squad", 403, "NOT_A_MEMBER");
        }

        if (!opponentMember) {
            throw new AppError("Opponent is not a member of this squad", 400, "OPPONENT_NOT_MEMBER");
        }

        // Check for existing active duel between these users on this problem
        const existingDuel = await prisma.duel.findFirst({
            where: {
                problemId,
                squadId,
                status: { in: [DuelStatus.PENDING, DuelStatus.ACTIVE] },
                OR: [
                    { challengerId: userId, opponentId },
                    { challengerId: opponentId, opponentId: userId },
                ],
            },
        });

        if (existingDuel) {
            throw new AppError(
                "An active duel already exists between you and this opponent on this problem",
                409,
                "DUEL_ALREADY_EXISTS"
            );
        }

        const duel = await prisma.duel.create({
            data: {
                challengerId: userId,
                opponentId,
                problemId,
                squadId,
                timeLimit: timeLimit ?? 60,
                status: DuelStatus.PENDING,
            },
            include: {
                challenger: { select: { id: true, username: true, avatarUrl: true } },
                opponent: { select: { id: true, username: true, avatarUrl: true } },
                problem: { select: { id: true, title: true, slug: true, difficulty: true } },
            },
        });

        // Create notification for opponent
        await prisma.notification.create({
            data: {
                userId: opponentId,
                type: "DUEL_INVITE",
                payload: {
                    duelId: duel.id,
                    challengerUsername: duel.challenger.username,
                    problemTitle: duel.problem.title,
                },
            },
        });

        res.status(201).json({
            data: duel,
            message: "Duel challenge sent",
        });
    } catch (err) {
        next(err);
    }
}

// ─── Get duel details ─────────────────────────────────────
/**
 * GET /api/duels/:duelId
 */
export async function getDuel(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { duelId } = req.params;
        const { userId } = req.user;

        const duel = await prisma.duel.findUnique({
            where: { id: duelId },
            include: {
                challenger: { select: { id: true, username: true, avatarUrl: true } },
                opponent: { select: { id: true, username: true, avatarUrl: true } },
                problem: true,
                winner: { select: { id: true, username: true, avatarUrl: true } },
            },
        });

        if (!duel) {
            throw new AppError("Duel not found", 404, "NOT_FOUND");
        }

        // Only participants can view duel details
        if (duel.challengerId !== userId && duel.opponentId !== userId) {
            throw new AppError("You are not a participant in this duel", 403, "NOT_PARTICIPANT");
        }

        res.status(200).json({ data: duel });
    } catch (err) {
        next(err);
    }
}

// ─── Accept a duel ────────────────────────────────────────
/**
 * PATCH /api/duels/:duelId/accept
 */
export async function acceptDuel(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { duelId } = req.params;
        const { userId } = req.user;

        const duel = await prisma.duel.findUnique({ where: { id: duelId } });

        if (!duel) {
            throw new AppError("Duel not found", 404, "NOT_FOUND");
        }

        if (duel.opponentId !== userId) {
            throw new AppError("Only the challenged opponent can accept", 403, "NOT_OPPONENT");
        }

        if (duel.status !== DuelStatus.PENDING) {
            throw new AppError(`Duel is ${duel.status}, cannot accept`, 400, "INVALID_STATE");
        }

        const updated = await prisma.duel.update({
            where: { id: duelId },
            data: {
                status: DuelStatus.ACTIVE,
                startedAt: new Date(),
            },
            include: {
                challenger: { select: { id: true, username: true, avatarUrl: true } },
                opponent: { select: { id: true, username: true, avatarUrl: true } },
                problem: true,
            },
        });

        res.status(200).json({
            data: updated,
            message: "Duel accepted — game on!",
        });
    } catch (err) {
        next(err);
    }
}

// ─── Complete a duel ──────────────────────────────────────
/**
 * PATCH /api/duels/:duelId/complete
 * Called when a participant marks their submission. The first to complete wins.
 */
export async function completeDuel(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { duelId } = req.params;
        const { userId } = req.user;

        const duel = await prisma.duel.findUnique({ where: { id: duelId } });

        if (!duel) {
            throw new AppError("Duel not found", 404, "NOT_FOUND");
        }

        if (duel.challengerId !== userId && duel.opponentId !== userId) {
            throw new AppError("You are not a participant", 403, "NOT_PARTICIPANT");
        }

        if (duel.status !== DuelStatus.ACTIVE) {
            throw new AppError(`Duel is ${duel.status}, cannot complete`, 400, "INVALID_STATE");
        }

        const updated = await prisma.duel.update({
            where: { id: duelId },
            data: {
                status: DuelStatus.COMPLETED,
                winnerId: userId,
                endedAt: new Date(),
            },
            include: {
                challenger: { select: { id: true, username: true, avatarUrl: true } },
                opponent: { select: { id: true, username: true, avatarUrl: true } },
                winner: { select: { id: true, username: true, avatarUrl: true } },
                problem: true,
            },
        });

        // Award bonus points to winner
        const DUEL_WIN_POINTS = 30;
        await prisma.user.update({
            where: { id: userId },
            data: { totalPoints: { increment: DUEL_WIN_POINTS } },
        });
        await prisma.squadMember.updateMany({
            where: { userId, squadId: duel.squadId },
            data: { points: { increment: DUEL_WIN_POINTS } },
        });

        // Notify both participants
        const loserId = userId === duel.challengerId ? duel.opponentId : duel.challengerId;
        await prisma.notification.createMany({
            data: [
                {
                    userId,
                    type: "DUEL_RESULT",
                    payload: { duelId, result: "WIN", points: DUEL_WIN_POINTS },
                },
                {
                    userId: loserId,
                    type: "DUEL_RESULT",
                    payload: { duelId, result: "LOSE", points: 0 },
                },
            ],
        });

        res.status(200).json({
            data: updated,
            message: "Duel completed — winner recorded",
        });
    } catch (err) {
        next(err);
    }
}

// ─── Cancel a duel ────────────────────────────────────────
/**
 * PATCH /api/duels/:duelId/cancel
 * Only the challenger can cancel a PENDING duel.
 */
export async function cancelDuel(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { duelId } = req.params;
        const { userId } = req.user;

        const duel = await prisma.duel.findUnique({ where: { id: duelId } });

        if (!duel) {
            throw new AppError("Duel not found", 404, "NOT_FOUND");
        }

        if (duel.challengerId !== userId) {
            throw new AppError("Only the challenger can cancel", 403, "NOT_CHALLENGER");
        }

        if (duel.status !== DuelStatus.PENDING) {
            throw new AppError(`Duel is ${duel.status}, cannot cancel`, 400, "INVALID_STATE");
        }

        const updated = await prisma.duel.update({
            where: { id: duelId },
            data: { status: DuelStatus.CANCELLED },
        });

        res.status(200).json({
            data: updated,
            message: "Duel cancelled",
        });
    } catch (err) {
        next(err);
    }
}
