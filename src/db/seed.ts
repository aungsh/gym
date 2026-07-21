/**
 * Seed script — run with:
 *   npx tsx src/db/seed.ts <userId>
 *
 * Seeds all exercises for the given user.
 * Also called automatically on first login via the API.
 *
 * Each exercise appears ONCE. The dayTypes field lists all sessions it
 * belongs to (comma-separated). Exercises shared across sessions (e.g.
 * Pec Fly Machine appears on both Push and Upper) have multiple day types
 * but a single row — so no duplicates in the exercises list.
 */

import { db } from "./index";
import { exercises } from "./schema";
import type { DayType } from "./schema";

interface ExerciseSeed {
  name: string;
  dayTypes: DayType[];
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  sortOrder: number;
}

export const EXERCISE_SEEDS: ExerciseSeed[] = [
  // ── Legs ───────────────────────────────────────────────────────────────────
  {
    name: "Back Squat",
    dayTypes: ["legs"],
    targetSets: 4,
    repRangeMin: 6,
    repRangeMax: 8,
    sortOrder: 1,
  },
  {
    name: "Romanian Deadlift",
    dayTypes: ["legs"],
    targetSets: 3,
    repRangeMin: 6,
    repRangeMax: 8,
    sortOrder: 2,
  },
  {
    name: "Leg Extension",
    dayTypes: ["legs"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 3,
  },
  {
    name: "Seated Leg Curl",
    dayTypes: ["legs"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 4,
  },
  {
    name: "Standing Calf Raise",
    dayTypes: ["legs"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 5,
  },
  {
    name: "Weighted Decline Crunch",
    dayTypes: ["legs"],
    targetSets: 3,
    repRangeMin: 15,
    repRangeMax: 20,
    sortOrder: 6,
  },

  // ── Push ───────────────────────────────────────────────────────────────────
  // Exercises shared with Upper carry both day types — ONE row, no duplicate.
  {
    name: "Smith Machine Incline Bench Press",
    dayTypes: ["push", "upper"],
    targetSets: 3,
    repRangeMin: 6,
    repRangeMax: 10,
    sortOrder: 1,
  },
  {
    name: "Pec Fly Machine",
    dayTypes: ["push", "upper"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 15,
    sortOrder: 2,
  },
  {
    name: "Seated Dumbbell Shoulder Press",
    dayTypes: ["push", "upper"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 12,
    sortOrder: 3,
  },
  {
    name: "Cable Lateral Raise",
    dayTypes: ["push", "upper"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 4,
  },
  {
    name: "Incline Dumbbell Curl",
    dayTypes: ["push"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 12,
    sortOrder: 5,
  },
  {
    name: "Bicep Curl Machine",
    dayTypes: ["push", "upper"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 6,
  },

  // ── Pull ───────────────────────────────────────────────────────────────────
  // Exercises shared with Upper carry both day types.
  {
    name: "Lat Pulldown",
    dayTypes: ["pull", "upper"],
    targetSets: 3,
    repRangeMin: 6,
    repRangeMax: 12,
    sortOrder: 1,
  },
  {
    name: "T-Bar Row",
    dayTypes: ["pull"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 2,
  },
  {
    name: "Seated Cable Row",
    dayTypes: ["pull", "upper"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 12,
    sortOrder: 3,
  },
  {
    name: "Straight Arm Cable Pullover",
    dayTypes: ["pull"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 15,
    sortOrder: 4,
  },
  {
    name: "Overhead Cable Triceps Extension",
    dayTypes: ["pull", "upper"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 15,
    sortOrder: 5,
  },
  {
    name: "Cable Triceps Pushdown",
    dayTypes: ["pull"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 6,
  },
  {
    name: "Back Extension",
    dayTypes: ["pull"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 15,
    sortOrder: 7,
  },

  // ── Upper ──────────────────────────────────────────────────────────────────
  // Only exercises exclusive to Upper (shared ones are listed above).
  {
    name: "Machine / Cable Row",
    dayTypes: ["upper"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 8,
  },
  {
    name: "Rear Delt Fly",
    dayTypes: ["upper"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 9,
  },
];

export async function seedExercisesForUser(userId: string) {
  const rows = EXERCISE_SEEDS.map((e) => ({
    userId,
    name: e.name,
    dayTypes: e.dayTypes.join(","),
    targetSets: e.targetSets,
    repRangeMin: e.repRangeMin,
    repRangeMax: e.repRangeMax,
    sortOrder: e.sortOrder,
    isActive: true,
  }));

  await db.insert(exercises).values(rows).onConflictDoNothing();
  console.log(`Seeded ${rows.length} exercises for user ${userId}`);
}

// CLI usage
if (process.argv[2]) {
  seedExercisesForUser(process.argv[2])
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
