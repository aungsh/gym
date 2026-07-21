import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { requireServerSession } from "@/lib/server-auth";
import { and, eq } from "drizzle-orm";
import { seedExercisesForUser } from "@/db/seed";

export async function GET(req: NextRequest) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const includeArchived = searchParams.get("includeArchived") === "true";

  const rows = await db
    .select()
    .from(exercises)
    .where(
      includeArchived
        ? and(eq(exercises.userId, session.user.id), eq(exercises.isActive, false))
        : and(eq(exercises.userId, session.user.id), eq(exercises.isActive, true))
    )
    .orderBy(exercises.sortOrder);

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Special action: seed default exercises
  if (body.action === "seed") {
    await seedExercisesForUser(session.user.id);
    const rows = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.userId, session.user.id), eq(exercises.isActive, true)))
      .orderBy(exercises.sortOrder);
    return NextResponse.json(rows);
  }

  const { name, dayTypes, targetSets, repRangeMin, repRangeMax, sortOrder } = body;

  const [row] = await db
    .insert(exercises)
    .values({
      userId: session.user.id,
      name,
      dayTypes: Array.isArray(dayTypes) ? dayTypes.join(",") : dayTypes,
      targetSets: targetSets ?? 3,
      repRangeMin: repRangeMin ?? 8,
      repRangeMax: repRangeMax ?? 12,
      sortOrder: sortOrder ?? 0,
    })
    .returning();

  return NextResponse.json(row, { status: 201 });
}
