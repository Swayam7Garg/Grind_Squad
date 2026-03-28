import cron from "node-cron";
import { resetWeeklyLeaderboards } from "../services/leaderboard";

/**
 * Weekly Reset Job
 * Runs every Monday at 00:00 UTC to reset all weekly Redis leaderboards.
 */
export function startWeeklyResetJob(): void {
    cron.schedule("0 0 * * 1", async () => {
        console.log("[WeeklyReset] Starting weekly leaderboard reset...");
        try {
            await resetWeeklyLeaderboards();
            console.log("[WeeklyReset] Weekly leaderboards reset successfully.");
        } catch (err) {
            console.error("[WeeklyReset] Failed to reset weekly leaderboards:", err);
        }
    }, {
        timezone: "UTC"
    });
}
