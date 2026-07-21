import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { workoutSessions, sessionExercises, sets, exercises } from "@/db/schema";
import { requireServerSession } from "@/lib/server-auth";
import { and, eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const wSessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, session.user.id))
    .orderBy(desc(workoutSessions.date))
    .limit(limit);

  return NextResponse.json(wSessions);
}

export async function POST(req: NextRequest) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, dayType, bodweightKg, notes, sessionExercisesData } = body;

  // 1. Create workout session
  const [wSession] = await db
    .insert(workoutSessions)
    .values({
      userId: session.user.id,
      date: date ?? new Date().toISOString().split("T")[0],
      dayType,
      bodweightKg: bodweightKg ?? null,
      notes: notes ?? null,
    })
    .returning();

  // 2. Create session exercises + sets
  if (sessionExercisesData?.length) {
    for (const se of sessionExercisesData) {
      const [sessionEx] = await db
        .insert(sessionExercises)
        .values({
          sessionId: wSession.id,
          exerciseId: se.exerciseId,
          sortOrder: se.sortOrder ?? 0,
        })
        .returning();

      if (se.sets?.length) {
        await db.insert(sets).values(
          se.sets.map(
            (s: { weightKg: number; reps: number; notes?: string }, i: number) => ({
              sessionExerciseId: sessionEx.id,
              setNumber: i + 1,
              weightKg: s.weightKg,
              reps: s.reps,
              notes: s.notes ?? null,
            })
          )
        );
      }
    }
  }

  return NextResponse.json(wSession, { status: 201 });
}
