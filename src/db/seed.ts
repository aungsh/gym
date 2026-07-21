/**
 * Seed script — run with:
 *   npx tsx src/db/seed.ts <userId>
 *
 * Seeds all exercises from CONTEXT.md for the given user.
 * Also called automatically on first login via the API.
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
  // ── Tuesday: Lower (Heavy) ─────────────────────────────────────
  {
    name: "Back Squat",
    dayTypes: ["lower_tue"],
    targetSets: 4,
    repRangeMin: 6,
    repRangeMax: 8,
    sortOrder: 1,
  },
  {
    name: "Romanian Deadlift",
    dayTypes: ["lower_tue"],
    targetSets: 3,
    repRangeMin: 6,
    repRangeMax: 8,
    sortOrder: 2,
  },
  {
    name: "Leg Extension",
    dayTypes: ["lower_tue"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 3,
  },
  {
    name: "Seated Leg Curl",
    dayTypes: ["lower_tue"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 4,
  },
  {
    name: "Standing Calf Raise",
    dayTypes: ["lower_tue"],
    targetSets: 3, // 3-4
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 5,
  },
  {
    name: "Weighted Decline Crunch",
    dayTypes: ["lower_tue"],
    targetSets: 3,
    repRangeMin: 15,
    repRangeMax: 20,
    sortOrder: 6,
  },

  // ── Wednesday: Push (Heavy) ────────────────────────────────────
  {
    name: "Smith Machine Incline Bench Press",
    dayTypes: ["push_wed"],
    targetSets: 3, // 3-4
    repRangeMin: 6,
    repRangeMax: 8,
    sortOrder: 1,
  },
  {
    name: "Pec Fly Machine",
    dayTypes: ["push_wed"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 2,
  },
  {
    name: "Seated Dumbbell Shoulder Press",
    dayTypes: ["push_wed"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 3,
  },
  {
    name: "Cable Lateral Raise",
    dayTypes: ["push_wed"],
    targetSets: 3, // 3-4
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 4,
  },
  {
    name: "Incline Dumbbell Curl",
    dayTypes: ["push_wed"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 12,
    sortOrder: 5,
  },
  {
    name: "Bicep Curl Machine",
    dayTypes: ["push_wed"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 6,
  },

  // ── Thursday: Pull (Heavy) ─────────────────────────────────────
  {
    name: "Lat Pulldown",
    dayTypes: ["pull_thu"],
    targetSets: 3, // 3-4
    repRangeMin: 6,
    repRangeMax: 8,
    sortOrder: 1,
  },
  {
    name: "T-Bar Row",
    dayTypes: ["pull_thu"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 2,
  },
  {
    name: "Seated Cable Row",
    dayTypes: ["pull_thu"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 3,
  },
  {
    name: "Straight Arm Cable Pullover",
    dayTypes: ["pull_thu"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 15,
    sortOrder: 4,
  },
  {
    name: "Overhead Cable Triceps Extension",
    dayTypes: ["pull_thu"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 15,
    sortOrder: 5,
  },
  {
    name: "Cable Triceps Pushdown",
    dayTypes: ["pull_thu"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 6,
  },
  {
    name: "Back Extension",
    dayTypes: ["pull_thu"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 15,
    sortOrder: 7,
  },

  // ── Saturday: Lower (Volume) ───────────────────────────────────
  {
    name: "Back Squat",
    dayTypes: ["lower_sat"],
    targetSets: 4,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 1,
  },
  {
    name: "Romanian Deadlift",
    dayTypes: ["lower_sat"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 2,
  },
  {
    name: "Leg Extension",
    dayTypes: ["lower_sat"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 3,
  },
  {
    name: "Seated Leg Curl",
    dayTypes: ["lower_sat"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 4,
  },
  {
    name: "Standing Calf Raise",
    dayTypes: ["lower_sat"],
    targetSets: 3, // 3-4
    repRangeMin: 15,
    repRangeMax: 20,
    sortOrder: 5,
  },
  {
    name: "Weighted Decline Crunch",
    dayTypes: ["lower_sat"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 15,
    sortOrder: 6,
  },

  // ── Sunday: Upper (Volume) ─────────────────────────────────────
  {
    name: "Smith Machine Incline Bench Press",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 8,
    repRangeMax: 10,
    sortOrder: 1,
  },
  {
    name: "Lat Pulldown",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 2,
  },
  {
    name: "Machine / Cable Row",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 3,
  },
  {
    name: "Pec Fly Machine",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 4,
  },
  {
    name: "Seated Dumbbell Shoulder Press",
    dayTypes: ["upper_sun"],
    targetSets: 2, // 2-3
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 5,
  },
  {
    name: "Cable Lateral Raise",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 6,
  },
  {
    name: "Rear Delt Fly",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 12,
    repRangeMax: 15,
    sortOrder: 7,
  },
  {
    name: "Bicep Curl Machine / EZ Curl",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 10,
    repRangeMax: 12,
    sortOrder: 8,
  },
  {
    name: "Overhead Cable Triceps Extension",
    dayTypes: ["upper_sun"],
    targetSets: 3,
    repRangeMin: 10,
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
