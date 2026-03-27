import { Request, Response, NextFunction } from "express";
import { createClerkClient } from "@clerk/backend";
import prisma from "../lib/prisma";

const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Clerk JWT verification middleware.
 * - Extracts Bearer token from Authorization header
 * - Verifies the token via Clerk backend SDK
 * - Looks up the internal User record by clerkId
 * - Attaches { userId, clerkId } to req.user
 * - Returns 401 if anything is invalid
 */
export async function requireAuth(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(401).json({
                error: "Missing or malformed Authorization header",
                code: "MISSING_TOKEN",
                statusCode: 401,
            });
            return;
        }

        const token = authHeader.slice(7); // strip "Bearer "

        // Verify the JWT using Clerk's backend SDK
        const payload = await clerkClient.verifyToken(token);

        if (!payload || !payload.sub) {
            res.status(401).json({
                error: "Invalid token",
                code: "INVALID_TOKEN",
                statusCode: 401,
            });
            return;
        }

        const clerkId = payload.sub;

        // Look up the internal user record
        const user = await prisma.user.findUnique({
            where: { clerkId },
            select: { id: true, clerkId: true },
        });

        if (!user) {
            res.status(401).json({
                error: "User not found. Call /api/auth/sync first.",
                code: "USER_NOT_SYNCED",
                statusCode: 401,
            });
            return;
        }

        // Attach to request for downstream handlers
        req.user = { userId: user.id, clerkId: user.clerkId };

        next();
    } catch (err) {
        // Clerk throws on expired/invalid tokens — surface as 401
        if (err instanceof Error && err.message.includes("expired")) {
            res.status(401).json({
                error: "Token expired",
                code: "TOKEN_EXPIRED",
                statusCode: 401,
            });
            return;
        }
        next(err);
    }
}
