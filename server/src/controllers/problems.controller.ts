import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { slugFromUrl, detectPlatform } from "../utils/slugify";
import { Difficulty, Platform } from "@prisma/client";

// ─── List problems ─────────────────────────────────────────
/**
 * GET /api/problems
 * List problems with optional filters: ?platform=&difficulty=&tag=&search=&page=&limit=
 */
export async function listProblems(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const platform = req.query.platform as Platform | undefined;
        const difficulty = req.query.difficulty as Difficulty | undefined;
        const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const where = {
            ...(platform ? { platform } : {}),
            ...(difficulty ? { difficulty } : {}),
            ...(tag ? { tags: { has: tag } } : {}),
            ...(search
                ? {
                      OR: [
                          { title: { contains: search, mode: "insensitive" as const } },
                          { slug: { contains: search, mode: "insensitive" as const } },
                      ],
                  }
                : {}),
        };

        const [problems, total] = await Promise.all([
            prisma.problem.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.problem.count({ where }),
        ]);

        res.status(200).json({
            data: problems,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        next(err);
    }
}

// ─── Create / upsert a problem ────────────────────────────
/**
 * POST /api/problems
 * Create a new problem (slug-based dedup). Auto-detects platform from URL.
 */
export async function createProblem(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { url, title, difficulty, platform, tags } = req.body as {
            url: string;
            title?: string;
            difficulty?: Difficulty;
            platform?: Platform;
            tags?: string[];
        };

        if (!url) {
            throw new AppError("url is required", 400, "VALIDATION_ERROR");
        }

        const slug = slugFromUrl(url);
        const detectedPlatform = platform ?? detectPlatform(url);

        const problem = await prisma.problem.upsert({
            where: { slug },
            create: {
                slug,
                title: title ?? slug,
                url,
                difficulty: difficulty ?? "MEDIUM",
                platform: detectedPlatform,
                tags: tags ?? [],
            },
            update: {
                // Update title/tags if provided, keep existing otherwise
                ...(title ? { title } : {}),
                ...(tags ? { tags } : {}),
            },
        });

        res.status(201).json({
            data: problem,
            message: "Problem created/updated successfully",
        });
    } catch (err) {
        next(err);
    }
}

// ─── Get a single problem ─────────────────────────────────
/**
 * GET /api/problems/:problemId
 * Get a single problem with solve count and squad-specific discussion count.
 */
export async function getProblemById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { problemId } = req.params;

        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            include: {
                _count: {
                    select: { solves: true, discussions: true, duels: true },
                },
            },
        });

        if (!problem) {
            throw new AppError("Problem not found", 404, "NOT_FOUND");
        }

        res.status(200).json({ data: problem });
    } catch (err) {
        next(err);
    }
}

// ─── Share problem to a squad ─────────────────────────────
/**
 * POST /api/problems/share
 * Share an existing problem to a squad with an optional note.
 */
export async function shareProblem(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { problemId, squadId, note } = req.body as {
            problemId: string;
            squadId: string;
            note?: string;
        };

        if (!problemId || !squadId) {
            throw new AppError("problemId and squadId are required", 400, "VALIDATION_ERROR");
        }

        // Verify caller is a member of the squad
        const membership = await prisma.squadMember.findUnique({
            where: { userId_squadId: { userId, squadId } },
        });

        if (!membership) {
            throw new AppError("You are not a member of this squad", 403, "NOT_A_MEMBER");
        }

        const squadProblem = await prisma.squadProblem.upsert({
            where: { problemId_squadId: { problemId, squadId } },
            create: {
                problemId,
                squadId,
                sharedById: userId,
                note: note ?? null,
            },
            update: {}, // already shared — no-op
            include: {
                problem: true,
                sharedBy: { select: { id: true, username: true, avatarUrl: true } },
            },
        });

        res.status(201).json({
            data: squadProblem,
            message: "Problem shared to squad",
        });
    } catch (err) {
        next(err);
    }
}

// ─── Mark a problem as solved ─────────────────────────────
/**
 * POST /api/problems/solve
 * Mark a problem as solved by the authenticated user.
 */
export async function markSolved(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { problemId, timeTaken, approachNote } = req.body as {
            problemId: string;
            timeTaken?: number;
            approachNote?: string;
        };

        if (!problemId) {
            throw new AppError("problemId is required", 400, "VALIDATION_ERROR");
        }

        // Check problem exists
        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        if (!problem) {
            throw new AppError("Problem not found", 404, "NOT_FOUND");
        }

        // Upsert the solve record
        const solve = await prisma.userSolve.upsert({
            where: { userId_problemId: { userId, problemId } },
            create: {
                userId,
                problemId,
                timeTaken: timeTaken ?? null,
                approachNote: approachNote ?? null,
            },
            update: {
                timeTaken: timeTaken ?? undefined,
                approachNote: approachNote ?? undefined,
                solvedAt: new Date(),
            },
        });

        // Update streak + points on user
        const now = new Date();
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (user) {
            const lastSolved = user.lastSolvedAt;
            let newStreak = 1;

            if (lastSolved) {
                const diffHours =
                    (now.getTime() - lastSolved.getTime()) / (1000 * 60 * 60);
                if (diffHours < 48) {
                    // Consecutive day — increment streak
                    newStreak = user.streak + 1;
                }
                // If > 48h, streak resets to 1
            }

            // Points: Easy = 10, Medium = 20, Hard = 40
            const pointsMap: Record<string, number> = { EASY: 10, MEDIUM: 20, HARD: 40 };
            const earnedPoints = pointsMap[problem.difficulty] ?? 20;

            // Streak bonus: +5 per streak day (capped at 50)
            const streakBonus = Math.min(newStreak * 5, 50);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    streak: newStreak,
                    maxStreak: Math.max(newStreak, user.maxStreak),
                    totalPoints: { increment: earnedPoints + streakBonus },
                    lastSolvedAt: now,
                },
            });

            // Also increment points on all squad memberships
            await prisma.squadMember.updateMany({
                where: { userId },
                data: { points: { increment: earnedPoints + streakBonus } },
            });
        }

        res.status(200).json({
            data: solve,
            message: "Problem marked as solved",
        });
    } catch (err) {
        next(err);
    }
}
