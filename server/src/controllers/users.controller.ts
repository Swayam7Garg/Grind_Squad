import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

/**
 * GET /api/users/me
 * Return the authenticated user's profile.
 */
export async function getMe(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                badges: { include: { badge: true } },
                squadMemberships: {
                    include: { squad: { select: { id: true, name: true, avatarUrl: true } } },
                },
                _count: { select: { solves: true, notifications: true } },
                solves: {
                    orderBy: { solvedAt: 'desc' },
                    include: { problem: true },
                }
            },
        });

        if (!user) {
            throw new AppError("User not found", 404, "NOT_FOUND");
        }

        // --- Calculate Analytics ---
        const last6Months = new Date();
        last6Months.setMonth(last6Months.getMonth() - 6);

        // Heatmap Processing
        const heatmapMap = new Map<string, number>();
        user.solves.forEach(s => {
            if (s.solvedAt >= last6Months) {
                const dateKey = s.solvedAt.toISOString().split('T')[0];
                heatmapMap.set(dateKey, (heatmapMap.get(dateKey) || 0) + 1);
            }
        });
        const heatmapData = Array.from(heatmapMap.entries()).map(([date, count]) => ({ date, count }));

        // Radar Processing
        const RADAR_TAGS = ['DP', 'Trees', 'Graphs', 'Arrays', 'Strings', 'Math'];
        const radarMap = new Map<string, number>();
        RADAR_TAGS.forEach(t => radarMap.set(t, 0));
        
        user.solves.forEach(s => {
            s.problem.tags.forEach(tag => {
                const upperTag = tag.toUpperCase();
                RADAR_TAGS.forEach(rt => {
                    if (upperTag.includes(rt.toUpperCase())) {
                        radarMap.set(rt, (radarMap.get(rt) || 0) + 1);
                    }
                });
            });
        });
        const radarData = Array.from(radarMap.entries()).map(([subject, fullMark]) => ({ subject, fullMark }));

        const recentTransmissions = user.solves.slice(0, 5);

        // Detach raw solves config so we don't send heavy arrays via network
        const returnUser = { ...user, solves: undefined };

        res.status(200).json({ 
            data: returnUser, 
            heatmapData, 
            radarData, 
            recentTransmissions 
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/users/me/squads
 * Return all squads the authenticated user belongs to.
 */
export async function getMySquads(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;

        const memberships = await prisma.squadMember.findMany({
            where: { userId },
            include: {
                squad: {
                    include: {
                        _count: { select: { members: true, problems: true } },
                    },
                },
            },
            orderBy: { joinedAt: "desc" },
        });

        const squads = memberships.map(m => ({ ...m.squad, role: m.role }));
        res.status(200).json({ data: squads });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/users/:userId
 * Return a public user profile.
 */
export async function getUserById(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
                bio: true,
                streak: true,
                maxStreak: true,
                totalPoints: true,
                createdAt: true,
                badges: { include: { badge: true } },
                _count: { select: { solves: true } },
            },
        });

        if (!user) {
            throw new AppError("User not found", 404, "NOT_FOUND");
        }

        res.status(200).json({ data: user });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /api/users/me
 * Update the authenticated user's profile.
 */
export async function updateMe(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { username, bio, avatarUrl } = req.body as {
            username?: string;
            bio?: string;
            avatarUrl?: string;
        };

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(username !== undefined ? { username } : {}),
                ...(bio !== undefined ? { bio } : {}),
                ...(avatarUrl !== undefined ? { avatarUrl } : {}),
            },
        });

        res.status(200).json({ data: user, message: "Profile updated" });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/users/me/activities
 * Return a chronological feed of recent activities (solves, shares) from the user's squads.
 */
export async function getActivities(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;

        // 1. Get user's squad memberships
        const memberships = await prisma.squadMember.findMany({
            where: { userId },
            select: { squadId: true }
        });
        const squadIds = memberships.map(m => m.squadId);

        // 2. Fetch recent solves within those squads context
        const recentSolves = await prisma.userSolve.findMany({
            where: {
                user: { squadMemberships: { some: { squadId: { in: squadIds } } } }
            },
            take: 20,
            orderBy: { solvedAt: 'desc' },
            include: { user: { select: { username: true } }, problem: { select: { title: true } } }
        });

        // 3. Fetch recent shared problems
        const recentShares = await prisma.squadProblem.findMany({
            where: { squadId: { in: squadIds } },
            take: 20,
            orderBy: { sharedAt: 'desc' },
            include: { sharedBy: { select: { username: true } }, problem: { select: { title: true } } }
        });

        // 4. Map into a unified feed format
        type FeedItem = { id: string; msg: string; time: Date; icon: string };
        const feed: FeedItem[] = [];

        recentSolves.forEach(s => {
            const isMe = s.userId === userId;
            feed.push({
                id: `solve-${s.id}`,
                msg: `${isMe ? 'You' : s.user.username} solved ${s.problem.title}`,
                time: s.solvedAt,
                icon: '⚡'
            });
        });

        recentShares.forEach(s => {
             feed.push({
                id: `share-${s.id}`,
                msg: `New problem shared by ${s.sharedBy.username}: ${s.problem.title}`,
                time: s.sharedAt,
                icon: '📌'
             });
        });

        // Sort combined feed
        feed.sort((a, b) => b.time.getTime() - a.time.getTime());

        res.status(200).json({ data: feed.slice(0, 15) });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/users/search?q=...
 * Search for users by username for squad invitations/management.
 */
export async function searchUsers(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const query = typeof req.query.q === "string" ? req.query.q : "";
        
        if (!query || query.length < 2) {
            res.status(200).json({ data: [] });
            return;
        }

        const users = await prisma.user.findMany({
            where: {
                username: { contains: query, mode: "insensitive" },
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
            take: 10,
        });

        res.status(200).json({ data: users });
    } catch (err) {
        next(err);
    }
}

