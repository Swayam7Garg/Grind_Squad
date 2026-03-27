import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma";

/**
 * Squad Guard middleware.
 * Requires requireAuth to have run first (req.user must be set).
 *
 * - Reads squadId from req.params.squadId
 * - Queries SquadMember to confirm the caller is a member
 * - Attaches the full SquadMember row to req.squadMember
 * - Returns 400 if squadId is missing, 403 if not a member
 */
export async function squadGuard(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { squadId } = req.params;

        if (!squadId) {
            res.status(400).json({
                error: "squadId is required",
                code: "MISSING_SQUAD_ID",
                statusCode: 400,
            });
            return;
        }

        const { userId } = req.user;

        const member = await prisma.squadMember.findUnique({
            where: {
                userId_squadId: { userId, squadId },
            },
        });

        if (!member) {
            res.status(403).json({
                error: "You are not a member of this squad",
                code: "NOT_A_MEMBER",
                statusCode: 403,
            });
            return;
        }

        req.squadMember = member;

        next();
    } catch (err) {
        next(err);
    }
}
