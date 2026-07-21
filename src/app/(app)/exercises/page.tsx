"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  dayTypes: string;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
  isActive: boolean;
}

const DAY_OPTIONS = [
  { value: "lower_tue", label: "Lower (Tue)" },
  { value: "push_wed", label: "Push (Wed)" },
  { value: "pull_thu", label: "Pull (Thu)" },
  { value: "lower_sat", label: "Lower (Sat)" },
  { value: "upper_sun", label: "Upper (Sun)" },
];

const DAY_LABELS: Record<string, string> = {
  lower_tue: "Lower · Tue",
  push_wed: "Push · Wed",
  pull_thu: "Pull · Thu",
  lower_sat: "Lower · Sat",
  upper_sun: "Upper · Sun",
};

// ─── Add / Edit dialog ────────────────────────────────────────────────────────

interface ExerciseFormData {
  name: string;
  dayTypes: string[];
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
}

const DEFAULT_FORM: ExerciseFormData = {
  name: "",
  dayTypes: [],
  targetSets: 3,
  repRangeMin: 8,
  repRangeMax: 12,
};

interface ExerciseDialogProps {
  exercise?: Exercise;
  onSave: (data: ExerciseFormData) => Promise<void>;
  trigger: React.ReactNode;
}

function ExerciseDialog({ exercise, onSave, trigger }: ExerciseDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ExerciseFormData>(
    exercise
      ? {
          name: exercise.name,
          dayTypes: exercise.dayTypes.split(","),
          targetSets: exercise.targetSets,
          repRangeMin: exercise.repRangeMin,
          repRangeMax: exercise.repRangeMax,
        }
      : DEFAULT_FORM
  );
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setOpen(false);
  }

  function toggleDay(day: string) {
    setForm((prev) => ({
      ...prev,
      dayTypes: prev.dayTypes.includes(day)
        ? prev.dayTypes.filter((d) => d !== day)
        : [...prev.dayTypes, day],
    }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="outline-none">{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {exercise ? "Edit exercise" : "Add exercise"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Name
            </Label>
            <Input
              id="exercise-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Lat Pulldown"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Days
            </Label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((d) => {
                const active = form.dayTypes.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      active
                        ? "text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                    style={active ? { background: "oklch(0.87 0.22 130)", color: "oklch(0.08 0 0)" } : undefined}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Sets
              </Label>
              <Input
                id="target-sets"
                type="number"
                value={form.targetSets}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetSets: parseInt(e.target.value) || 3 }))
                }
                min={1}
                max={10}
                className="font-mono text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Min reps
              </Label>
              <Input
                id="rep-range-min"
                type="number"
                value={form.repRangeMin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, repRangeMin: parseInt(e.target.value) || 6 }))
                }
                min={1}
                className="font-mono text-center"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Max reps
              </Label>
              <Input
                id="rep-range-max"
                type="number"
                value={form.repRangeMax}
                onChange={(e) =>
                  setForm((f) => ({ ...f, repRangeMax: parseInt(e.target.value) || 12 }))
                }
                min={1}
                className="font-mono text-center"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !form.name || form.dayTypes.length === 0}
            className="w-full h-10 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "oklch(0.87 0.22 130)", color: "oklch(0.08 0 0)" }}
          >
            {saving ? "Saving..." : exercise ? "Save changes" : "Add exercise"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function ExercisesPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setExercises(d);
      });
  }, []);

  async function handleAdd(data: ExerciseFormData) {
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const row = await res.json();
    setExercises((prev) => [...prev, row]);
  }

  async function handleEdit(id: string, data: ExerciseFormData) {
    const res = await fetch(`/api/exercises/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const row = await res.json();
    setExercises((prev) => prev.map((e) => (e.id === id ? row : e)));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/exercises/${id}`, { method: "DELETE" });
    setExercises((prev) => prev.filter((e) => e.id !== id));
  }

  if (isPending || !session) return null;

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  // Group by first day type
  const grouped: Record<string, Exercise[]> = {};
  filtered.forEach((e) => {
    const day = e.dayTypes.split(",")[0];
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  });

  const dayOrder = ["lower_tue", "push_wed", "pull_thu", "lower_sat", "upper_sun"];

  return (
    <div className="pt-10 pb-8 space-y-10">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Your program
          </h2>
          <h1 className="text-3xl font-bold tracking-tight">Exercises</h1>
        </div>
        <ExerciseDialog
          onSave={handleAdd}
          trigger={
            <div
              id="add-exercise"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: "oklch(0.87 0.22 130)", color: "oklch(0.08 0 0)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </div>
          }
        />
      </div>

      <Input
        id="exercise-search"
        placeholder="Search exercises..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <div className="space-y-10">
        {dayOrder.map((day) => {
          const exs = grouped[day];
          if (!exs?.length) return null;
          return (
            <div key={day} className="space-y-0">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-4">
                {DAY_LABELS[day]}
              </h2>
              {exs.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between py-3.5 border-b border-border last:border-b-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{ex.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {ex.targetSets} × {ex.repRangeMin}–{ex.repRangeMax}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <ExerciseDialog
                      exercise={ex}
                      onSave={(data) => handleEdit(ex.id, data)}
                      trigger={
                        <div className="h-8 w-8 flex items-center justify-center text-muted-foreground/40 hover:text-foreground transition-colors rounded cursor-pointer">
                          <Pencil className="h-3.5 w-3.5" />
                        </div>
                      }
                    />
                    <button
                      onClick={() => handleDelete(ex.id)}
                      className="h-8 w-8 flex items-center justify-center text-muted-foreground/40 hover:text-destructive transition-colors rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {search ? "No exercises match your search." : "No exercises yet."}
          </p>
        )}
      </div>
    </div>
  );
}
