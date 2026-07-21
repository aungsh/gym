/**
 * Core progression logic based on CONTEXT.md:
 * - Progress reps first: hit the TOP of the rep range on ALL sets before increasing weight.
 * - Small improvements every week preferred over large jumps.
 */

export type ProgressionStatus = "increase" | "progressing" | "below_target" | "not_enough_data";

export interface SetEntry {
  weightKg: number;
  reps: number;
}

export interface ProgressionResult {
  status: ProgressionStatus;
  message: string;
  /** The weight to use next session */
  nextWeightKg?: number;
}

/**
 * Evaluate the current session's sets against the exercise targets.
 */
export function evaluateProgression(
  sets: SetEntry[],
  targetSets: number,
  repRangeMin: number,
  repRangeMax: number
): ProgressionResult {
  if (sets.length === 0) {
    return { status: "not_enough_data", message: "No sets logged yet." };
  }

  const completedSets = sets.filter((s) => s.reps > 0 && s.weightKg > 0);

  if (completedSets.length < targetSets) {
    const remaining = targetSets - completedSets.length;
    return {
      status: "progressing",
      message: `${remaining} set${remaining > 1 ? "s" : ""} remaining.`,
    };
  }

  // Check if all sets hit the top of the rep range
  const allHitMax = completedSets.every((s) => s.reps >= repRangeMax);
  const allAboveMin = completedSets.every((s) => s.reps >= repRangeMin);
  const anyBelowMin = completedSets.some((s) => s.reps < repRangeMin);

  if (allHitMax) {
    return {
      status: "increase",
      message: `All ${targetSets} sets hit ${repRangeMax}+ reps. Time to increase the weight.`,
    };
  }

  if (allAboveMin) {
    const lowestReps = Math.min(...completedSets.map((s) => s.reps));
    const targetRep = repRangeMax;
    return {
      status: "progressing",
      message: `Solid session. Keep this weight until all sets reach ${targetRep} reps. Weakest set: ${lowestReps} reps.`,
    };
  }

  if (anyBelowMin) {
    const belowCount = completedSets.filter((s) => s.reps < repRangeMin).length;
    return {
      status: "below_target",
      message: `${belowCount} set${belowCount > 1 ? "s" : ""} below ${repRangeMin} reps. Maintain this weight and focus on quality.`,
    };
  }

  return {
    status: "progressing",
    message: `Keep going. Target: ${targetSets} × ${repRangeMin}–${repRangeMax}.`,
  };
}

/**
 * Look at historical sessions for an exercise and give a recommendation.
 */
export interface HistoricalSession {
  date: string;
  sets: SetEntry[];
}

export function getProgressionRecommendation(
  history: HistoricalSession[],
  targetSets: number,
  repRangeMin: number,
  repRangeMax: number
): string {
  if (history.length === 0) {
    return "No history yet. Log your first session to start tracking.";
  }

  const recent = history.slice(-4); // look at last 4 sessions

  const recentResults = recent.map((h) =>
    evaluateProgression(h.sets, targetSets, repRangeMin, repRangeMax)
  );

  const consecutiveIncrease = recentResults.filter(
    (r) => r.status === "increase"
  ).length;

  if (consecutiveIncrease >= 1) {
    return `You've hit the top of your rep range. Ready to increase weight next session.`;
  }

  const recentProgressing = recentResults.filter(
    (r) => r.status === "progressing" || r.status === "increase"
  ).length;

  if (recentProgressing === recent.length) {
    return "Consistent progress. Keep at it — you'll hit the target rep range soon.";
  }

  return "Stay at the current weight. Focus on getting every set within the rep range before increasing.";
}

/** Map status to a colour token */
export function statusToColor(status: ProgressionStatus) {
  switch (status) {
    case "increase":
      return "text-[oklch(0.87_0.22_130)]"; // lime green
    case "progressing":
      return "text-[oklch(0.85_0.16_85)]"; // amber
    case "below_target":
      return "text-destructive";
    case "not_enough_data":
      return "text-muted-foreground";
  }
}

export function statusToLabel(status: ProgressionStatus) {
  switch (status) {
    case "increase":
      return "Increase weight";
    case "progressing":
      return "Keep going";
    case "below_target":
      return "Below target";
    case "not_enough_data":
      return "Log sets";
  }
}
