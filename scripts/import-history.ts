/**
 * Import historical workout data from messy-workout-history.txt
 * Run with: npx tsx --env-file=.env.local scripts/import-history.ts
 *
 * Logic:
 * - Exercises are mapped to canonical names (matching seed.ts)
 * - Warmup sets are skipped
 * - Drop/combo sets ("50kgx12, 45kgx8") only take the first entry
 * - "41kkgx14" typo → 41kg
 * - Exercises not in the seed get created as standalone entries
 * - Sessions before 14/07 get an inferred dayType based on the exercises logged
 */

import { db } from "../src/db/index";
import {
  users,
  exercises,
  workoutSessions,
  sessionExercises,
  sets,
} from "../src/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Name normalisation ──────────────────────────────────────────────────────

/** Map any spelling variant from the history file to a canonical exercise name */
function canonicaliseName(raw: string): string | null {
  const n = raw.trim().toLowerCase();

  if (n.includes("incline dumbbell bench")) return "Incline Dumbbell Bench Press";
  if (n.includes("smith machine incline") || n.includes("smith machine incline bench")) return "Smith Machine Incline Bench Press";
  if (n.includes("pec fly")) return "Pec Fly Machine";
  if (n.includes("dumbbell shoulder press") || n.includes("dumbbell shoulder press")) return "Seated Dumbbell Shoulder Press";
  if (n.includes("seated dumbbell shoulder")) return "Seated Dumbbell Shoulder Press";
  if (n.includes("dumbbell shoulder")) return "Seated Dumbbell Shoulder Press";
  if (n.includes("seated incline dumb") || n.includes("seated dumbbell curl") || n.includes("seated dumbell curl") || n.includes("dumbell curls") || n.includes("dumbbell curls") || n.includes("incline dumbbell curl")) return "Incline Dumbbell Curl";
  if (n.includes("bicep curl machine")) return "Bicep Curl Machine";
  if (n.includes("lateral raise") || n.includes("lateral raises")) return "Cable Lateral Raise";
  if (n.includes("reverse cable fly") || n.includes("rear delt fly")) return "Rear Delt Fly";
  if (n.includes("squat")) return "Back Squat";
  if (n.includes("leg extension")) return "Leg Extension";
  if (n.includes("seated leg curl")) return "Seated Leg Curl";
  if (n.includes("lat pulldown") || n === "lat pulldown") return "Lat Pulldown";
  if (n.includes("seated cable row")) return "Seated Cable Row";
  if (n.includes("t bar row") || n.includes("t-bar row")) return "T-Bar Row";
  if (n.includes("tricep pushdown") || n.includes("triceps pushdown")) return "Cable Triceps Pushdown";
  if (n.includes("overhead cable tricep")) return "Overhead Cable Triceps Extension";
  if (n.includes("cable lat pullover") || n.includes("straight arm cable")) return "Straight Arm Cable Pullover";
  if (n.includes("back extension")) return "Back Extension";
  if (n.includes("rdl") || n.includes("sldl") || n.includes("romanian") || n.includes("stiff leg")) return "Romanian Deadlift";
  if (n.includes("calf raise") || n.includes("calf raises")) return "Standing Calf Raise";
  if (n.includes("decline ab") || n.includes("decline crunch")) return "Weighted Decline Crunch";
  if (n.includes("machine / cable row") || n.includes("machine/cable row")) return "Machine / Cable Row";

  // Skip these
  if (n.includes("plank") || n.includes("treadmill")) return null;

  return null; // Unknown — skip
}

// ─── Set line parser ─────────────────────────────────────────────────────────

interface ParsedSet {
  weightKg: number;
  reps: number;
}

function parseSetLine(line: string): ParsedSet | null {
  // Strip leading "1. ", "2. " etc and trailing notes in parens
  let s = line.replace(/^\d+\.\s*/, "").trim();
  // Remove parenthetical notes like "(warmup)", "(bad reps)", "(too little rest)", "(just checking...)"
  s = s.replace(/\(.*?\)/g, "").trim();
  // Mark warmup
  if (/warmup/i.test(s)) return null;
  // Take only the first part if it's a combo/drop set (e.g. "50kgx12, 45kgx8")
  s = s.split(",")[0].trim();
  // Fix double-k typo e.g. "41kkg"
  s = s.replace(/kkgx/gi, "kgx");
  // Match e.g. "80kgx8", "57.5kgx8", "40.5kgx6", "0kgx10"
  const m = s.match(/^([\d.]+)\s*kg\s*x\s*(\d+)/i);
  if (!m) return null;
  const weightKg = parseFloat(m[1]);
  const reps = parseInt(m[2]);
  if (isNaN(weightKg) || isNaN(reps) || reps <= 0) return null;
  return { weightKg, reps };
}

// ─── Structured workout data ─────────────────────────────────────────────────

type DayType = "legs" | "push" | "pull" | "upper";


interface SessionData {
  date: string;           // YYYY-MM-DD
  dayType: DayType;
  bodweightKg: number | null;
  exercises: {
    rawName: string;
    sets: ParsedSet[];
  }[];
}

// Hand-parsed from messy-workout-history.txt
// Pre-split sessions get the best-fit dayType for historical grouping.
const SESSIONS: SessionData[] = [
  // ── 23/06/2026 ─ Push-like (pre-split) ──────────────────────────────────
  {
    date: "2026-06-23",
    dayType: "push" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Incline dumbbell bench press",
        sets: [
          { weightKg: 18, reps: 9 },
          { weightKg: 20, reps: 6 },
          { weightKg: 20, reps: 6 },
        ],
      },
      {
        rawName: "Seated Dumbbell shoulder press",
        sets: [
          { weightKg: 14, reps: 9 },
          { weightKg: 14, reps: 10 },
          { weightKg: 14, reps: 8 },
          { weightKg: 14, reps: 8 },
        ],
      },
      {
        rawName: "Seated dumbbell curls",
        sets: [
          { weightKg: 12, reps: 5 },
          { weightKg: 12, reps: 5 },
          { weightKg: 12, reps: 5 },
        ],
      },
      {
        rawName: "Dumbbell lateral raises",
        sets: [
          { weightKg: 8, reps: 12 },
          { weightKg: 10, reps: 8 },
          { weightKg: 8, reps: 13 },
        ],
      },
      {
        rawName: "Single arm reverse cable fly",
        sets: [
          { weightKg: 5, reps: 17 },
          { weightKg: 9, reps: 9 },
          { weightKg: 9, reps: 9 },
        ],
      },
    ],
  },

  // ── 24/06/2026 ─ Legs (pre-split) ───────────────────────────────────────
  {
    date: "2026-06-24",
    dayType: "legs" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Squats",
        sets: [
          { weightKg: 60, reps: 5 },
          { weightKg: 70, reps: 5 },
          { weightKg: 70, reps: 5 },
          { weightKg: 70, reps: 8 },
        ],
      },
      {
        rawName: "Leg extension",
        sets: [
          { weightKg: 50, reps: 12 },
          { weightKg: 65, reps: 10 },
          { weightKg: 65, reps: 12 },
          { weightKg: 65, reps: 8 }, // first part of drop set
        ],
      },
      {
        rawName: "Seated leg curl",
        sets: [
          { weightKg: 50, reps: 12 },
          { weightKg: 57.5, reps: 8 },
          { weightKg: 50, reps: 10 }, // first part of drop set
        ],
      },
      // Planks skipped
    ],
  },

  // ── 28/06/2026 ─ Pull-like (pre-split) ──────────────────────────────────
  {
    date: "2026-06-28",
    dayType: "pull" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Lat pulldown",
        sets: [
          { weightKg: 36, reps: 6 },
          { weightKg: 45, reps: 8 },
          { weightKg: 45, reps: 10 },
          { weightKg: 50, reps: 8 },
        ],
      },
      {
        rawName: "Seated cable rows",
        sets: [
          { weightKg: 41, reps: 10 },
          { weightKg: 54, reps: 6 },
          { weightKg: 50, reps: 8 },
          { weightKg: 45, reps: 12 },
        ],
      },
      {
        rawName: "Tricep pushdown",
        sets: [
          { weightKg: 32, reps: 8 },
          { weightKg: 41, reps: 6 },
          { weightKg: 41, reps: 4 },
          { weightKg: 32, reps: 10 },
          { weightKg: 32, reps: 10 },
        ],
      },
    ],
  },

  // ── 01/07/2026 ─ Push-like (pre-split) ──────────────────────────────────
  {
    date: "2026-07-01",
    dayType: "push" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Incline dumbbell bench press",
        // set 1 (14kg warmup) skipped
        sets: [
          { weightKg: 20, reps: 6 },
          { weightKg: 20, reps: 7 },
          { weightKg: 20, reps: 6 },
          { weightKg: 20, reps: 5 },
        ],
      },
      {
        rawName: "Seated Dumbbell shoulder press",
        sets: [
          { weightKg: 14, reps: 6 },
          { weightKg: 14, reps: 9 },
          { weightKg: 14, reps: 10 },
          { weightKg: 16, reps: 6 },
        ],
      },
      {
        rawName: "Seated dumbbell curls",
        sets: [
          { weightKg: 12, reps: 6 },
          { weightKg: 12, reps: 7 },
          { weightKg: 12, reps: 5 },
        ],
      },
      {
        rawName: "Single arm cable lateral raises",
        sets: [
          { weightKg: 9, reps: 8 },
          { weightKg: 9, reps: 8 },
          { weightKg: 9, reps: 8 },
        ],
      },
      {
        rawName: "Single arm reverse cable fly",
        sets: [
          { weightKg: 9, reps: 10 },
          { weightKg: 14, reps: 6 },
          { weightKg: 14, reps: 6 },
        ],
      },
      // Treadmill skipped
    ],
  },

  // ── 06/07/2026 ─ Push-like (pre-split) ──────────────────────────────────
  {
    date: "2026-07-06",
    dayType: "push" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Incline dumbbell bench press",
        // set 1 (14kg warmup) skipped
        sets: [
          { weightKg: 20, reps: 7 },
          { weightKg: 20, reps: 7 },
          { weightKg: 20, reps: 5 },
        ],
      },
      {
        rawName: "Seated Dumbbell shoulder press",
        sets: [
          { weightKg: 14, reps: 7 },
          { weightKg: 14, reps: 7 },
          { weightKg: 14, reps: 7 },
        ],
      },
      {
        rawName: "Pec Fly Machine",
        sets: [
          { weightKg: 36, reps: 10 },
          { weightKg: 45, reps: 8 },
          { weightKg: 50, reps: 4 },
        ],
      },
      {
        rawName: "Dumbell Curls",
        sets: [
          { weightKg: 12, reps: 6 },
          { weightKg: 12, reps: 5 },
          { weightKg: 12, reps: 5 },
        ],
      },
      {
        rawName: "Single arm cable lateral raises",
        sets: [
          { weightKg: 9, reps: 10 },
          { weightKg: 11, reps: 10 },
          { weightKg: 11, reps: 6 },
          { weightKg: 11, reps: 8 },
        ],
      },
      {
        rawName: "Single arm reverse cable fly",
        sets: [
          { weightKg: 11, reps: 10 },
          { weightKg: 16, reps: 6 },
          { weightKg: 16, reps: 8 },
        ],
      },
    ],
  },

  // ── 07/07/2026 ─ Pull-like (pre-split) ──────────────────────────────────
  {
    date: "2026-07-07",
    dayType: "pull" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Lat Pulldown",
        sets: [
          { weightKg: 41, reps: 8 },
          { weightKg: 50, reps: 8 },
          { weightKg: 54, reps: 6 },
          { weightKg: 54, reps: 5 },
        ],
      },
      {
        rawName: "Seated Cable Rows",
        sets: [
          { weightKg: 50, reps: 8 },
          { weightKg: 50, reps: 9 },
          { weightKg: 50, reps: 8 },
          { weightKg: 50, reps: 8 },
        ],
      },
      {
        rawName: "Tricep Pushdown",
        sets: [
          { weightKg: 32, reps: 13 },
          { weightKg: 36, reps: 11 },
          { weightKg: 41, reps: 5 }, // first part of drop set
        ],
      },
    ],
  },

  // ── 09/07/2026 ─ Push-like (pre-split) ──────────────────────────────────
  {
    date: "2026-07-09",
    dayType: "push" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Incline dumbbell bench press",
        // set 1 (16kg warmup) skipped
        sets: [
          { weightKg: 20, reps: 7 },
          { weightKg: 20, reps: 6 },
          { weightKg: 20, reps: 5 },
        ],
      },
      {
        rawName: "Seated Dumbbell shoulder press",
        sets: [
          { weightKg: 16, reps: 7 },
          { weightKg: 16, reps: 7 },
          { weightKg: 16, reps: 7 },
        ],
      },
      {
        rawName: "Seated Dumbell Curls",
        sets: [
          { weightKg: 12, reps: 7 },
          { weightKg: 12, reps: 6 },
          { weightKg: 12, reps: 5 },
        ],
      },
      {
        rawName: "Pec Fly Machine",
        sets: [
          { weightKg: 45, reps: 8 },
          { weightKg: 50, reps: 5 },
          { weightKg: 50, reps: 6 },
        ],
      },
      {
        rawName: "Single arm cable lateral raises",
        sets: [
          { weightKg: 9, reps: 10 },
          { weightKg: 9, reps: 8 },
          { weightKg: 9, reps: 8 },
        ],
      },
    ],
  },

  // ── 14/07/2026 ─ Lower (Heavy) — split starts here ───────────────────────
  {
    date: "2026-07-14",
    dayType: "legs" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Squats",
        sets: [
          { weightKg: 60, reps: 8 },
          { weightKg: 70, reps: 10 },
          { weightKg: 80, reps: 5 },
          { weightKg: 80, reps: 9 },
          { weightKg: 80, reps: 6 },
        ],
      },
      {
        rawName: "Leg extension",
        sets: [
          { weightKg: 66, reps: 12 },
          { weightKg: 73, reps: 14 },
          { weightKg: 86, reps: 8 },
        ],
      },
      {
        rawName: "Seated leg curl",
        sets: [
          { weightKg: 59, reps: 14 },
          { weightKg: 68, reps: 9 },
          { weightKg: 77, reps: 6 }, // first part of drop set
        ],
      },
      {
        rawName: "Calf raises",
        sets: [
          { weightKg: 36, reps: 12 },
          { weightKg: 36, reps: 12 },
          { weightKg: 36, reps: 12 },
        ],
      },
      {
        rawName: "Dumbbell sldl",
        sets: [
          { weightKg: 16, reps: 12 },
          { weightKg: 16, reps: 15 },
          { weightKg: 16, reps: 12 },
        ],
      },
      {
        rawName: "Decline ab cunchws",
        sets: [
          { weightKg: 0, reps: 14 },
          { weightKg: 0, reps: 20 },
          { weightKg: 0, reps: 16 },
        ],
      },
    ],
  },

  // ── 15/07/2026 ─ Push (Heavy) ────────────────────────────────────────────
  {
    date: "2026-07-15",
    dayType: "push" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Smith machine incline bench press",
        sets: [
          { weightKg: 41, reps: 8 },
          { weightKg: 51, reps: 4 },
          { weightKg: 46, reps: 6 },
          { weightKg: 46, reps: 7 },
        ],
      },
      {
        rawName: "Pec Fly Machine",
        sets: [
          { weightKg: 45, reps: 8 },
          { weightKg: 52, reps: 5 },
          { weightKg: 52, reps: 5 },
        ],
      },
      {
        rawName: "Seated Dumbbell shoulder press",
        sets: [
          { weightKg: 16, reps: 5 }, // included, user logged it
          { weightKg: 16, reps: 9 },
          { weightKg: 16, reps: 8 },
          { weightKg: 16, reps: 8 },
        ],
      },
      {
        rawName: "Seated Incline Dumbell Curls",
        sets: [
          { weightKg: 12, reps: 7 },
          { weightKg: 12, reps: 7 },
          { weightKg: 12, reps: 7 },
        ],
      },
      {
        rawName: "Single arm cable lateral raises",
        sets: [
          { weightKg: 9, reps: 7 },
          { weightKg: 9, reps: 6 },
          { weightKg: 9, reps: 3 }, // first weight of combo set
        ],
      },
    ],
  },

  // ── 16/07/2026 ─ Pull (Heavy) ────────────────────────────────────────────
  {
    date: "2026-07-16",
    dayType: "pull" as DayType,
    bodweightKg: 66.1,
    exercises: [
      {
        rawName: "Lat pulldown",
        sets: [
          { weightKg: 54, reps: 6 },
          { weightKg: 50, reps: 8 },
          { weightKg: 50, reps: 8 },
          { weightKg: 50, reps: 7 },
        ],
      },
      {
        rawName: "T bar row",
        sets: [
          { weightKg: 38, reps: 8 },
          { weightKg: 38, reps: 8 },
          { weightKg: 42, reps: 5 },
          { weightKg: 40.5, reps: 6 },
        ],
      },
      {
        rawName: "Seated Cable row",
        sets: [
          { weightKg: 50, reps: 6 },
          { weightKg: 45, reps: 6 },
          { weightKg: 45, reps: 6 },
        ],
      },
      {
        rawName: "Cable lat pullover",
        sets: [
          { weightKg: 27, reps: 13 },
          { weightKg: 27, reps: 10 },
          { weightKg: 27, reps: 10 },
        ],
      },
      {
        rawName: "Overhead cable tricep extension",
        sets: [
          { weightKg: 23, reps: 12 },
          { weightKg: 23, reps: 12 },
          { weightKg: 23, reps: 11 },
        ],
      },
      {
        rawName: "Tricep pushdown",
        sets: [
          { weightKg: 36, reps: 8 },
          { weightKg: 36, reps: 7 },
          { weightKg: 36, reps: 6 },
        ],
      },
      {
        rawName: "Barbell Back extension",
        sets: [
          { weightKg: 40, reps: 10 },
          { weightKg: 40, reps: 15 },
          { weightKg: 40, reps: 12 },
        ],
      },
    ],
  },

  // ── 18/07/2026 ─ Lower (Sat Volume) ─────────────────────────────────────
  {
    date: "2026-07-18",
    dayType: "legs" as DayType,
    bodweightKg: 65.7,
    exercises: [
      {
        rawName: "Squat",
        sets: [
          { weightKg: 60, reps: 8 },
          { weightKg: 80, reps: 8 },
          { weightKg: 80, reps: 8 },
          { weightKg: 80, reps: 6 },
        ],
      },
      {
        rawName: "Rdl",
        sets: [
          { weightKg: 60, reps: 8 },
          { weightKg: 80, reps: 6 },
          { weightKg: 80, reps: 5 },
        ],
      },
      {
        rawName: "Leg extension",
        sets: [
          { weightKg: 73, reps: 12 },
          { weightKg: 73, reps: 12 },
          { weightKg: 73, reps: 12 },
        ],
      },
      {
        rawName: "Seated leg curl",
        sets: [
          { weightKg: 68, reps: 10 },
          { weightKg: 68, reps: 10 },
          { weightKg: 64, reps: 10 },
        ],
      },
      {
        rawName: "Calf raises",
        sets: [
          { weightKg: 27, reps: 15 },
          { weightKg: 45, reps: 15 },
          { weightKg: 45, reps: 15 },
        ],
      },
      {
        rawName: "Decline ab crunches",
        sets: [
          { weightKg: 0, reps: 10 },
          { weightKg: 0, reps: 10 },
          { weightKg: 0, reps: 10 },
        ],
      },
    ],
  },

  // ── 19/07/2026 ─ Upper (Volume) ──────────────────────────────────────────
  {
    date: "2026-07-19",
    dayType: "upper" as DayType,
    bodweightKg: 66.0,
    exercises: [
      {
        rawName: "Smith machine incline bench press",
        sets: [
          { weightKg: 41, reps: 10 },
          { weightKg: 51, reps: 5 },
          { weightKg: 46, reps: 8 },
          { weightKg: 46, reps: 6 },
        ],
      },
      {
        rawName: "Lat pulldown",
        sets: [
          { weightKg: 45, reps: 12 },
          { weightKg: 45, reps: 10 },
          { weightKg: 45, reps: 10 },
        ],
      },
      {
        rawName: "Seated cable rows",
        sets: [
          { weightKg: 45, reps: 9 },
          { weightKg: 41, reps: 12 },
          { weightKg: 41, reps: 11 },
        ],
      },
      {
        rawName: "Pec fly machine",
        sets: [
          { weightKg: 41, reps: 14 }, // "41kkgx14" typo fixed
          { weightKg: 41, reps: 8 },
          { weightKg: 41, reps: 10 },
        ],
      },
      {
        rawName: "Dumbbell shoulder press",
        sets: [
          { weightKg: 14, reps: 12 },
          { weightKg: 14, reps: 12 },
          { weightKg: 14, reps: 10 },
        ],
      },
      {
        rawName: "Single arm cable lateral raises",
        sets: [
          { weightKg: 9, reps: 6 }, // first weight of combo sets
          { weightKg: 9, reps: 5 },
          { weightKg: 9, reps: 4 },
        ],
      },
      {
        rawName: "Single arm reverse cable fly",
        sets: [
          { weightKg: 9, reps: 9 },
          { weightKg: 9, reps: 10 },
          { weightKg: 9, reps: 12 },
        ],
      },
      {
        rawName: "Bicep curl machine",
        sets: [
          { weightKg: 27, reps: 10 },
          { weightKg: 25, reps: 8 },
          { weightKg: 23, reps: 10 },
        ],
      },
      {
        rawName: "Overhead cable tricep extension",
        sets: [
          { weightKg: 23, reps: 12 },
          { weightKg: 27, reps: 10 },
          { weightKg: 27, reps: 6 },
        ],
      },
    ],
  },

  // ── 21/07/2026 ─ Lower (Heavy) ───────────────────────────────────────────
  {
    date: "2026-07-21",
    dayType: "legs" as DayType,
    bodweightKg: null,
    exercises: [
      {
        rawName: "Squats",
        sets: [
          { weightKg: 60, reps: 6 },
          { weightKg: 80, reps: 8 },
          { weightKg: 80, reps: 5 },
          { weightKg: 80, reps: 6 },
          { weightKg: 80, reps: 8 },
        ],
      },
      {
        rawName: "Rdl",
        sets: [
          { weightKg: 60, reps: 6 },
          { weightKg: 80, reps: 7 },
          { weightKg: 80, reps: 7 },
          { weightKg: 80, reps: 5 },
        ],
      },
      {
        rawName: "Leg Extension",
        sets: [
          { weightKg: 77, reps: 12 },
          { weightKg: 77, reps: 13 },
          { weightKg: 77, reps: 15 },
        ],
      },
      {
        rawName: "Seated leg curl",
        sets: [
          { weightKg: 68, reps: 10 },
          { weightKg: 68, reps: 10 },
          { weightKg: 68, reps: 8 },
        ],
      },
      {
        rawName: "Standing calf raises",
        sets: [
          { weightKg: 54, reps: 12 },
          { weightKg: 54, reps: 12 },
          { weightKg: 54, reps: 13 },
        ],
      },
      {
        rawName: "Decline ab crunches",
        sets: [
          { weightKg: 0, reps: 8 },
          { weightKg: 0, reps: 8 },
          { weightKg: 0, reps: 8 },
        ],
      },
    ],
  },
];

// ─── DB insertion ────────────────────────────────────────────────────────────

async function findOrCreateExercise(
  userId: string,
  canonicalName: string,
  dayType: DayType
): Promise<string> {
  const existing = await db
    .select()
    .from(exercises)
    .where(and(eq(exercises.userId, userId), eq(exercises.name, canonicalName)));

  if (existing.length > 0) return existing[0].id;

  // Create it — used for pre-split exercises not in the seed
  const inserted = await db
    .insert(exercises)
    .values({
      userId,
      name: canonicalName,
      dayTypes: dayType,
      targetSets: 3,
      repRangeMin: 8,
      repRangeMax: 12,
      sortOrder: 99,
      isActive: true,
    })
    .returning();

  console.log(`  Created new exercise: ${canonicalName}`);
  return inserted[0].id;
}

async function main() {
  // Get the single user
  const allUsers = await db.select().from(users);
  if (allUsers.length === 0) {
    console.error("No users in the database. Log in first.");
    process.exit(1);
  }
  const user = allUsers[0];
  console.log(`Importing for user: ${user.email} (${user.id})\n`);

  // First seed the standard exercises
  const { seedExercisesForUser } = await import("../src/db/seed");
  await seedExercisesForUser(user.id);
  console.log("");

  for (const session of SESSIONS) {
    console.log(`Processing ${session.date} (${session.dayType})...`);

    // Insert workout session
    const [ws] = await db
      .insert(workoutSessions)
      .values({
        userId: user.id,
        date: session.date,
        dayType: session.dayType,
        bodweightKg: session.bodweightKg ?? null,
        notes: null,
      })
      .returning();

    for (let exIdx = 0; exIdx < session.exercises.length; exIdx++) {
      const ex = session.exercises[exIdx];
      const canonicalName = canonicaliseName(ex.rawName);
      if (!canonicalName) {
        console.log(`  Skipped: ${ex.rawName}`);
        continue;
      }
      if (ex.sets.length === 0) continue;

      const exerciseId = await findOrCreateExercise(user.id, canonicalName, session.dayType);

      const [se] = await db
        .insert(sessionExercises)
        .values({
          sessionId: ws.id,
          exerciseId,
          sortOrder: exIdx,
        })
        .returning();

      const setRows = ex.sets.map((s, i) => ({
        sessionExerciseId: se.id,
        setNumber: i + 1,
        weightKg: s.weightKg,
        reps: s.reps,
      }));

      await db.insert(sets).values(setRows);
      console.log(`  ✓ ${canonicalName} — ${setRows.length} sets`);
    }
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
