import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Target, Zap, ArrowRight, Calendar, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BODYWEIGHT_HISTORY, WEEKLY_PLAN } from "@/lib/mock-data";
import { Sparkline } from "@/components/charts/Sparkline";
import { RingStat } from "@/components/RingStat";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Today - Atlas" }] }),
  component: Dashboard,
});

function Dashboard() {
  const today = new Date();
  const todayWorkout = WEEKLY_PLAN.find((w) => w.status === "today");
  const upcoming = WEEKLY_PLAN.find((w) => w.status === "upcoming");
  const completed = WEEKLY_PLAN.filter((w) => w.status === "done").length;
  const currentWeight = BODYWEIGHT_HISTORY.at(-1)!.kg;
  const weightDelta = currentWeight - BODYWEIGHT_HISTORY[0].kg;

  return (
    <div className="px-5 pb-6 pt-8">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Hey, Alex 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">Let's get one more rep than yesterday.</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-full bg-card text-sm font-bold">A</div>
      </div>

      {/* Today's workout card */}
      {todayWorkout ? (
        <div className="mt-6 overflow-hidden rounded-3xl p-5 shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-2 text-primary-foreground/80">
            <Zap className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Today's session</span>
          </div>
          <h2 className="mt-2 text-2xl font-bold text-primary-foreground">{todayWorkout.name}</h2>
          <p className="mt-1 text-sm text-primary-foreground/80">
            {todayWorkout.exerciseIds.length} exercises · ~{todayWorkout.estMinutes} min
          </p>
          <Button asChild size="lg" variant="secondary" className="mt-5 h-12 w-full rounded-xl bg-background/95 text-foreground hover:bg-background">
            <Link to="/workout">Start workout <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      ) : (
        <Card className="mt-6 p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Up next</span>
          </div>
          <h2 className="mt-2 text-xl font-bold">{upcoming?.name ?? "Rest day"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{upcoming ? `${upcoming.day} · ~${upcoming.estMinutes} min` : "Stretch and recover."}</p>
        </Card>
      )}

      {/* At a glance */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">At a glance</h3>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <RingStat label="Week" value={completed} total={WEEKLY_PLAN.length} unit="done" />
          <RingStat label="Protein" value={132} total={180} unit="g" color="warning" />
          <RingStat label="Calories" value={1840} total={2400} unit="kcal" color="destructive" />
        </div>
      </div>

      {/* Readiness */}
      <Card className="mt-6 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Readiness</p>
            <p className="mt-1 text-3xl font-bold">
              82<span className="text-base font-medium text-muted-foreground">/100</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Recovered - push hard today.</p>
          </div>
          <div className="grid h-14 w-14 place-items-center rounded-full bg-success/15 text-success">
            <Flame className="h-7 w-7" />
          </div>
        </div>
      </Card>

      {/* Bodyweight */}
      <Card className="mt-4 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bodyweight</p>
            <p className="mt-1 text-3xl font-bold">
              {currentWeight}<span className="text-base font-medium text-muted-foreground"> kg</span>
            </p>
            <p className={`mt-1 text-xs ${weightDelta < 0 ? "text-success" : "text-muted-foreground"}`}>
              {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg over 8 weeks
            </p>
          </div>
          <Sparkline points={BODYWEIGHT_HISTORY.map((b) => b.kg)} className="h-14 w-32 text-primary" />
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Suggested next bench: 95 kg</p>
            <p className="text-xs text-muted-foreground">+2.5 kg from last session</p>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
      </Card>
    </div>
  );
}

function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded-3xl border border-border bg-card ${className}`} {...props} />;
}