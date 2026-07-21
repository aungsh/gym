"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  evaluateProgression,
  statusToColor,
  statusToLabel,
  type SetEntry,
} from "@/lib/progression";
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Suspense } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Exercise {
  id: string;
  name: string;
  dayTypes: string;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  sortOrder: number;
}

interface SetRow {
  id: string;
  weightKg: string;
  reps: string;
}

interface ExerciseLog {
  exercise: Exercise;
  sets: SetRow[];
  expanded: boolean;
}

// ─── Day config ──────────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { value: "lower_tue", label: "Lower", sub: "Tue" },
  { value: "push_wed", label: "Push", sub: "Wed" },
  { value: "pull_thu", label: "Pull", sub: "Thu" },
  { value: "lower_sat", label: "Lower", sub: "Sat" },
  { value: "upper_sun", label: "Upper", sub: "Sun" },
];

function getTodayDayType(): string {
  const day = new Date().getDay();
  const map: Record<number, string> = {
    2: "lower_tue",
    3: "push_wed",
    4: "pull_thu",
    6: "lower_sat",
    0: "upper_sun",
  };
  return map[day] ?? "lower_tue";
}

function newSet(weightKg = ""): SetRow {
  return { id: crypto.randomUUID(), weightKg, reps: "" };
}

// ─── Main page ───────────────────────────────────────────────────────────────

function LogWorkoutContent() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramDay = searchParams.get("day");
  const [dayType, setDayType] = useState<string>(paramDay ?? getTodayDayType());
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [bodyweight, setBodyweight] = useState("");
  const [notes, setNotes] = useState("");
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Redirect if not authed
  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [session, isPending, router]);

  // Load exercises
  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((data: Exercise[]) => {
        if (Array.isArray(data)) setAllExercises(data);
      });
  }, []);

  // Filter by day type and build logs
  useEffect(() => {
    const dayExercises = allExercises.filter((e) =>
      e.dayTypes.split(",").includes(dayType)
    );
    setExerciseLogs(
      dayExercises.map((ex) => ({
        exercise: ex,
        sets: Array.from({ length: ex.targetSets }, () => newSet()),
        expanded: true,
      }))
    );
  }, [dayType, allExercises]);

  async function handleSeedExercises() {
    setSeeding(true);
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seed" }),
    });
    const data = await res.json();
    if (Array.isArray(data)) setAllExercises(data);
    setSeeding(false);
  }

  const updateSet = useCallback(
    (exIdx: number, setIdx: number, field: "weightKg" | "reps", value: string) => {
      setExerciseLogs((prev) => {
        const next = [...prev];
        next[exIdx] = {
          ...next[exIdx],
          sets: next[exIdx].sets.map((s, i) =>
            i === setIdx ? { ...s, [field]: value } : s
          ),
        };
        return next;
      });
    },
    []
  );

  const addSet = useCallback((exIdx: number) => {
    setExerciseLogs((prev) => {
      const next = [...prev];
      const lastSet = next[exIdx].sets[next[exIdx].sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [...next[exIdx].sets, newSet(lastSet?.weightKg ?? "")],
      };
      return next;
    });
  }, []);

  const removeSet = useCallback((exIdx: number, setIdx: number) => {
    setExerciseLogs((prev) => {
      const next = [...prev];
      if (next[exIdx].sets.length <= 1) return prev;
      next[exIdx] = {
        ...next[exIdx],
        sets: next[exIdx].sets.filter((_, i) => i !== setIdx),
      };
      return next;
    });
  }, []);

  const toggleExpand = useCallback((exIdx: number) => {
    setExerciseLogs((prev) =>
      prev.map((el, i) =>
        i === exIdx ? { ...el, expanded: !el.expanded } : el
      )
    );
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const sessionExercisesData = exerciseLogs
        .filter((el) =>
          el.sets.some((s) => s.weightKg && s.reps)
        )
        .map((el, i) => ({
          exerciseId: el.exercise.id,
          sortOrder: i,
          sets: el.sets
            .filter((s) => s.weightKg && s.reps)
            .map((s) => ({
              weightKg: parseFloat(s.weightKg),
              reps: parseInt(s.reps),
            })),
        }));

      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          dayType,
          bodweightKg: bodyweight ? parseFloat(bodyweight) : null,
          notes: notes || null,
          sessionExercisesData,
        }),
      });

      setSaved(true);
      setTimeout(() => router.push("/history"), 1200);
    } finally {
      setSaving(false);
    }
  }

  if (isPending || !session) return null;

  const noExercises = allExercises.length === 0;

  return (
    <div className="pt-10 pb-8 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          New session
        </h2>
        <h1 className="text-3xl font-bold tracking-tight">Log workout</h1>
      </div>

      {/* Date + bodyweight row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label
            htmlFor="workout-date"
            className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
          >
            Date
          </label>
          <Input
            id="workout-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="font-mono h-12 sm:h-9 text-base sm:text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="bodyweight"
            className="text-xs font-mono uppercase tracking-widest text-muted-foreground"
          >
            Bodyweight (kg)
          </label>
          <Input
            id="bodyweight"
            type="number"
            inputMode="decimal"
            placeholder="66.0"
            value={bodyweight}
            onChange={(e) => setBodyweight(e.target.value)}
            className="font-mono h-12 sm:h-9 text-base sm:text-sm"
          />
        </div>
      </div>

      {/* Day selector */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Workout type
        </h2>
        {/* Scrollable row on mobile so all 5 tabs are always reachable */}
        <div className="-mx-6 px-6 overflow-x-auto sm:mx-0 sm:px-0">
          <Tabs value={dayType} onValueChange={setDayType}>
            <TabsList className="h-auto flex flex-nowrap gap-1.5 bg-transparent p-0 w-max sm:flex-wrap sm:w-auto">
              {DAY_OPTIONS.map((d) => (
                <TabsTrigger
                  key={d.value}
                  value={d.value}
                  id={`day-tab-${d.value}`}
                  className="rounded-md px-4 py-2.5 sm:py-1.5 text-sm sm:text-xs font-mono whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground transition-colors"
                >
                  {d.label}
                  <span className="ml-1 opacity-50">{d.sub}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Separator />

      {/* No exercises state */}
      {noExercises && (
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            No exercises set up yet.
          </p>
          <button
            onClick={handleSeedExercises}
            disabled={seeding}
            className="h-9 px-4 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "oklch(0.87 0.22 130)", color: "oklch(0.08 0 0)" }}
          >
            {seeding ? "Setting up..." : "Load my program"}
          </button>
        </div>
      )}

      {/* Exercise logs */}
      {exerciseLogs.length > 0 && (
        <div className="space-y-0">
          {exerciseLogs.map((el, exIdx) => (
            <ExerciseLogRow
              key={el.exercise.id}
              exLog={el}
              exIdx={exIdx}
              onUpdateSet={updateSet}
              onAddSet={addSet}
              onRemoveSet={removeSet}
              onToggleExpand={toggleExpand}
            />
          ))}
        </div>
      )}

      {/* Notes */}
      {exerciseLogs.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Session notes
          </label>
          <Textarea
            id="session-notes"
            placeholder="How did it feel? Any form cues or adjustments..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="resize-none text-sm"
            rows={3}
          />
        </div>
      )}

      {/* Save */}
      {exerciseLogs.length > 0 && (
        <div className="pt-2">
          <button
            id="save-session"
            onClick={handleSave}
            disabled={saving || saved}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-lg text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: saved
                ? "oklch(0.65 0.15 200)"
                : "oklch(0.87 0.22 130)",
              color: "oklch(0.08 0 0)",
            }}
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved!
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              "Save session"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Exercise log row ─────────────────────────────────────────────────────────

interface ExerciseLogRowProps {
  exLog: ExerciseLog;
  exIdx: number;
  onUpdateSet: (exIdx: number, setIdx: number, field: "weightKg" | "reps", value: string) => void;
  onAddSet: (exIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
  onToggleExpand: (exIdx: number) => void;
}

function ExerciseLogRow({
  exLog,
  exIdx,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onToggleExpand,
}: ExerciseLogRowProps) {
  const { exercise, sets, expanded } = exLog;

  const parsedSets: SetEntry[] = sets.map((s) => ({
    weightKg: parseFloat(s.weightKg) || 0,
    reps: parseInt(s.reps) || 0,
  }));

  const result = evaluateProgression(
    parsedSets,
    exercise.targetSets,
    exercise.repRangeMin,
    exercise.repRangeMax
  );

  const hasSomeData = parsedSets.some((s) => s.reps > 0 || s.weightKg > 0);

  // Focus next input on Enter
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: 20 }, () => [null, null])
  );

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    setIdx: number,
    col: 0 | 1
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextCol = col === 0 ? 1 : 0;
      const nextRow = col === 0 ? setIdx : setIdx + 1;
      const ref = inputRefs.current[nextRow]?.[nextCol];
      if (ref) {
        ref.focus();
        ref.select();
      } else if (col === 1) {
        // Last reps field — add set or focus save
        onAddSet(exIdx);
      }
    }
  }

  return (
    <div className="border-b border-border last:border-b-0">
      {/* Exercise header */}
      <button
        onClick={() => onToggleExpand(exIdx)}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <div className="space-y-0.5">
          <p className="text-sm font-medium group-hover:text-foreground transition-colors">
            {exercise.name}
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            {exercise.targetSets} × {exercise.repRangeMin}–{exercise.repRangeMax}
            {hasSomeData && result.status !== "not_enough_data" && (
              <span
                className={`ml-3 ${statusToColor(result.status)}`}
              >
                {statusToLabel(result.status)}
              </span>
            )}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Sets */}
      {expanded && (
        <div className="pb-4 space-y-3">
          {/* Column headers */}
          <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
            <span className="text-xs font-mono text-muted-foreground/60 text-center">
              Set
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground text-center">
              kg
            </span>
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground text-center">
              reps
            </span>
            <span />
          </div>

          {sets.map((s, setIdx) => {
            const w = parseFloat(s.weightKg) || 0;
            const r = parseInt(s.reps) || 0;
            const hitMax = r >= exercise.repRangeMax && w > 0;
            const aboveMin = r >= exercise.repRangeMin && w > 0;
            const belowMin = r > 0 && r < exercise.repRangeMin;

            return (
              <div
                key={s.id}
                className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center"
              >
                <span
                  className={`text-xs font-mono text-center ${
                    hitMax
                      ? ""
                      : aboveMin
                      ? "text-muted-foreground"
                      : "text-muted-foreground/50"
                  }`}
                  style={hitMax ? { color: "oklch(0.87 0.22 130)" } : undefined}
                >
                  {setIdx + 1}
                </span>

                <Input
                  ref={(el) => {
                    if (!inputRefs.current[setIdx]) inputRefs.current[setIdx] = [null, null];
                    inputRefs.current[setIdx][0] = el;
                  }}
                  id={`ex-${exIdx}-set-${setIdx}-weight`}
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={s.weightKg}
                  onChange={(e) =>
                    onUpdateSet(exIdx, setIdx, "weightKg", e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, setIdx, 0)}
                  onFocus={(e) => e.target.select()}
                  className="text-center font-mono h-10 text-sm"
                />

                <Input
                  ref={(el) => {
                    if (!inputRefs.current[setIdx]) inputRefs.current[setIdx] = [null, null];
                    inputRefs.current[setIdx][1] = el;
                  }}
                  id={`ex-${exIdx}-set-${setIdx}-reps`}
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={s.reps}
                  onChange={(e) =>
                    onUpdateSet(exIdx, setIdx, "reps", e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, setIdx, 1)}
                  onFocus={(e) => e.target.select()}
                  className={`text-center font-mono h-10 text-sm ${
                    hitMax
                      ? "border-[oklch(0.87_0.22_130)]"
                      : belowMin
                      ? "border-destructive/50"
                      : ""
                  }`}
                />

                <button
                  onClick={() => onRemoveSet(exIdx, setIdx)}
                  className="h-8 w-8 flex items-center justify-center text-muted-foreground/30 hover:text-destructive transition-colors rounded"
                  disabled={sets.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {/* Add set + progression feedback */}
          <div className="flex items-start justify-between pt-1">
            <button
              onClick={() => onAddSet(exIdx)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add set
            </button>

            {hasSomeData && result.status !== "not_enough_data" && (
              <p
                className={`text-xs text-right max-w-[200px] leading-relaxed ${statusToColor(result.status)}`}
              >
                {result.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense>
      <LogWorkoutContent />
    </Suspense>
  );
}
