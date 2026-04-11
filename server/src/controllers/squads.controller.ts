import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { SquadRole } from "@prisma/client";

// ─── Helpers ───────────────────────────────────────────────

/** Generates an 8-character uppercase alphanumeric invite code */
function generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// ─── Controllers ───────────────────────────────────────────

/**
 * POST /api/squads
 * Create a new squad. Creator auto-assigned as OWNER.
 */
export async function createSquad(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const {
            name,
            description,
            isPublic,
            avatarUrl,
            bannerUrl,
            tags,
        } = req.body as {
            name: string;
            description?: string;
            isPublic?: boolean;
            avatarUrl?: string;
            bannerUrl?: string;
            tags?: string[];
        };

        if (!name || name.trim().length === 0) {
            throw new AppError("Squad name is required", 400, "VALIDATION_ERROR");
        }

        // Generate a guaranteed-unique invite code
        let inviteCode = generateInviteCode();
        const exists = await prisma.squad.findUnique({ where: { inviteCode } });
        if (exists) inviteCode = generateInviteCode(); // retry once (collision extremely unlikely)

        const squad = await prisma.squad.create({
            data: {
                name: name.trim(),
                description: description ?? null,
                inviteCode,
                isPublic: isPublic ?? false,
                avatarUrl: avatarUrl ?? null,
                bannerUrl: bannerUrl ?? null,
                tags: tags ?? [],
                members: {
                    create: {
                        userId,
                        role: SquadRole.OWNER,
                    },
                },
            },
            include: {
                members: {
                    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
                },
            },
        });

        res.status(201).json({
            data: squad,
            message: "Squad created successfully",
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/squads/:squadId
 * Get squad details + full member list.
 * Requires squadGuard (user must be a member).
 */
export async function getSquad(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { squadId } = req.params;

        const squad = await prisma.squad.findUnique({
            where: { id: squadId },
            include: {
                members: {
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
                },
                _count: { select: { problems: true, duels: true } },
            },
        });

        if (!squad) {
            throw new AppError("Squad not found", 404, "NOT_FOUND");
        }

        res.status(200).json({ data: squad });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/squads/join
 * Join a squad via invite code.
 */
export async function joinSquad(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { inviteCode } = req.body as { inviteCode: string };

        if (!inviteCode) {
            throw new AppError("inviteCode is required", 400, "VALIDATION_ERROR");
        }

        const squad = await prisma.squad.findUnique({
            where: { inviteCode: inviteCode.toUpperCase() },
        });

        if (!squad) {
            throw new AppError("Invalid invite code", 404, "INVALID_INVITE_CODE");
        }

        // Check already a member
        const existing = await prisma.squadMember.findUnique({
            where: { userId_squadId: { userId, squadId: squad.id } },
        });

        if (existing) {
            throw new AppError("You are already a member of this squad", 409, "ALREADY_MEMBER");
        }

        await prisma.squadMember.create({
            data: { userId, squadId: squad.id, role: SquadRole.MEMBER },
        });

        const updatedSquad = await prisma.squad.findUnique({
            where: { id: squad.id },
            include: {
                members: {
                    include: { user: { select: { id: true, username: true, avatarUrl: true } } },
                },
            },
        });

        res.status(200).json({
            data: updatedSquad,
            message: "Joined squad successfully",
        });
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/squads/public
 * List public squads. Supports ?search=&tag=&page=&limit=
 */
export async function listPublicSquads(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
        const skip = (page - 1) * limit;

        const [squads, total] = await Promise.all([
            prisma.squad.findMany({
                where: {
                    isPublic: true,
                    ...(search
                        ? {
                            OR: [
                                { name: { contains: search, mode: "insensitive" } },
                                { description: { contains: search, mode: "insensitive" } },
                            ],
                        }
                        : {}),
                    ...(tag ? { tags: { has: tag } } : {}),
                },
                include: {
                    _count: { select: { members: true, problems: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.squad.count({
                where: {
                    isPublic: true,
                    ...(search
                        ? {
                            OR: [
                                { name: { contains: search, mode: "insensitive" } },
                                { description: { contains: search, mode: "insensitive" } },
                            ],
                        }
                        : {}),
                    ...(tag ? { tags: { has: tag } } : {}),
                },
            }),
        ]);

        res.status(200).json({
            data: squads,
            meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/squads/:squadId/leave
 * Leave a squad. OWNER cannot leave (must transfer ownership or delete squad).
 */
export async function leaveSquad(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { userId } = req.user;
        const { squadId } = req.params;

        const member = req.squadMember; // already fetched by squadGuard

        if (member.role === SquadRole.OWNER) {
            throw new AppError(
                "Owner cannot leave. Transfer ownership first or delete the squad.",
                403,
                "OWNER_CANNOT_LEAVE"
            );
        }

        await prisma.squadMember.delete({
            where: { userId_squadId: { userId, squadId } },
        });

        res.status(200).json({ message: "Left squad successfully" });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/squads/:squadId
 * Delete a squad entirely. Only the OWNER may do this.
 * Cascades to members, problems, duels via Prisma onDelete.
 */
export async function deleteSquad(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { squadId } = req.params;
        const member = req.squadMember; // set by squadGuard

        if (member.role !== SquadRole.OWNER) {
            throw new AppError(
                "Only the squad owner can delete the squad.",
                403,
                "FORBIDDEN"
            );
        }

        // Delete duels (no cascade from Squad) and members, then the squad itself.
        // SquadProblems cascade automatically via onDelete:Cascade on the Squad relation.
        await prisma.$transaction(async (tx) => {
            await tx.duel.deleteMany({ where: { squadId } });
            await tx.squadMember.deleteMany({ where: { squadId } });
            await tx.squad.delete({ where: { id: squadId } });
        });

        res.status(200).json({ message: "Squad deleted successfully." });
    } catch (err) {
        next(err);
    }
}

/**
 * POST /api/squads/:squadId/members
 * Add a member to a squad. OWNER/ADMIN only.
 */
export async function addMember(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { squadId } = req.params;
        const { userId: targetUserId } = req.body as { userId: string };
        const member = req.squadMember; // from squadGuard

        if (member.role !== SquadRole.OWNER && member.role !== SquadRole.ADMIN) {
            throw new AppError("Only squad leaders can add members.", 403, "FORBIDDEN");
        }

        if (!targetUserId) {
            throw new AppError("userId is required", 400, "VALIDATION_ERROR");
        }

        // Check if already a member
        const existing = await prisma.squadMember.findUnique({
            where: { userId_squadId: { userId: targetUserId, squadId } },
        });

        if (existing) {
            throw new AppError("User is already a member", 409, "ALREADY_MEMBER");
        }

        await prisma.squadMember.create({
            data: { userId: targetUserId, squadId, role: SquadRole.MEMBER },
        });

        res.status(201).json({ message: "Member added successfully" });
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /api/squads/:squadId/members/:memberUserId
 * Remove a member from a squad. OWNER/ADMIN only.
 */
export async function removeMember(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { squadId, memberUserId } = req.params;
        const member = req.squadMember; // from squadGuard

        if (member.role !== SquadRole.OWNER && member.role !== SquadRole.ADMIN) {
            throw new AppError("Only squad leaders can remove members.", 403, "FORBIDDEN");
        }

        const targetMember = await prisma.squadMember.findUnique({
            where: { userId_squadId: { userId: memberUserId, squadId } },
        });

        if (!targetMember) {
            throw new AppError("Member not found in squad", 404, "NOT_FOUND");
        }

        if (targetMember.role === SquadRole.OWNER) {
            throw new AppError("Owner cannot be removed. Transfer ownership or delete squad.", 403, "FORBIDDEN");
        }

        await prisma.squadMember.delete({
            where: { userId_squadId: { userId: memberUserId, squadId } },
        });

        res.status(200).json({ message: "Member removed successfully" });
    } catch (err) {
        next(err);
    }
}


