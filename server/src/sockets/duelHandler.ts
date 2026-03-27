import { Server } from "socket.io";

/**
 * Duel Socket Handler
 * Handles real-time duel lifecycle events via Socket.io.
 */
export function registerDuelHandlers(io: Server): void {
    const duelsNamespace = io.of("/duels");

    duelsNamespace.on("connection", (socket) => {
        console.log(`[Socket] Duel connection: ${socket.id}`);

        // Join a duel room
        socket.on("duel:join", (duelId: string) => {
            socket.join(`duel:${duelId}`);
            console.log(`[Socket] ${socket.id} joined duel room: ${duelId}`);
        });

        // Duel accepted — notify both players
        socket.on("duel:accept", (data: { duelId: string }) => {
            duelsNamespace.to(`duel:${data.duelId}`).emit("duel:started", {
                duelId: data.duelId,
                startedAt: new Date().toISOString(),
            });
        });

        // Player submits their solution
        socket.on(
            "duel:submit",
            (data: { duelId: string; userId: string }) => {
                duelsNamespace.to(`duel:${data.duelId}`).emit("duel:submission", {
                    duelId: data.duelId,
                    userId: data.userId,
                    submittedAt: new Date().toISOString(),
                });
            }
        );

        // Duel completed — announce winner
        socket.on(
            "duel:complete",
            (data: { duelId: string; winnerId: string }) => {
                duelsNamespace.to(`duel:${data.duelId}`).emit("duel:finished", {
                    duelId: data.duelId,
                    winnerId: data.winnerId,
                    endedAt: new Date().toISOString(),
                });
            }
        );

        // Duel timed out
        socket.on("duel:timeout", (data: { duelId: string }) => {
            duelsNamespace.to(`duel:${data.duelId}`).emit("duel:timed_out", {
                duelId: data.duelId,
                timedOutAt: new Date().toISOString(),
            });
        });

        // Leave duel room
        socket.on("duel:leave", (duelId: string) => {
            socket.leave(`duel:${duelId}`);
        });

        socket.on("disconnect", () => {
            console.log(`[Socket] Duel disconnected: ${socket.id}`);
        });
    });
}
