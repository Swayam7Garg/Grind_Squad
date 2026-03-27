import { Request, Response, NextFunction } from "express";
import { SquadMember, SquadRole } from "@prisma/client";

// ─────────────────────────────────────────────────────────
// Augment Express Request to carry auth & squad context
// ─────────────────────────────────────────────────────────
declare global {
    namespace Express {
        interface Request {
            user: {
                userId: string;   // internal DB id (User.id)
                clerkId: string;  // Clerk external id
            };
            squadMember: SquadMember & {
                role: SquadRole;
            };
        }
    }
}

// Re-export for convenience so controllers can type-hint cleanly
export type AuthedRequest = Request & {
    user: { userId: string; clerkId: string };
};

export type AuthedSquadRequest = AuthedRequest & {
    squadMember: SquadMember & { role: SquadRole };
};

// Typed async handler to remove boilerplate in routes
export type AsyncHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;
