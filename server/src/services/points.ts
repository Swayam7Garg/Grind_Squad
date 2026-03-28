import prisma from "../lib/prisma";
import { Difficulty } from "@prisma/client";

/**
 * Points Configuration based on difficulty.
 */
const BASE_POINTS: Record<Difficulty, number> = {
    EASY: 10,
    MEDIUM: 25,
    HARD: 50,
};

const FIRST_SOLVE_BONUS = 15;

/**
 * Pure function: calculate points based on difficulty, streak, and first solve
 */
export function calculatePoints(
    difficulty: Difficulty,
    streak: number,
    isFirstSolve: boolean
): number {
    const base = BASE_POINTS[difficulty] ?? BASE_POINTS.MEDIUM;
    let multiplier = 1.0;

    if (streak >= 14) {
        multiplier = 2.0;
    } else if (streak >= 7) {
        multiplier = 1.5;
    } else if (streak >= 3) {
        multiplier = 1.2;
    }

    const bonus = isFirstSolve ? FIRST_SOLVE_BONUS : 0;
    return Math.round(base * multiplier) + bonus;
}

/**
 * Calculate user's new streak by comparing lastSolvedAt with the current UTC day.
 * Returns the new streak, whether they already solved today, and the updated maxStreak.
 */
export async function updateStreak(userId: string): Promise<{ newStreak: number; alreadySolvedToday: boolean; maxStreak: number }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastSolvedAt: true, streak: true, maxStreak: true },
    });

    if (!user) {
        throw new Error("User not found");
    }

    const nowStr = new Date().toISOString().split("T")[0];     // YYYY-MM-DD
    const lastStr = user.lastSolvedAt
        ? new Date(user.lastSolvedAt).toISOString().split("T")[0]
        : null;

    let { streak, maxStreak } = user;
    let alreadySolvedToday = false;

    if (!lastStr) {
        // First ever solve
        streak = 1;
    } else if (lastStr === nowStr) {
        // Already solved today
        alreadySolvedToday = true;
    } else {
        // Check if yesterday
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        if (lastStr === yesterdayStr) {
            streak += 1;
        } else {
            // Broken streak
            streak = 1;
        }
    }

    maxStreak = Math.max(maxStreak, streak);

    return { newStreak: streak, alreadySolvedToday, maxStreak };
}

/**
 * Awards points directly using a Prisma transaction.
 */
export async function awardPoints(
    userId: string,
    problemId: string,
    squadIds: string[]
): Promise<{ pointsEarned: number; newStreak: number; isFirstSolve: boolean }> {
    return await prisma.$transaction(async (tx) => {
        const problem = await tx.problem.findUnique({
            where: { id: problemId },
            select: { difficulty: true },
        });

        if (!problem) throw new Error("Problem not found");

        const { newStreak, maxStreak } = await updateStreak(userId);

        // Check first solve across all provided squads
        let isFirstSolve = false;
        if (squadIds.length > 0) {
            const priorSolvesInSquads = await tx.userSolve.findFirst({
                where: {
                    problemId,
                    userId: { not: userId },
                    user: { squadMemberships: { some: { squadId: { in: squadIds } } } },
                },
                select: { id: true },
            });
            if (!priorSolvesInSquads) {
                isFirstSolve = true;
            }
        }

        const pointsEarned = calculatePoints(problem.difficulty, newStreak, isFirstSolve);

        // Update User
        await tx.user.update({
            where: { id: userId },
            data: {
                totalPoints: { increment: pointsEarned },
                streak: newStreak,
                maxStreak: maxStreak,
                lastSolvedAt: new Date(),
            },
        });

        // Update SquadMemberships
        if (squadIds.length > 0) {
            await tx.squadMember.updateMany({
                where: {
                    userId,
                    squadId: { in: squadIds },
                },
                data: {
                    points: { increment: pointsEarned },
                },
            });
        }

        return { pointsEarned, newStreak, isFirstSolve };
    });
}
