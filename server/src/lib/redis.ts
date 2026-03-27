import { Redis } from "@upstash/redis";

/**
 * Redis client (Upstash).
 * Fails gracefully in development if env vars are missing.
 */
let redis: Redis;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
} else {
    console.warn(
        "[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. " +
        "Using no-op Redis client. Leaderboard caching will be disabled."
    );

    // No-op client that silently fails — leaderboard falls back to DB queries
    redis = {
        get: async () => null,
        set: async () => "OK",
        del: async () => 0,
    } as unknown as Redis;
}

export default redis;
