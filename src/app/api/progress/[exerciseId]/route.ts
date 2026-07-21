import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sets, sessionExercises, workoutSessions, exercises } from "@/db/schema";
import { requireServerSession } from "@/lib/server-auth";
import { and, eq, desc, inArray } from "drizzle-orm";

/**
 * GET /api/progress/[exerciseId]
 * Returns historical sets for this exercise across all sessions, newest first.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { exerciseId } = await params;

  // Verify exercise belongs to user
  const [exercise] = await db
    .select()
    .from(exercises)
    .where(
      and(eq(exercises.id, exerciseId), eq(exercises.userId, session.user.id))
    );

  if (!exercise) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find ALL exercises with this exact name for this user (to merge heavy/volume variants)
  const matchingExercises = await db
    .select({ id: exercises.id })
    .from(exercises)
    .where(
      and(eq(exercises.name, exercise.name), eq(exercises.userId, session.user.id))
    );
  const matchingIds = matchingExercises.map((e) => e.id);

  // Get all session exercises for ANY of these exerciseIds
  const sesExercises = await db
    .select({
      sessionExerciseId: sessionExercises.id,
      sessionId: sessionExercises.sessionId,
      date: workoutSessions.date,
      bodweightKg: workoutSessions.bodweightKg,
    })
    .from(sessionExercises)
    .innerJoin(
      workoutSessions,
      eq(sessionExercises.sessionId, workoutSessions.id)
    )
    .where(
      and(
        inArray(sessionExercises.exerciseId, matchingIds),
        eq(workoutSessions.userId, session.user.id)
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
      id: exercise.id,
      name: exercise.name,
      targetSets: exercise.targetSets,
      repRangeMin: exercise.repRangeMin,
      repRangeMax: exercise.repRangeMax,
    },
    history,
  });
}
