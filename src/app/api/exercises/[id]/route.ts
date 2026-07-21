import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { exercises } from "@/db/schema";
import { requireServerSession } from "@/lib/server-auth";
import { and, eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const [row] = await db
    .update(exercises)
    .set({
      name: body.name,
      dayTypes: Array.isArray(body.dayTypes) ? body.dayTypes.join(",") : body.dayTypes,
      targetSets: body.targetSets,
      repRangeMin: body.repRangeMin,
      repRangeMax: body.repRangeMax,
      sortOrder: body.sortOrder,
      isActive: body.isActive,
    })
    .where(and(eq(exercises.id, id), eq(exercises.userId, session.user.id)))
    .returning();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireServerSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  await db
    .update(exercises)
    .set({ isActive: false })
    .where(and(eq(exercises.id, id), eq(exercises.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
