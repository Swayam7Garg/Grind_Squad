import prisma from "../lib/prisma";
import redis from "../lib/redis";

export type LeaderboardEntry = {
    rank: number;
    userId: string;
    username: string;
    avatarUrl: string | null;
    points: number;
    streak: number;
};

/**
 * Adds points to the sorted sets.
 */
export async function addPoints(userId: string, squadId: string, points: number): Promise<void> {
    try {
        await redis.zincrby(`leaderboard:squad:${squadId}:alltime`, points, userId);
        await redis.zincrby(`leaderboard:squad:${squadId}:weekly`, points, userId);
        await redis.zincrby(`leaderboard:global:alltime`, points, userId);
    } catch {
        // Fallback or ignore if Redis is down
    }
}

/**
 * Get Squad Leaderboard
 */
export async function getSquadLeaderboard(
    squadId: string,
    type: "alltime" | "weekly",
    limit = 50
): Promise<LeaderboardEntry[]> {
    const key = `leaderboard:squad:${squadId}:${type}`;
    let raw: (string | number)[] = [];

    try {
        // Standard Redis ZRANGE with REV and WITHSCORES for latest Upstash SDK
        raw = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });
    } catch {
        // Fallback
    }

    if (!raw || raw.length === 0) {
        return [];
    }

    // raw is like: ["userId1", "150", "userId2", "120"]
    const entries: { userId: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
        entries.push({
            userId: String(raw[i]),
            score: Number(raw[i + 1]),
        });
    }

    const unames = await prisma.user.findMany({
        where: { id: { in: entries.map(e => e.userId) } },
        select: { id: true, username: true, avatarUrl: true, streak: true },
    });

    const userMap = new Map(unames.map((u) => [u.id, u]));

    return entries.map((entry, index) => {
        const u = userMap.get(entry.userId);
        return {
            rank: index + 1,
            userId: entry.userId,
            username: u?.username ?? "Unknown",
            avatarUrl: u?.avatarUrl ?? null,
            points: entry.score,
            streak: u?.streak ?? 0,
        };
    });
}

/**
 * Get Global Leaderboard
 */
export async function getGlobalLeaderboard(limit = 100): Promise<LeaderboardEntry[]> {
    const key = `leaderboard:global:alltime`;
    let raw: (string | number)[] = [];

    try {
        raw = await redis.zrange(key, 0, limit - 1, { rev: true, withScores: true });
    } catch {
        // Fallback
    }

    if (!raw || raw.length === 0) {
        return [];
    }

    const entries: { userId: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
        entries.push({
            userId: String(raw[i]),
            score: Number(raw[i + 1]),
        });
    }

    const unames = await prisma.user.findMany({
        where: { id: { in: entries.map(e => e.userId) } },
        select: { id: true, username: true, avatarUrl: true, streak: true },
    });

    const userMap = new Map(unames.map((u) => [u.id, u]));

    return entries.map((entry, index) => {
        const u = userMap.get(entry.userId);
        return {
            rank: index + 1,
            userId: entry.userId,
            username: u?.username ?? "Unknown",
            avatarUrl: u?.avatarUrl ?? null,
            points: entry.score,
            streak: u?.streak ?? 0,
        };
    });
}

/**
 * Reset Weekly Leaderboards
 * Finds all matching keys and deletes them
 */
export async function resetWeeklyLeaderboards(): Promise<void> {
    try {
        // Upstash / standard redis `SCAN` and `DEL` key rotation
        let cursor = 0;
        do {
            const scanRes = await redis.scan(cursor, { match: "leaderboard:squad:*:weekly" });
            cursor = typeof scanRes[0] === 'string' ? parseInt(scanRes[0] as string, 10) : scanRes[0];
            const keys = scanRes[1] as string[];
            if (keys && keys.length > 0) {
                await redis.del(...keys);
            }
        } while (cursor !== 0);
    } catch (e) {
        console.error("Failed to reset weekly leaderboards", e);
    }
}
