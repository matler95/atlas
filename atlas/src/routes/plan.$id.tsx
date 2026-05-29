import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, X, Check, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXERCISES, WEEKLY_PLAN, type Exercise, type PlannedWorkout } from "@/lib/mock-data";
import { MuscleMap } from "@/components/MuscleMap";
import { computeWorkoutIntensities, computeWorkoutQuality, predictSessionLength } from "@/lib/algorithms";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plan/$id")({
  head: () => ({ meta: [{ title: "Edit workout - Atlas" }] }),
  component: EditWorkout,
});

// Mock user profile - replace with real onboarding data later.
const USER: {
  goal: string;
  equipment: string;
  experience: "beginner" | "intermediate" | "advanced";
  abs: "all" | "some" | "none";
  targetSessionLength: number; // minutes from onboarding
} = { goal: "build_muscle", equipment: "full_gym", experience: "advanced", abs: "some", targetSessionLength: 60 };

// Which exercise categories belong to each split day.
const SPLIT_CATEGORIES: Record<PlannedWorkout["type"], Exercise["category"][]> = {
  Push: ["push"],
  Pull: ["pull"],
  Legs: ["legs"],
  Upper: ["push", "pull"],
  Lower: ["legs"],
  "Full Body": ["push", "pull", "legs"],
};

// Sort exercises by relevance to user profile.
function recommend(workout: PlannedWorkout): Exercise[] {
  const cats = new Set(SPLIT_CATEGORIES[workout.type]);
  const eqRank: Record<Exercise["equipment"], number> = {
    barbell: 3, dumbbell: 3, cable: 2, machine: 2, kettlebell: 1, bodyweight: USER.equipment === "bodyweight" ? 3 : 1,
  };
  const diffRank: Record<Exercise["difficulty"], number> = {
    beginner: USER.experience === "beginner" ? 3 : 1,
    intermediate: USER.experience === "intermediate" ? 3 : 2,
    advanced: USER.experience === "advanced" ? 3 : 1,
  };
  return EXERCISES
    .filter((e) => cats.has(e.category) || (e.category === "core" && USER.abs !== "none"))
    .map((e) => ({ e, score: (cats.has(e.category) ? 5 : 0) + eqRank[e.equipment] + diffRank[e.difficulty] }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e);
}

function EditWorkout() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const baseWorkout = WEEKLY_PLAN.find((w) => w.id === id) ?? WEEKLY_PLAN[0];
  const [selected, setSelected] = useState<string[]>(baseWorkout.exerciseIds);
  const [q, setQ] = useState("");

  const draft: PlannedWorkout = { ...baseWorkout, exerciseIds: selected };
  const intensities = computeWorkoutIntensities(draft);
  const quality = computeWorkoutQuality(draft);
  const setsPerExercise = USER.experience === "advanced" ? 4 : USER.experience === "intermediate" ? 3 : 3;
  const predictedMin = selected.length === 0 ? 0 : predictSessionLength(selected.length, setsPerExercise);
  const target = USER.targetSessionLength;
  const drift = predictedMin - target;
  const driftPct = target > 0 ? (drift / target) * 100 : 0;
  const lengthState: "ok" | "short" | "long" =
    selected.length === 0 ? "short" : driftPct > 20 ? "long" : driftPct < -25 ? "short" : "ok";

  const recommendations = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return recommend(baseWorkout).filter((e) =>
      !ql || e.name.toLowerCase().includes(ql) || e.primaryMuscles.some((m) => m.toLowerCase().includes(ql))
    );
  }, [baseWorkout, q]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="px-5 pb-32 pt-6">
      <button onClick={() => navigate({ to: "/plan" })} className="-ml-2 flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Plan
      </button>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">{baseWorkout.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {baseWorkout.type} day · {USER.experience} · pick your exercises
      </p>

      {/* Live muscle map + quality */}
      <div className="mt-5 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="w-24 shrink-0"><MuscleMap intensities={intensities} /></div>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workout quality</p>
            <p className="mt-1 text-3xl font-bold">{quality}<span className="text-sm font-medium text-muted-foreground">/100</span></p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full transition-all" style={{ width: `${quality}%`, background: "var(--gradient-primary)" }} />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{selected.length} exercises selected · weights & reps auto-set</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-background/40 px-3 py-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Est. session</p>
            <p className="mt-0.5 text-lg font-bold">
              ~{predictedMin} <span className="text-xs font-medium text-muted-foreground">min</span>
              <span className="ml-2 text-[11px] font-medium text-muted-foreground">target {target} min</span>
            </p>
          </div>
          <span className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            lengthState === "ok" && "bg-success/15 text-success",
            lengthState === "short" && "bg-primary/15 text-primary",
            lengthState === "long" && "bg-destructive/15 text-destructive",
          )}>
            {lengthState === "ok" ? "On target" : lengthState === "short" ? "Too short - add more" : "Too long - trim"}
          </span>
        </div>
        <p className="mt-1.5 px-1 text-[10px] text-muted-foreground">
          {setsPerExercise} sets × ~45s + 2 min rest, plus 10 min warmup & stretch.
        </p>
      </div>

      {/* Selected list */}
      <h2 className="mt-7 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your picks</h2>
      {selected.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Pick exercises below to start building this {baseWorkout.type.toLowerCase()} day.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {selected.map((sid, i) => {
            const ex = EXERCISES.find((e) => e.id === sid)!;
            return (
              <li key={sid} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{ex.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{ex.primaryMuscles.join(" · ")} · 4 × 8–12 @ auto</p>
                </div>
                <button onClick={() => toggle(sid)} className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Recommendations */}
      <div className="mt-7 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended for {baseWorkout.type}</h2>
      </div>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" className="h-12 rounded-2xl pl-11" />
      </div>
      <ul className="mt-3 space-y-2">
        {recommendations.map((ex) => {
          const picked = selected.includes(ex.id);
          return (
            <li key={ex.id}>
              <button
                onClick={() => toggle(ex.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  picked ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{ex.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{ex.primaryMuscles.join(" · ")} · {ex.equipment} · {ex.difficulty}</p>
                </div>
                <span className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl",
                  picked ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}>
                  {picked ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-background/95 px-5 py-3 backdrop-blur">
        <Button onClick={() => navigate({ to: "/plan" })} size="lg" className="h-12 w-full rounded-2xl text-base font-semibold">
          Save {selected.length} exercises
        </Button>
      </div>
    </div>
  );
}