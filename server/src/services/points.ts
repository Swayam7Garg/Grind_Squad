import prisma from "../lib/prisma";

/**
 * Points Configuration
 */
const POINTS = {
    SOLVE_EASY: 10,
    SOLVE_MEDIUM: 20,
    SOLVE_HARD: 40,
    DUEL_WIN: 30,
    STREAK_BONUS_PER_DAY: 5,
    STREAK_BONUS_CAP: 50,
} as const;

type PointReason = "SOLVE" | "DUEL_WIN" | "STREAK_BONUS" | "BADGE_BONUS";

/**
 * Award points to a user and update their squad membership points.
 * Also updates totalPoints on the User model.
 */
export async function awardPoints(
    userId: string,
    points: number,
    _reason: PointReason
): Promise<void> {
    // Update user total
    await prisma.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: points } },
    });

    // Update all squad memberships for this user
    await prisma.squadMember.updateMany({
        where: { userId },
        data: { points: { increment: points } },
    });
}

/**
 * Calculate points for a solve based on difficulty.
 */
export function getPointsForDifficulty(difficulty: string): number {
    switch (difficulty) {
        case "EASY":
            return POINTS.SOLVE_EASY;
        case "MEDIUM":
            return POINTS.SOLVE_MEDIUM;
        case "HARD":
            return POINTS.SOLVE_HARD;
        default:
            return POINTS.SOLVE_MEDIUM;
    }
}

/**
 * Calculate streak bonus (capped).
 */
export function getStreakBonus(streakDays: number): number {
    return Math.min(streakDays * POINTS.STREAK_BONUS_PER_DAY, POINTS.STREAK_BONUS_CAP);
}

export { POINTS };
