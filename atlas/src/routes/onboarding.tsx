import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Get started - Atlas" }] }),
  component: Onboarding,
});

type Choice = { value: string; label: string; hint?: string };

const STEPS = [
  "name", "goal", "experience", "stats", "equipment",
  "availability", "split", "abs", "lifestyle", "history",
] as const;

const GOALS: Choice[] = [
  { value: "build_muscle", label: "Build muscle", hint: "Hypertrophy focus" },
  { value: "lose_fat", label: "Lose fat", hint: "Higher volume, conditioning" },
  { value: "get_stronger", label: "Get stronger", hint: "Heavier, lower reps" },
  { value: "general_fitness", label: "Stay fit", hint: "Balanced approach" },
  { value: "endurance", label: "Build endurance", hint: "Longer sessions" },
];

const EXPERIENCE: Choice[] = [
  { value: "beginner", label: "Beginner", hint: "< 1 year of training" },
  { value: "intermediate", label: "Intermediate", hint: "1–3 years" },
  { value: "advanced", label: "Advanced", hint: "3+ years" },
];

const EQUIPMENT: Choice[] = [
  { value: "full_gym", label: "Full gym", hint: "Barbells, machines, cables" },
  { value: "limited", label: "Limited equipment", hint: "Tell us what you have" },
  { value: "bodyweight", label: "Bodyweight only", hint: "No equipment" },
];

const SPLITS: Choice[] = [
  { value: "full_body", label: "Full body" },
  { value: "upper_lower", label: "Upper / Lower" },
  { value: "push_pull_legs", label: "Push / Pull / Legs" },
  { value: "bro_split", label: "Body part split" },
];

const ABS: Choice[] = [
  { value: "all", label: "Every workout" },
  { value: "some", label: "Dedicated days" },
  { value: "none", label: "Skip them" },
];

const JOB: Choice[] = [
  { value: "sedentary", label: "Desk job" },
  { value: "moderate", label: "On my feet" },
  { value: "active", label: "Physical work" },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({
    age: 28, height: 180, weight: 80,
    daysPerWeek: 3, sessionLength: 60,
    sleep: 7, stress: 3, cardioSessions: 1,
  });

  const update = (k: string, v: any) => setData((d) => ({ ...d, [k]: v }));
  const progress = ((step + 1) / STEPS.length) * 100;

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else navigate({ to: "/plan" });
  };
  const back = () => (step === 0 ? navigate({ to: "/" }) : setStep(step - 1));

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <button onClick={back} className="-ml-2 grid h-10 w-10 place-items-center rounded-full hover:bg-card">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-xs text-muted-foreground">{step + 1} of {STEPS.length}</span>
          <div className="w-10" />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: "var(--gradient-primary)" }} />
        </div>
      </header>

      <div className="flex flex-1 flex-col px-5 pb-32 pt-6">
        <StepBody step={STEPS[step]} data={data} update={update} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-border bg-background/95 p-4 backdrop-blur" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
        <Button onClick={next} size="lg" className="h-14 w-full rounded-2xl text-base font-semibold">
          {step === STEPS.length - 1 ? <>Finish <Check className="ml-1 h-5 w-5" /></> : <>Continue <ArrowRight className="ml-1 h-5 w-5" /></>}
        </Button>
      </div>
    </div>
  );
}

function StepBody({ step, data, update }: { step: typeof STEPS[number]; data: any; update: (k: string, v: any) => void }) {
  switch (step) {
    case "name":
      return (
        <Question title="What should we call you?" subtitle="Just a first name is fine.">
          <Input autoFocus value={data.name ?? ""} onChange={(e) => update("name", e.target.value)} placeholder="Your name" className="h-14 rounded-2xl text-lg" />
        </Question>
      );
    case "goal":
      return (
        <Question title="What's your primary goal?" subtitle="We'll bias the program toward this.">
          <ChoiceList choices={GOALS} value={data.goal} onChange={(v) => update("goal", v)} />
        </Question>
      );
    case "experience":
      return (
        <Question title="How experienced are you?" subtitle="Honest answers get better programs.">
          <ChoiceList choices={EXPERIENCE} value={data.experience} onChange={(v) => update("experience", v)} />
        </Question>
      );
    case "stats":
      return (
        <Question title="Tell us about you" subtitle="Used to calibrate volume & loads.">
          <div className="space-y-5">
            <Field label="Gender">
              <SegmentedControl
                value={data.gender}
                onChange={(v) => update("gender", v)}
                options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]}
              />
            </Field>
            <Field label={`Age - ${data.age}`}><Slider min={14} max={80} value={[data.age]} onValueChange={([v]) => update("age", v)} /></Field>
            <Field label={`Height - ${data.height} cm`}><Slider min={140} max={220} value={[data.height]} onValueChange={([v]) => update("height", v)} /></Field>
            <Field label={`Weight - ${data.weight} kg`}><Slider min={40} max={180} value={[data.weight]} onValueChange={([v]) => update("weight", v)} /></Field>
          </div>
        </Question>
      );
    case "equipment":
      return (
        <Question title="What equipment do you have?" subtitle="We'll only suggest doable exercises.">
          <ChoiceList choices={EQUIPMENT} value={data.equipment} onChange={(v) => update("equipment", v)} />
          {data.equipment === "limited" && (
            <Input
              value={data.equipmentDetails ?? ""}
              onChange={(e) => update("equipmentDetails", e.target.value)}
              placeholder="e.g. adjustable dumbbells, bench, pull-up bar"
              className="mt-4 h-14 rounded-2xl"
            />
          )}
        </Question>
      );
    case "availability":
      return (
        <Question title="When can you train?" subtitle="Realistic beats ambitious.">
          <div className="space-y-6">
            <Field label={`${data.daysPerWeek} days per week`}><Slider min={1} max={7} value={[data.daysPerWeek]} onValueChange={([v]) => update("daysPerWeek", v)} /></Field>
            <Field label={`${data.sessionLength} minutes per session`}><Slider min={20} max={120} step={5} value={[data.sessionLength]} onValueChange={([v]) => update("sessionLength", v)} /></Field>
          </div>
        </Question>
      );
    case "split":
      return (
        <Question title="Preferred workout style?" subtitle="We'll structure your plan around this.">
          <ChoiceList choices={SPLITS} value={data.split} onChange={(v) => update("split", v)} />
        </Question>
      );
    case "abs":
      return (
        <Question title="Train abs?" subtitle="Direct core work, that is.">
          <ChoiceList choices={ABS} value={data.abs} onChange={(v) => update("abs", v)} />
        </Question>
      );
    case "lifestyle":
      return (
        <Question title="Recovery & lifestyle" subtitle="Drives readiness and recovery scoring.">
          <div className="space-y-5">
            <Field label={`Average sleep - ${data.sleep}h`}><Slider min={4} max={10} step={0.5} value={[data.sleep]} onValueChange={([v]) => update("sleep", v)} /></Field>
            <Field label={`Stress level - ${data.stress}/5`}><Slider min={1} max={5} value={[data.stress]} onValueChange={([v]) => update("stress", v)} /></Field>
            <Field label="Job activity">
              <ChoiceList choices={JOB} value={data.jobActivity} onChange={(v) => update("jobActivity", v)} compact />
            </Field>
            <Field label={`Extra cardio sessions - ${data.cardioSessions}/wk`}><Slider min={0} max={7} value={[data.cardioSessions]} onValueChange={([v]) => update("cardioSessions", v)} /></Field>
          </div>
        </Question>
      );
    case "history":
      return (
        <Question title="Any injuries or notes?" subtitle="Optional. Helps us avoid bad picks.">
          <textarea
            value={data.history ?? ""}
            onChange={(e) => update("history", e.target.value)}
            placeholder="e.g. recovering from knee injury, can't overhead press"
            rows={5}
            className="w-full rounded-2xl border border-input bg-card p-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-4 text-xs text-muted-foreground">We only save your profile after you create an account at the end.</p>
        </Question>
      );
  }
}

function Question({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ChoiceList({ choices, value, onChange, compact }: { choices: Choice[]; value?: string; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <div className="space-y-2.5">
      {choices.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            onClick={() => onChange(c.value)}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl border bg-card text-left transition-all",
              compact ? "px-4 py-3" : "px-5 py-4",
              active ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]" : "border-border hover:border-muted-foreground/40"
            )}
          >
            <div>
              <div className="font-semibold">{c.label}</div>
              {c.hint && <div className="mt-0.5 text-xs text-muted-foreground">{c.hint}</div>}
            </div>
            <div className={cn("grid h-6 w-6 place-items-center rounded-full border-2 transition-colors", active ? "border-primary bg-primary" : "border-muted-foreground/30")}>
              {active && <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SegmentedControl({ value, onChange, options }: { value?: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl py-2.5 text-sm font-medium transition-all",
            value === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}