"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronUp } from "lucide-react";

interface WorkoutSession {
  id: string;
  date: string;
  dayType: string;
  bodweightKg: number | null;
}

interface SessionDetail {
  id: string;
  date: string;
  dayType: string;
  bodweightKg: number | null;
  exercises: {
    id: string;
    exerciseName: string;
    targetSets: number;
    repRangeMin: number;
    repRangeMax: number;
    sets: { setNumber: number; weightKg: number; reps: number }[];
  }[];
}

const DAY_LABELS: Record<string, string> = {
  legs:  "Legs",
  push:  "Push",
  pull:  "Pull",
  upper: "Upper",
  // Legacy values from before the split was renamed
  lower_tue: "Legs",
  push_wed:  "Push",
  pull_thu:  "Pull",
  lower_sat: "Legs",
  upper_sun: "Upper",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// ─── Contribution calendar ────────────────────────────────────────────────────

interface CalendarProps {
  sessions: WorkoutSession[];
}

function ContributionCalendar({ sessions }: CalendarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Build a map of date → session for tooltip data
  const sessionByDate = new Map<string, WorkoutSession>();
  sessions.forEach((s) => sessionByDate.set(s.date, s));

  // Build 52 weeks of days
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 52 * 7 + 1);

  const weeks: Date[][] = [];
  let current = new Date(start);
  // Align to Sunday
  current.setDate(current.getDate() - current.getDay());

  while (current <= today) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, []);

  return (
    <TooltipProvider delay={100}>
      <div ref={containerRef} className="overflow-x-auto pb-2">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const dateStr = day.toISOString().split("T")[0];
                const isFuture = day > today;
                const session = sessionByDate.get(dateStr);
                const hasSession = !!session;
                const isToday = dateStr === today.toISOString().split("T")[0];

                const square = (
                  <div
                    key={dateStr}
                    className="w-[12px] h-[12px] rounded-[2px] transition-colors cursor-default"
                    style={{
                      background: isFuture
                        ? "oklch(1 0 0 / 4%)"
                        : hasSession
                        ? "oklch(0.87 0.22 130)"
                        : isToday
                        ? "oklch(1 0 0 / 15%)"
                        : "oklch(1 0 0 / 8%)",
                      outline: isToday ? "1px solid oklch(0.87 0.22 130 / 50%)" : undefined,
                    }}
                  />
                );

                if (!hasSession || isFuture) return square;

                return (
                  <Tooltip key={dateStr}>
                    <TooltipTrigger render={square} />
                    <TooltipContent side="top" className="text-xs font-mono max-w-[200px]">
                      <p className="font-semibold mb-0.5">
                        {DAY_LABELS[session.dayType] ?? session.dayType} · {formatDate(session.date)}
                      </p>
                      {session.bodweightKg && (
                        <p className="text-muted-foreground">{session.bodweightKg} kg</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: WorkoutSession }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleExpand() {
    if (!expanded && !detail) {
      setLoading(true);
      const res = await fetch(`/api/sessions/${session.id}`);
      const data = await res.json();
      setDetail(data);
      setLoading(false);
    }
    setExpanded((v) => !v);
  }

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={handleExpand}
        className="w-full flex items-center justify-between py-4 text-left group"
      >
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {DAY_LABELS[session.dayType] ?? session.dayType}
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            {formatDate(session.date)}
            {session.bodweightKg ? (
              <span className="ml-3">{session.bodweightKg} kg</span>
            ) : null}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="pb-4 space-y-4">
          {loading && (
            <p className="text-xs text-muted-foreground font-mono">Loading...</p>
          )}
          {detail?.exercises.map((ex) => (
            <div key={ex.id} className="space-y-1">
              <p className="text-sm font-medium">{ex.exerciseName}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {ex.sets.map((s) => (
                  <span key={s.setNumber} className="text-xs font-mono text-muted-foreground">
                    {s.weightKg}
                    <span className="opacity-40">×</span>
                    {s.reps}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

export default function HistoryPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [session, isPending, router]);

  useEffect(() => {
    fetch("/api/sessions?limit=200")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setSessions(d);
      })
      .finally(() => setLoadingSessions(false));
  }, []);

  if (isPending || !session) return null;

  const shown = sessions.slice(0, visible);
  const hasMore = visible < sessions.length;

  return (
    <div className="pt-10 pb-8 space-y-10">
      <div className="space-y-1">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          All sessions
        </h2>
        <h1 className="text-3xl font-bold tracking-tight">History</h1>
      </div>

      {/* Contribution calendar */}
      <div className="space-y-3">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          Last 52 weeks
        </p>
        {loadingSessions ? (
          <Skeleton className="h-14 w-full" />
        ) : (
          <>
            <ContributionCalendar sessions={sessions} />
            <p className="text-xs text-muted-foreground font-mono">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} total
            </p>
          </>
        )}
      </div>

      <Separator />

      {/* Session list */}
      {loadingSessions ? (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
      ) : (
        <div className="space-y-0">
          {shown.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}

          {hasMore && (
            <div className="pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
              >
                Load more ({sessions.length - visible} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
