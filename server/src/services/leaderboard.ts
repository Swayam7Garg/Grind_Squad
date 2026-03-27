import prisma from "../lib/prisma";
import redis from "../lib/redis";

const CACHE_TTL = 300; // 5 minutes

interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    squadPoints: number;
    totalPoints: number;
    streak: number;
}

/**
 * Get and cache the squad leaderboard (ranked by squad points).
 */
export async function getSquadLeaderboard(
    squadId: string,
    _period: "weekly" | "allTime"
): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:squad:${squadId}:${_period}`;

    // Try cache first
    try {
        const cached = await redis.get(cacheKey);
        if (cached) {
            return typeof cached === "string" ? JSON.parse(cached) : cached as LeaderboardEntry[];
        }
    } catch {
        // Redis unavailable
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
                },
            },
        },
    });

    const leaderboard: LeaderboardEntry[] = members.map((m, i) => ({
        rank: i + 1,
        userId: m.userId,
        username: m.user.username,
        avatarUrl: m.user.avatarUrl,
        squadPoints: m.points,
        totalPoints: m.user.totalPoints,
        streak: m.user.streak,
    }));

    // Cache result
    try {
        await redis.set(cacheKey, JSON.stringify(leaderboard), { ex: CACHE_TTL });
    } catch {
        // Redis unavailable
    }

    return leaderboard;
}

/**
 * Invalidate cached leaderboard for a squad (e.g., after a solve).
 */
export async function invalidateSquadLeaderboard(squadId: string): Promise<void> {
    try {
        await redis.del(`leaderboard:squad:${squadId}:weekly`);
        await redis.del(`leaderboard:squad:${squadId}:allTime`);
    } catch {
        // Redis unavailable
    }
}
