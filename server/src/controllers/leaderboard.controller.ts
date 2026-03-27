import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import redis from "../lib/redis";

const CACHE_TTL = 300; // 5 minutes

// ─── Squad leaderboard ────────────────────────────────────
/**
 * GET /api/leaderboard/squad/:squadId?period=weekly|allTime
 * Returns ranked members of a squad.
 */
export async function getSquadLeaderboard(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { squadId } = req.params;
        const period = (req.query.period as string) ?? "allTime";
        const cacheKey = `leaderboard:squad:${squadId}:${period}`;

        // Try cache first
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                res.status(200).json({ data: cached, cached: true });
                return;
            }
        } catch {
            // Redis unavailable — fall through to DB
        }

        // Verify squad exists
        const squad = await prisma.squad.findUnique({
            where: { id: squadId },
            select: { id: true, name: true },
        });

        if (!squad) {
            throw new AppError("Squad not found", 404, "NOT_FOUND");
        }

        const members = await prisma.squadMember.findMany({
            where: { squadId },
            orderBy: { points: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                        totalPoints: true,
                        streak: true,
                        maxStreak: true,
                    },
                },
            },
        });

        const leaderboard = members.map((m, index) => ({
            rank: index + 1,
            userId: m.userId,
            username: m.user.username,
            avatarUrl: m.user.avatarUrl,
            squadPoints: m.points,
            totalPoints: m.user.totalPoints,
            streak: m.user.streak,
            maxStreak: m.user.maxStreak,
            role: m.role,
            joinedAt: m.joinedAt,
        }));

        // Cache the result
        try {
            await redis.set(cacheKey, JSON.stringify(leaderboard), { ex: CACHE_TTL });
        } catch {
            // Redis unavailable — continue without cache
        }

        res.status(200).json({ data: leaderboard, cached: false });
    } catch (err) {
        next(err);
    }
}

// ─── Global leaderboard ──────────────────────────────────
/**
 * GET /api/leaderboard/global?page=&limit=
 * Returns all users ranked by totalPoints.
 */
export async function getGlobalLeaderboard(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
        const skip = (page - 1) * limit;
        const cacheKey = `leaderboard:global:${page}:${limit}`;

        // Try cache first
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                res.status(200).json({ ...(typeof cached === "string" ? JSON.parse(cached) : cached), cached: true });
                return;
            }
        } catch {
            // Redis unavailable
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                    totalPoints: true,
                    streak: true,
                    maxStreak: true,
                    _count: { select: { solves: true } },
                },
                orderBy: { totalPoints: "desc" },
                skip,
                take: limit,
            }),
            prisma.user.count(),
        ]);

        const leaderboard = users.map((u, index) => ({
            rank: skip + index + 1,
            userId: u.id,
            username: u.username,
            avatarUrl: u.avatarUrl,
            totalPoints: u.totalPoints,
            streak: u.streak,
            maxStreak: u.maxStreak,
            solveCount: u._count.solves,
        }));

        const payload = {
            data: leaderboard,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        };

        // Cache
        try {
            await redis.set(cacheKey, JSON.stringify(payload), { ex: CACHE_TTL });
        } catch {
            // Redis unavailable
        }

        res.status(200).json({ ...payload, cached: false });
    } catch (err) {
        next(err);
    }
}
