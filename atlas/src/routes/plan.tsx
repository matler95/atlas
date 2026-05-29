import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Clock, Dumbbell, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WEEKLY_PLAN, EXERCISES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { MuscleMap } from "@/components/MuscleMap";
import { computeWorkoutIntensities, computeWorkoutQuality } from "@/lib/algorithms";

export const Route = createFileRoute("/plan")({
  head: () => ({ meta: [{ title: "Plan - Atlas" }] }),
  component: Plan,
});

function Plan() {
  const totalMin = WEEKLY_PLAN.reduce((s, w) => s + w.estMinutes, 0);
  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">This week</h1>
      <p className="mt-1 text-sm text-muted-foreground">Push / Pull / Legs · {WEEKLY_PLAN.length} sessions · ~{totalMin} min</p>

      <div className="mt-6 flex gap-3">
        <Stat label="Sessions" value={WEEKLY_PLAN.length.toString()} />
        <Stat label="Avg length" value={`${Math.round(totalMin / WEEKLY_PLAN.length)} min`} />
        <Stat label="Done" value={`${WEEKLY_PLAN.filter((w) => w.status === "done").length}/${WEEKLY_PLAN.length}`} />
      </div>

      <div className="mt-7 space-y-3">
        {WEEKLY_PLAN.map((w) => {
          const exercises = w.exerciseIds.map((id) => EXERCISES.find((e) => e.id === id)!);
          const intensities = computeWorkoutIntensities(w);
          const quality = computeWorkoutQuality(w);
          return (
            <div key={w.id} className="overflow-hidden rounded-3xl border border-border bg-card">
              <Link to="/plan/$id" params={{ id: w.id }} className="flex items-center justify-between p-5 hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl text-sm font-bold",
                    w.status === "done" && "bg-success/15 text-success",
                    w.status === "today" && "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
                    w.status === "upcoming" && "bg-muted text-muted-foreground",
                  )}>
                    {w.status === "done" ? <Check className="h-5 w-5" /> : w.day}
                  </div>
                  <div>
                    <p className="font-bold">{w.name}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> ~{w.estMinutes} min
                      <span>·</span>
                      <Dumbbell className="h-3 w-3" /> {w.exerciseIds.length} exercises
                    </p>
                  </div>
                </div>
                {w.status === "today" && (
                  <span className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                    <Play className="mr-1 inline h-3 w-3" /> Edit
                  </span>
                )}
              </Link>
              <div className="border-t border-border bg-background/30 px-5 py-3">
                <div className="flex gap-4">
                  <div className="w-24 shrink-0">
                    <MuscleMap intensities={intensities} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Exercises</p>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-bold",
                        quality >= 80 ? "bg-success/15 text-success" : quality >= 50 ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        Quality {quality}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {exercises.map((ex) => (
                        <li key={ex.id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{ex.name}</span>
                          <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{ex.primaryMuscles[0]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="lg" className="mt-6 h-14 w-full rounded-2xl border-dashed">
        <Plus className="mr-1 h-5 w-5" /> Create new workout
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Exercises follow your split · weights & reps auto-tuned per session.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-card p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}