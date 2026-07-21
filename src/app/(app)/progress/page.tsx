"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getProgressionRecommendation } from "@/lib/progression";

interface Exercise {
  id: string;
  name: string;
  dayTypes: string;
  targetSets: number;
  repRangeMin: number;
  repRangeMax: number;
}

interface HistoryEntry {
  date: string;
  sets: { setNumber: number; weightKg: number; reps: number }[];
  maxWeight: number;
  totalVolume: number;
  avgReps: number;
}

interface ProgressData {
  exercise: Exercise;
  history: HistoryEntry[];
}

const chartConfig = {
  maxWeight: { label: "Max Weight (kg)", color: "oklch(0.87 0.22 130)" },
  totalVolume: { label: "Total Volume (kg)", color: "oklch(0.65 0.15 200)" },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ProgressPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    fetch("/api/exercises")
      .then((r) => r.json())
      .then((d: Exercise[]) => {
        if (Array.isArray(d)) {
          setExercises(d);
          if (d.length > 0) setSelectedId(d[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/progress/${selectedId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [selectedId]);

  if (isPending || !session) return null;

  const history = data?.history ?? [];
  const exercise = data?.exercise;

  // Reverse for charts (oldest to newest)
  const chartData = [...history].reverse().map((h) => ({
    date: formatDate(h.date),
    maxWeight: h.maxWeight,
    totalVolume: Math.round(h.totalVolume),
    avgReps: parseFloat(h.avgReps.toFixed(1)),
  }));

  const recommendation =
    exercise && history.length > 0
      ? getProgressionRecommendation(
          history.map((h) => ({
            date: h.date,
            sets: h.sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps })),
          })),
          exercise.targetSets,
          exercise.repRangeMin,
          exercise.repRangeMax
        )
      : null;

  // Last 8 sessions for table (newest first)
  const tableData = history.slice(0, 8);

  return (
    <div className="pt-10 pb-8 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Analysis
        </h2>
        <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      </div>

      {/* Exercise selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Exercise
        </label>
        <Select value={selectedId ?? ""} onValueChange={setSelectedId}>
          <SelectTrigger id="exercise-select" className="w-full sm:w-72 font-mono">
            <SelectValue placeholder="Select exercise" />
          </SelectTrigger>
          <SelectContent>
            {exercises.map((e) => (
              <SelectItem key={e.id} value={e.id} className="font-mono text-sm">
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground font-mono">Loading...</p>
      )}

      {!loading && exercise && (
        <>
          {/* Target + recommendation */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Target
            </p>
            <p className="text-lg font-semibold">
              {exercise.targetSets} × {exercise.repRangeMin}–{exercise.repRangeMax}
            </p>
            {recommendation && (
              <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                {recommendation}
              </p>
            )}
          </div>

          <Separator />

          {history.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No sessions logged yet for this exercise.
            </p>
          )}

          {history.length > 0 && (
            <>
              {/* Weight over time */}
              <div className="space-y-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Weight over time
                </h2>
                <ChartContainer config={chartConfig} className="h-48 w-full">
                  <LineChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(1 0 0 / 6%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                      tickLine={false}
                      axisLine={false}
                      stroke="oklch(0.55 0 0)"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                      tickLine={false}
                      axisLine={false}
                      stroke="oklch(0.55 0 0)"
                      width={35}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="maxWeight"
                      stroke="oklch(0.87 0.22 130)"
                      strokeWidth={2}
                      dot={{ fill: "oklch(0.87 0.22 130)", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>

              <Separator />

              {/* Volume */}
              <div className="space-y-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Total volume per session (kg)
                </h2>
                <ChartContainer config={chartConfig} className="h-40 w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(1 0 0 / 6%)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                      tickLine={false}
                      axisLine={false}
                      stroke="oklch(0.55 0 0)"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fontFamily: "var(--font-geist-mono)" }}
                      tickLine={false}
                      axisLine={false}
                      stroke="oklch(0.55 0 0)"
                      width={45}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="totalVolume"
                      fill="oklch(0.65 0.15 200)"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </div>

              <Separator />

              {/* Rep history table */}
              <div className="space-y-4">
                <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Recent sessions
                </h2>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono text-xs w-24">Date</TableHead>
                      {Array.from({ length: Math.max(...tableData.map((h) => h.sets.length), 0) }).map((_, i) => (
                        <TableHead key={i} className="font-mono text-xs text-center">
                          Set {i + 1}
                        </TableHead>
                      ))}
                      <TableHead className="font-mono text-xs text-right">Max</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map((h) => {
                      const maxSets = Math.max(...tableData.map((r) => r.sets.length), 0);
                      return (
                        <TableRow key={h.date}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {formatDate(h.date)}
                          </TableCell>
                          {Array.from({ length: maxSets }).map((_, i) => {
                            const s = h.sets[i];
                            return (
                              <TableCell
                                key={i}
                                className="font-mono text-xs text-center"
                              >
                                {s ? (
                                  <span>
                                    {s.weightKg}
                                    <span className="text-muted-foreground/50">×</span>
                                    {s.reps}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/30">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="font-mono text-xs text-right font-semibold">
                            {h.maxWeight}kg
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
