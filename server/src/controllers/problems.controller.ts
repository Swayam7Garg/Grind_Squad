import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { slugFromUrl, detectPlatform, slugFromTitle, generateUniqueSlug } from "../utils/slugify";
import { isValidTag } from "../utils/tags";
import { Difficulty, Platform } from "@prisma/client";
import { awardPoints } from "../services/points";
import { addPoints } from "../services/leaderboard";

// ─── Global Endpoints ─────────────────────────────────────────

export async function listProblems(req: Request, res: Response, next: NextFunction): Promise<void> {
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
            prisma.problem.findMany({ where, orderBy: { createdAt: "desc" }, skip, take: limit }),
            prisma.problem.count({ where }),
        ]);

        res.status(200).json({
            data: problems,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) { next(err); }
}

export async function createProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { url, title, difficulty, platform, tags } = req.body;
        if (!url) throw new AppError("url is required", 400, "VALIDATION_ERROR");

        const slug = slugFromUrl(url);
        const detectedPlatform = platform ?? detectPlatform(url);

        const problem = await prisma.problem.upsert({
            where: { slug },
            create: {
                slug, title: title ?? slug, url,
                difficulty: difficulty ?? "MEDIUM", platform: detectedPlatform, tags: tags ?? [],
            },
            update: {
                ...(title ? { title } : {}),
                ...(tags ? { tags } : {}),
            },
        });

        res.status(201).json({ data: problem, message: "Problem created/updated successfully" });
    } catch (err) { next(err); }
}

export async function getProblemById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { problemId } = req.params;
        const problem = await prisma.problem.findUnique({
            where: { id: problemId },
            include: { _count: { select: { solves: true, discussions: true, duels: true } } },
        });

        if (!problem) throw new AppError("Problem not found", 404, "NOT_FOUND");
        res.status(200).json({ data: problem });
    } catch (err) { next(err); }
}

// ─── Squad-Specific Endpoints ─────────────────────────────────

export async function shareProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { userId } = req.user;
        const { squadId } = req.params;
        let { url, title, difficulty, tags, note, slug } = req.body;

        if (!url || !title || !difficulty) {
            throw new AppError("url, title, and difficulty are required", 400, "VALIDATION_ERROR");
        }

        if (!tags || !Array.isArray(tags) || tags.length > 5) {
            throw new AppError("tags array is required (max 5)", 400, "VALIDATION_ERROR");
        }

        for (const tag of tags) {
            if (!isValidTag(tag)) throw new AppError(`Invalid tag: ${tag}`, 400, "VALIDATION_ERROR");
        }

        const platform = detectPlatform(url);
        
        let targetSlug = slug;
        if (!targetSlug) {
            targetSlug = slugFromTitle(title);
        }

        // Try find existing problem by slug
        let problem = await prisma.problem.findUnique({ where: { slug: targetSlug } });

        if (problem && problem.url !== url) {
            // Slug collision but different URL -> append suffix
            targetSlug = await generateUniqueSlug(targetSlug);
            problem = null;
        }

        if (!problem) {
            problem = await prisma.problem.create({
                data: {
                    slug: targetSlug, title, url, difficulty, platform, tags
                }
            });
        }

        const squadProblem = await prisma.squadProblem.upsert({
            where: { problemId_squadId: { problemId: problem.id, squadId } },
            create: {
                problemId: problem.id,
                squadId,
                sharedById: userId,
                note: note ?? null,
            },
            update: {}, // no-op if exists
            include: {
                sharedBy: { select: { id: true, username: true, avatarUrl: true } },
            },
        });

        // Notify other squad members
        const members = await prisma.squadMember.findMany({ where: { squadId, userId: { not: userId } } });
        
        if (members.length > 0) {
            await prisma.notification.createMany({
                data: members.map(m => ({
                    userId: m.userId,
                    type: "PROBLEM_SHARED",
                    payload: {
                        squadId,
                        problemId: problem!.id,
                        sharedById: userId,
                        title: problem!.title
                    }
                }))
            });
        }

        res.status(201).json({ data: { problem, squadProblem } });
    } catch (err) { next(err); }
}

export async function getSquadProblems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { userId } = req.user;
        const { squadId } = req.params;
        const tag = req.query.tag as string;
        const difficulty = req.query.difficulty as Difficulty;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const solvedParam = req.query.solved as string | undefined;

        let solvedFilter: boolean | undefined = undefined;
        if (solvedParam === "true") solvedFilter = true;
        if (solvedParam === "false") solvedFilter = false;

        const skip = (page - 1) * limit;

        const squadProblemsList = await prisma.squadProblem.findMany({
            where: {
                squadId,
                problem: {
                    ...(difficulty ? { difficulty } : {}),
                    ...(tag ? { tags: { has: tag } } : {}),
                }
            },
            include: {
                problem: {
                    include: { solves: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } } }
                },
                sharedBy: { select: { id: true, username: true, avatarUrl: true } },
            },
            orderBy: { sharedAt: "desc" },
        });

        const formatted = squadProblemsList.map(sp => {
            const solvedBy = sp.problem.solves.map(s => s.user);
            const isSolvedByMe = solvedBy.some(u => u.id === userId);
            return {
                ...sp.problem,
                solves: undefined, // remove raw solves
                squadProblem: {
                    id: sp.id, note: sp.note, sharedAt: sp.sharedAt, sharedBy: sp.sharedBy
                },
                solvedBy,
                isSolvedByMe
            };
        });

        let filtered = formatted;
        if (solvedFilter !== undefined) {
            filtered = formatted.filter(p => p.isSolvedByMe === solvedFilter);
        }

        const paginated = filtered.slice(skip, skip + limit);

        res.status(200).json({ data: paginated });
    } catch (err) { next(err); }
}

export async function markSolved(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { userId } = req.user;
        const { squadId, problemId } = req.params;
        const { timeTaken, approachNote } = req.body;

        const existingSolve = await prisma.userSolve.findUnique({
            where: { userId_problemId: { userId, problemId } }
        });

        if (existingSolve) {
            throw new AppError("Already marked as solved", 400, "ALREADY_SOLVED");
        }

        await prisma.userSolve.create({
            data: {
                userId,
                problemId,
                timeTaken: timeTaken ?? null,
                approachNote: approachNote ?? null,
            }
        });

        // Find all squads the user is a member of where this problem has been shared.
        const userSquads = await prisma.squadMember.findMany({
            where: { userId }, select: { squadId: true }
        });
        const userSquadIds = userSquads.map(us => us.squadId);

        const sharedInSquads = await prisma.squadProblem.findMany({
            where: { problemId, squadId: { in: userSquadIds } },
            select: { squadId: true }
        });
        const awardSquadIds = sharedInSquads.map(sp => sp.squadId);

        const { pointsEarned, newStreak } = await awardPoints(userId, problemId, awardSquadIds);

        const updatedUser = await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } });

        for (const sid of awardSquadIds) {
            await addPoints(userId, sid, pointsEarned);
        }

        res.status(200).json({
            data: {
                pointsEarned,
                newStreak,
                totalPoints: updatedUser?.totalPoints ?? 0
            }
        });
    } catch (err) { next(err); }
}
