"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { ArrowRight } from "lucide-react";

// Day type helpers
const DAY_LABELS: Record<string, string> = {
  lower_tue: "Lower",
  push_wed: "Push",
  pull_thu: "Pull",
  lower_sat: "Lower",
  upper_sun: "Upper",
};

function getTodayDayType(): string | null {
  const day = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const map: Record<number, string> = {
    2: "lower_tue",
    3: "push_wed",
    4: "pull_thu",
    6: "lower_sat",
    0: "upper_sun",
  };
  return map[day] ?? null;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  if (isPending || !session) return null;

  const todayDayType = getTodayDayType();
  const todayLabel = todayDayType ? DAY_LABELS[todayDayType] : null;
  const isRestDay = !todayDayType;

  const firstName = session.user.name?.split(" ")[0] ?? "there";

  return (
    <div className="pt-12 pb-8 space-y-16">
      {/* Hero */}
      <div className="space-y-3">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h2>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
          {isRestDay ? (
            <>
              Rest day.
              <br />
              <span className="text-muted-foreground">Recover well.</span>
            </>
          ) : (
            <>
              {todayLabel} day.
              <br />
              <span className="text-muted-foreground">Let&apos;s go, {firstName}.</span>
            </>
          )}
        </h1>
      </div>

      <Separator />

      {/* CTA */}
      <div className="space-y-6">
        {!isRestDay && (
          <Link
            href={`/log?day=${todayDayType}`}
            id="start-todays-workout"
            className="inline-flex items-center gap-2 h-11 px-5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "oklch(0.87 0.22 130)",
              color: "oklch(0.08 0 0)",
            }}
          >
            Start today&apos;s workout
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}

        <div className="flex gap-4 flex-wrap">
          <Link
            href="/log"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Log a session
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <Link
            href="/progress"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View progress
          </Link>
          <span className="text-muted-foreground/30">·</span>
          <Link
            href="/history"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Past sessions
          </Link>
        </div>
      </div>

      <Separator />

      {/* Weekly split overview */}
      <div className="space-y-6">
        <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          This week
        </h2>
        <WeeklyGrid />
      </div>
    </div>
  );
}

function WeeklyGrid() {
  const today = new Date().getDay();

  const days = [
    { label: "Mon", type: null, dayNum: 1 },
    { label: "Tue", type: "lower_tue", dayNum: 2 },
    { label: "Wed", type: "push_wed", dayNum: 3 },
    { label: "Thu", type: "pull_thu", dayNum: 4 },
    { label: "Fri", type: null, dayNum: 5 },
    { label: "Sat", type: "lower_sat", dayNum: 6 },
    { label: "Sun", type: "upper_sun", dayNum: 0 },
  ];

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map(({ label, type, dayNum }) => {
        const isToday = dayNum === today;
        const isRest = !type;
        return (
          <div key={label} className="space-y-1.5">
            <p
              className={`text-xs font-mono text-center ${
                isToday ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {label}
            </p>
            <div
              className={`h-10 rounded flex items-center justify-center ${
                isToday
                  ? "border"
                  : ""
              }`}
              style={
                isToday
                  ? { borderColor: "oklch(0.87 0.22 130)" }
                  : undefined
              }
            >
              <span
                className={`text-[10px] font-mono text-center leading-tight ${
                  isRest
                    ? "text-muted-foreground/40"
                    : isToday
                    ? "font-semibold"
                    : "text-muted-foreground"
                }`}
                style={isToday && !isRest ? { color: "oklch(0.87 0.22 130)" } : undefined}
              >
                {isRest
                  ? "rest"
                  : DAY_LABELS[type!]?.toLowerCase()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
