import { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────────────────
// Typed error shape for intentional API errors
// ─────────────────────────────────────────────────────────
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
    }
}

// ─────────────────────────────────────────────────────────
// Global Express error handler
// Must be registered LAST in app.use() chain
// ─────────────────────────────────────────────────────────
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction
): void {
    // Intentional API errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
            code: err.code,
            statusCode: err.statusCode,
        });
        return;
    }

    // Prisma known errors (e.g. unique constraint violations)
    if (err.constructor?.name === "PrismaClientKnownRequestError") {
        const prismaErr = err as Error & { code?: string; meta?: unknown };

        if (prismaErr.code === "P2002") {
            res.status(409).json({
                error: "A record with this value already exists",
                code: "CONFLICT",
                statusCode: 409,
            });
            return;
        }

        if (prismaErr.code === "P2025") {
            res.status(404).json({
                error: "Record not found",
                code: "NOT_FOUND",
                statusCode: 404,
            });
            return;
        }
    }

    // Unknown / unexpected errors
    const isDev = process.env.NODE_ENV === "development";
    console.error("[ErrorHandler]", err);

    res.status(500).json({
        error: isDev ? err.message : "Internal server error",
        code: "INTERNAL_ERROR",
        statusCode: 500,
    });
}
