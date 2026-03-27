import { z } from "zod";

// ─── Auth ───────────────────────────────────────────────
export const syncUserSchema = z.object({
    clerkId: z.string().min(1, "clerkId is required"),
    email: z.string().email("Invalid email"),
    username: z.string().min(2).max(30),
    avatarUrl: z.string().url().optional(),
});

// ─── Users ──────────────────────────────────────────────
export const updateProfileSchema = z.object({
    username: z.string().min(2).max(30).optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
});

// ─── Squads ─────────────────────────────────────────────
export const createSquadSchema = z.object({
    name: z.string().min(2).max(50),
    description: z.string().max(500).optional(),
    isPublic: z.boolean().optional(),
    avatarUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    tags: z.array(z.string().max(30)).max(10).optional(),
});

export const joinSquadSchema = z.object({
    inviteCode: z.string().min(1, "inviteCode is required"),
});

// ─── Problems ───────────────────────────────────────────
export const createProblemSchema = z.object({
    url: z.string().url("Invalid problem URL"),
    title: z.string().min(1).max(200).optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
    platform: z.enum(["LEETCODE", "GFG", "CODEFORCES", "OTHER"]).optional(),
    tags: z.array(z.string().max(30)).max(20).optional(),
});

export const shareProblemSchema = z.object({
    problemId: z.string().uuid(),
    squadId: z.string().uuid(),
    note: z.string().max(500).optional(),
});

export const markSolvedSchema = z.object({
    problemId: z.string().uuid(),
    timeTaken: z.number().int().positive().optional(),
    approachNote: z.string().max(2000).optional(),
});

// ─── Duels ──────────────────────────────────────────────
export const createDuelSchema = z.object({
    opponentId: z.string().uuid(),
    problemId: z.string().uuid(),
    squadId: z.string().uuid(),
    timeLimit: z.number().int().min(5).max(180).optional(),
});

// ─── Discussions ────────────────────────────────────────
export const createDiscussionSchema = z.object({
    content: z.string().min(1).max(5000),
    problemId: z.string().uuid(),
    squadId: z.string().uuid(),
    isSpoiler: z.boolean().optional(),
    parentId: z.string().uuid().optional(),
});

export const createReactionSchema = z.object({
    emoji: z.string().min(1).max(4),
});

// ─── Notifications ──────────────────────────────────────
export const markNotificationsReadSchema = z.object({
    notificationIds: z.array(z.string().uuid()).min(1).max(100),
});

// ─── Pagination (reusable) ──────────────────────────────
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
});
