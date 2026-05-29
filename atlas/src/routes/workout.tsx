import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { X, Check, SkipForward, Plus, Minus, Pause, Play, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EXERCISES, WEEKLY_PLAN } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { MuscleMap } from "@/components/MuscleMap";
import { computeWorkoutIntensities, computeWorkoutQuality } from "@/lib/algorithms";

export const Route = createFileRoute("/workout")({
  head: () => ({ meta: [{ title: "Workout - Atlas" }] }),
  component: Workout,
});

type Phase = "warmup" | "exercise" | "rest" | "feedback";

function Workout() {
  const navigate = useNavigate();
  const plan = WEEKLY_PLAN.find((w) => w.status === "today") ?? WEEKLY_PLAN[0];
  const exercises = useMemo(() => plan.exerciseIds.map((id) => EXERCISES.find((e) => e.id === id)!), [plan]);

  const [phase, setPhase] = useState<Phase>("warmup");
  const [exIdx, setExIdx] = useState(0);
  const [setIdx, setSetIdx] = useState(0);
  const totalSets = 4;
  const ex = exercises[exIdx];

  // Per-set state (weight + reps)
  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(10);

  if (phase === "warmup") return <WarmupScreen onSkip={() => setPhase("exercise")} onClose={() => navigate({ to: "/dashboard" })} />;
  if (phase === "feedback") return <FeedbackScreen onDone={() => navigate({ to: "/dashboard" })} plan={plan} />;

  const completeSet = () => {
    if (setIdx + 1 < totalSets) setPhase("rest");
    else {
      // next exercise
      if (exIdx + 1 < exercises.length) {
        setExIdx(exIdx + 1);
        setSetIdx(0);
        setPhase("exercise");
      } else {
        setPhase("feedback");
      }
    }
  };

  const onRestDone = () => {
    setSetIdx(setIdx + 1);
    setPhase("exercise");
  };

  const totalDone = exIdx * totalSets + setIdx;
  const totalAll = exercises.length * totalSets;
  const progressPct = (totalDone / totalAll) * 100;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/dashboard" })} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-card">
            <X className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{plan.name}</p>
            <p className="text-sm font-semibold">{exIdx + 1} / {exercises.length} exercises</p>
          </div>
          <button
            onClick={() => setPhase("feedback")}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-card hover:text-foreground"
          >
            End
          </button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "var(--gradient-primary)" }} />
        </div>
      </header>

      {phase === "rest" ? (
        <RestScreen seconds={120} onDone={onRestDone} onSkip={onRestDone} />
      ) : (
        <ExerciseScreen
          ex={ex}
          setNumber={setIdx + 1}
          totalSets={totalSets}
          weight={weight}
          reps={reps}
          onWeight={setWeight}
          onReps={setReps}
          onComplete={completeSet}
          exercises={exercises}
          onJump={(i) => { setExIdx(i); setSetIdx(0); setPhase("exercise"); }}
        />
      )}
    </div>
  );
}

function WarmupScreen({ onSkip, onClose }: { onSkip: () => void; onClose: () => void }) {
  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ background: "var(--gradient-hero)" }}>
      <header className="flex items-center justify-between p-5">
        <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-card"><X className="h-5 w-5" /></button>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Phase 1 of 3</p>
        <div className="w-10" />
      </header>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="grid h-32 w-32 place-items-center rounded-full text-5xl shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
          🔥
        </div>
        <h1 className="mt-8 text-4xl font-bold tracking-tight">Warm up</h1>
        <p className="mt-3 text-base text-muted-foreground">10 min of light cardio + dynamic stretching to prime your nervous system.</p>
        <div className="mt-8 w-full space-y-2 rounded-2xl border border-border bg-card/60 p-5 text-left">
          <Row text="5 min easy cardio (bike / row / treadmill)" />
          <Row text="Arm circles · leg swings · cat-cow" />
          <Row text="2 light warmup sets of your first lift" />
        </div>
      </div>
      <div className="p-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}>
        <Button size="lg" onClick={onSkip} className="h-14 w-full rounded-2xl text-base font-semibold">
          Start first exercise <ChevronRight className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function Row({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/15 text-primary"><Check className="h-3.5 w-3.5" /></div>
      <span>{text}</span>
    </div>
  );
}

function ExerciseScreen({
  ex, setNumber, totalSets, weight, reps, onWeight, onReps, onComplete, exercises, onJump,
}: {
  ex: typeof EXERCISES[number];
  setNumber: number; totalSets: number;
  weight: number; reps: number;
  onWeight: (n: number) => void;
  onReps: (n: number) => void;
  onComplete: () => void;
  exercises: typeof EXERCISES;
  onJump: (i: number) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  return (
    <div className="flex flex-1 flex-col px-5 pt-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Set {setNumber} of {totalSets}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{ex.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{ex.primaryMuscles.join(" · ")}</p>

      <div className="mt-7 flex gap-3">
        <Stepper label="Weight" value={weight} unit="kg" step={2.5} onChange={onWeight} />
        <Stepper label="Reps" value={reps} unit="reps" step={1} onChange={onReps} />
      </div>

      <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <span className="font-semibold text-primary">Suggested:</span> {weight} kg × {reps} reps · +2.5 kg from last week
      </div>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {Array.from({ length: totalSets }).map((_, i) => (
          <div key={i} className={cn(
            "h-2 rounded-full",
            i < setNumber - 1 && "bg-primary",
            i === setNumber - 1 && "bg-primary/40 animate-pulse",
            i > setNumber - 1 && "bg-muted",
          )} />
        ))}
      </div>

      <div className="mt-auto space-y-3 pb-6 pt-6">
        <Button onClick={onComplete} size="lg" className="h-16 w-full rounded-2xl text-lg font-bold shadow-[var(--shadow-glow)]">
          <Check className="mr-1 h-6 w-6" /> Set complete
        </Button>
        <button
          onClick={() => setShowAll((s) => !s)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-4 w-4" /> Jump to another exercise
        </button>
        {showAll && (
          <div className="rounded-2xl border border-border bg-card p-2">
            {exercises.map((e, i) => (
              <button
                key={e.id}
                onClick={() => { onJump(i); setShowAll(false); }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                  e.id === ex.id && "bg-primary/10 text-primary"
                )}
              >
                <span>{i + 1}. {e.name}</span>
                <span className="text-xs text-muted-foreground">{e.primaryMuscles[0]}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ label, value, unit, step, onChange }: { label: string; value: number; unit: string; step: number; onChange: (n: number) => void }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-center justify-between">
        <button onClick={() => onChange(Math.max(0, value - step))} className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-foreground hover:bg-muted/70">
          <Minus className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-3xl font-bold tabular-nums">{value}</p>
          <p className="text-[10px] text-muted-foreground">{unit}</p>
        </div>
        <button onClick={() => onChange(value + step)} className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function RestScreen({ seconds, onDone, onSkip }: { seconds: number; onDone: () => void; onSkip: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) { onDone(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, paused, onDone]);

  const pct = ((seconds - remaining) / seconds) * 100;
  const min = Math.floor(remaining / 60);
  const sec = remaining % 60;
  const r = 110;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rest</p>
      <div className="relative mt-6">
        <svg width="280" height="280" className="-rotate-90">
          <circle cx="140" cy="140" r={r} stroke="currentColor" strokeOpacity="0.1" strokeWidth="10" fill="none" />
          <circle
            cx="140" cy="140" r={r}
            stroke="url(#rest-grad)" strokeWidth="10" fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
            className="transition-all duration-1000 ease-linear"
          />
          <defs>
            <linearGradient id="rest-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.88 0.20 130)" />
              <stop offset="100%" stopColor="oklch(0.78 0.18 150)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-6xl font-bold tabular-nums">{min}:{sec.toString().padStart(2, "0")}</p>
            <p className="mt-1 text-xs text-muted-foreground">until next set</p>
          </div>
        </div>
      </div>

      <div className="mt-10 flex w-full max-w-xs gap-3">
        <Button variant="outline" size="lg" onClick={() => setPaused((p) => !p)} className="h-14 flex-1 rounded-2xl">
          {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>
        <Button size="lg" onClick={onSkip} className="h-14 flex-[2] rounded-2xl text-base font-semibold">
          Skip rest <SkipForward className="ml-1 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

function FeedbackScreen({ onDone, plan }: { onDone: () => void; plan: typeof WEEKLY_PLAN[number] }) {
  const [rpe, setRpe] = useState<number | null>(null);
  const [feel, setFeel] = useState<string | null>(null);
  const intensities = computeWorkoutIntensities(plan);
  const quality = computeWorkoutQuality(plan);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="p-5 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full shadow-[var(--shadow-glow)]" style={{ background: "var(--gradient-primary)" }}>
          <Check className="h-10 w-10 text-primary-foreground" strokeWidth={3} />
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Workout complete</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick feedback so we can tune next session.</p>
      </header>

      <div className="flex-1 space-y-7 px-5 pt-3">
        <div className="rounded-3xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Muscles trained</p>
              <p className="mt-1 text-2xl font-bold">Quality {quality}<span className="text-sm font-medium text-muted-foreground">/100</span></p>
              <p className="mt-1 text-xs text-muted-foreground">{quality >= 80 ? "Great coverage for a " + plan.type.toLowerCase() + " day." : "Some target muscles undertrained."}</p>
            </div>
            <div className="w-28"><MuscleMap intensities={intensities} /></div>
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">How hard was it?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">1 = easy · 10 = max effort</p>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {[2, 4, 6, 8, 10].map((n) => (
              <button
                key={n}
                onClick={() => setRpe(n)}
                className={cn(
                  "h-14 rounded-2xl border text-lg font-bold transition-all",
                  rpe === n ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold">How did it feel?</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[{ k: "great", e: "💪", l: "Great" }, { k: "ok", e: "😐", l: "Okay" }, { k: "rough", e: "😩", l: "Rough" }].map((o) => (
              <button
                key={o.k}
                onClick={() => setFeel(o.k)}
                className={cn(
                  "rounded-2xl border bg-card py-4 text-center transition-all",
                  feel === o.k ? "border-primary bg-primary/10" : "border-border"
                )}
              >
                <div className="text-2xl">{o.e}</div>
                <div className="mt-1 text-xs font-medium">{o.l}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Tomorrow's tweak</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on RPE we'll auto-adjust weight suggestions for your next session.</p>
        </div>
      </div>

      <div className="p-5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        <Button size="lg" onClick={onDone} className="h-14 w-full rounded-2xl text-base font-semibold">
          Save & finish
        </Button>
      </div>
    </div>
  );
}