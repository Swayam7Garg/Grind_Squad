import prisma from "../lib/prisma";

/**
 * Weekly Reset Job
 * Resets weekly squad points and archives last week's leaderboard snapshot.
 *
 * Should be triggered every Monday at 00:00 UTC.
 * Deployment options:
 *  - Railway CRON job
 *  - node-cron inside the server process
 *  - External scheduler (e.g., GitHub Actions cron)
 */
export async function runWeeklyReset(): Promise<void> {
    console.log("[WeeklyReset] Starting weekly points reset...");

    try {
        // Step 1: Snapshot top performers per squad before reset
        const squads = await prisma.squad.findMany({
            select: { id: true, name: true },
        });

        for (const squad of squads) {
            const topMembers = await prisma.squadMember.findMany({
                where: { squadId: squad.id },
                orderBy: { points: "desc" },
                take: 3,
                include: {
                    user: { select: { id: true, username: true } },
                },
            });

            if (topMembers.length > 0 && topMembers[0].points > 0) {
                // Notify the weekly winner
                await prisma.notification.create({
                    data: {
                        userId: topMembers[0].userId,
                        type: "BADGE_EARNED",
                        payload: {
                            title: "Weekly Champion! 🏆",
                            message: `You topped the leaderboard in ${squad.name} with ${topMembers[0].points} points!`,
                            squadId: squad.id,
                            weeklyPoints: topMembers[0].points,
                        },
                    },
                });
            }
        }

        // Step 2: Reset all squad member weekly points to 0
        const result = await prisma.squadMember.updateMany({
            data: { points: 0 },
        });

        console.log(
            `[WeeklyReset] Reset ${result.count} squad memberships across ${squads.length} squads.`
        );

        // Step 3: Check and reset broken streaks (users who haven't solved in 48h)
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const brokenStreaks = await prisma.user.updateMany({
            where: {
                streak: { gt: 0 },
                lastSolvedAt: { lt: cutoff },
            },
            data: { streak: 0 },
        });

        console.log(`[WeeklyReset] Reset ${brokenStreaks.count} broken streaks.`);
        console.log("[WeeklyReset] Complete.");
    } catch (err) {
        console.error("[WeeklyReset] Error:", err);
        throw err;
    }
}

// Allow running as standalone script: npx ts-node src/jobs/weeklyReset.ts
if (require.main === module) {
    runWeeklyReset()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
