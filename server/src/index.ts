import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { Server as SocketIoServer } from "socket.io";

import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import squadRoutes from "./routes/squads";
import problemRoutes from "./routes/problems";
import duelRoutes from "./routes/duels";
import discussionRoutes from "./routes/discussions";
import notificationRoutes from "./routes/notifications";
import leaderboardRoutes from "./routes/leaderboard";
import { errorHandler } from "./middleware/errorHandler";
import { registerDuelHandlers } from "./sockets/duelHandler";
import prisma from "./lib/prisma";

// ─────────────────────────────────────────────────────────
// App bootstrap
// ─────────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);

// ─── Socket.io ────────────────────────────────────────────
const io = new SocketIoServer(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL ?? "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

// Register socket handlers
registerDuelHandlers(io);

// ─── Security & parsing middleware ────────────────────────
app.use(helmet());

app.use(
    cors({
        origin: process.env.CLIENT_URL ?? "http://localhost:3000",
        credentials: true,
    })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/squads", squadRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/duels", duelRoutes);
app.use("/api/discussions", discussionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

// ─── 404 handler ─────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        error: "Route not found",
        code: "NOT_FOUND",
        statusCode: 404,
    });
});

// ─── Global error handler (must be last) ─────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────
const PORT = parseInt(process.env.PORT ?? "4000", 10);

httpServer.listen(PORT, () => {
    console.log(`\n🚀 GrindSquad API running on port ${PORT}`);
    console.log(`   Mode:       ${process.env.NODE_ENV ?? "development"}`);
    console.log(`   Client URL: ${process.env.CLIENT_URL ?? "http://localhost:3000"}`);
    console.log(`   Health:     http://localhost:${PORT}/health\n`);
});

// ─── Graceful shutdown ────────────────────────────────────
async function shutdown(): Promise<void> {
    console.log("\n[Shutdown] Closing server...");
    await prisma.$disconnect();
    httpServer.close(() => {
        console.log("[Shutdown] HTTP server closed.");
        process.exit(0);
    });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export { app, io };
