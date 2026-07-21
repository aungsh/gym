import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workoutSessions, sessionExercises, sets, exercises } from "@/db/schema";
import { requireServerSession } from "@/lib/server-auth";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [wSession] = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, id),
        eq(workoutSessions.userId, session.user.id)
      )
    );

  if (!wSession) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Fetch session exercises + sets
  const sesExercises = await db
    .select({
      id: sessionExercises.id,
      exerciseId: sessionExercises.exerciseId,
      sortOrder: sessionExercises.sortOrder,
      exerciseName: exercises.name,
      targetSets: exercises.targetSets,
      repRangeMin: exercises.repRangeMin,
      repRangeMax: exercises.repRangeMax,
    })
    .from(sessionExercises)
    .innerJoin(exercises, eq(sessionExercises.exerciseId, exercises.id))
    .where(eq(sessionExercises.sessionId, id))
    .orderBy(sessionExercises.sortOrder);

  const sesWithSets = await Promise.all(
    sesExercises.map(async (se) => {
      const setRows = await db
        .select()
        .from(sets)
        .where(eq(sets.sessionExerciseId, se.id))
        .orderBy(sets.setNumber);
      return { ...se, sets: setRows };
    })
  );

  return NextResponse.json({ ...wSession, exercises: sesWithSets });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .delete(workoutSessions)
    .where(
      and(
        eq(workoutSessions.id, id),
        eq(workoutSessions.userId, session.user.id)
      )
    );

  return NextResponse.json({ success: true });
}
