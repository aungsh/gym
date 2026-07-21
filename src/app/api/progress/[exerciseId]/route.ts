import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sets, sessionExercises, workoutSessions, exercises } from "@/db/schema";
import { requireServerSession } from "@/lib/server-auth";
import { and, eq, inArray, desc } from "drizzle-orm";

/**
 * GET /api/progress/[exerciseId]
 *
 * exerciseId can be an actual UUID OR a URL-encoded exercise name.
 * When it looks like a name (not a UUID), we look up by name and aggregate
 * ALL sessions across every exercise variant that shares that name (e.g.
 * "Back Squat" on lower_tue and lower_sat are grouped together).
 *
 * The response exercise metadata comes from the first matching exercise found.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exerciseId } = await params;
  const userId = session.user.id;

  // Determine if the param is a UUID or a name
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exerciseId);
  const decodedName = decodeURIComponent(exerciseId);

  // Find all exercise rows for this user that match (by ID or by name)
  let matchingExercises = await db
    .select()
    .from(exercises)
    .where(
      isUUID
        ? and(eq(exercises.id, exerciseId), eq(exercises.userId, userId))
        : and(eq(exercises.name, decodedName), eq(exercises.userId, userId))
    );

  if (matchingExercises.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Use the first match as the "canonical" exercise for display metadata
  const canonicalExercise = matchingExercises[0];
  const exerciseIds = matchingExercises.map((e) => e.id);

  // Get all session exercises across all matching exercise IDs
  const sesExercises = await db
    .select({
      sessionExerciseId: sessionExercises.id,
      sessionId: sessionExercises.sessionId,
      date: workoutSessions.date,
      dayType: workoutSessions.dayType,
      bodweightKg: workoutSessions.bodweightKg,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(sessionExercises.sessionId, workoutSessions.id)
    )
    .where(
      and(
        inArray(sessionExercises.exerciseId, exerciseIds),
        eq(workoutSessions.userId, userId)
      )
    )
    .orderBy(desc(workoutSessions.date));

  // Get all sets for each session exercise
  const history = await Promise.all(
    sesExercises.map(async (se) => {
      const setRows = await db
        .select()
        .from(sets)
        .where(eq(sets.sessionExerciseId, se.sessionExerciseId))
        .orderBy(sets.setNumber);
      return {
        date: se.date,
        dayType: se.dayType,
        sessionId: se.sessionId,
        sets: setRows.map((s) => ({
          setNumber: s.setNumber,
          weightKg: s.weightKg,
          reps: s.reps,
        })),
        maxWeight: Math.max(...setRows.map((s) => s.weightKg), 0),
        totalVolume: setRows.reduce((acc, s) => acc + s.weightKg * s.reps, 0),
        avgReps:
          setRows.length > 0
            ? setRows.reduce((acc, s) => acc + s.reps, 0) / setRows.length
            : 0,
      };
    })
  );

  return NextResponse.json({
    exercise: {
      id: canonicalExercise.id,
      name: canonicalExercise.name,
      targetSets: canonicalExercise.targetSets,
      repRangeMin: canonicalExercise.repRangeMin,
      repRangeMax: canonicalExercise.repRangeMax,
    },
    history,
  });
}
