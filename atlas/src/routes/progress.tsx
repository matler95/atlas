import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BODYWEIGHT_HISTORY, MUSCLE_VOLUME, STRENGTH_PROGRESS, STREAK_HEATMAP } from "@/lib/mock-data";
import { Sparkline } from "@/components/charts/Sparkline";
import { TrendingUp, Droplets, Scale, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Progress - Atlas" }] }),
  component: Progress,
});

function Progress() {
  const [tab, setTab] = useState("body");
  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Progress</h1>
      <p className="mt-1 text-sm text-muted-foreground">Eight weeks in, and it shows.</p>

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-card p-1">
          <TabsTrigger value="body" className="rounded-xl text-xs">Body</TabsTrigger>
          <TabsTrigger value="strength" className="rounded-xl text-xs">Strength</TabsTrigger>
          <TabsTrigger value="volume" className="rounded-xl text-xs">Volume</TabsTrigger>
          <TabsTrigger value="streak" className="rounded-xl text-xs">Streaks</TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="mt-5 space-y-3">
          <BigStat icon={Scale} label="Bodyweight" value={`${BODYWEIGHT_HISTORY.at(-1)!.kg} kg`} sub="-2.1 kg in 8 weeks" tone="success">
            <Sparkline points={BODYWEIGHT_HISTORY.map((b) => b.kg)} className="h-16 w-full text-primary" />
          </BigStat>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Body fat" value="17.4%" sub="approx" />
            <MiniStat label="Lean mass" value="67.8 kg" sub="approx" />
            <MiniStat label="BMI" value="24.1" sub="healthy" />
            <MiniStat label="Hydration" value="2.3 L" sub="today" icon={Droplets} />
          </div>
          <p className="pt-1 text-xs text-muted-foreground">Body composition is approximated. Backend integration pending.</p>
        </TabsContent>

        <TabsContent value="strength" className="mt-5 space-y-3">
          {STRENGTH_PROGRESS.map((s) => (
            <div key={s.exercise} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.exercise}</p>
                  <p className="text-xs text-muted-foreground">+{(s.current - s.data[0]).toFixed(1)} kg over 8 sessions</p>
                </div>
                <p className="text-2xl font-bold">{s.current}<span className="text-sm font-medium text-muted-foreground">kg</span></p>
              </div>
              <Sparkline points={s.data} className="mt-3 h-12 w-full text-primary" />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="volume" className="mt-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sets per muscle · this week</p>
            <div className="mt-4 space-y-3">
              {MUSCLE_VOLUME.map((m) => {
                const pct = Math.min(100, (m.sets / m.target) * 100);
                const over = m.sets > m.target;
                return (
                  <div key={m.muscle}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{m.muscle}</span>
                      <span className={cn("text-xs", over ? "text-primary" : m.sets >= m.target * 0.9 ? "text-success" : "text-muted-foreground")}>
                        {m.sets} / {m.target} sets
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="streak" className="mt-5 space-y-3">
          <BigStat icon={Flame} label="Current streak" value="6 weeks" sub="Personal best: 9 weeks" tone="warning" />
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activity · last 12 months</p>
            <Heatmap />
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={cn("h-2.5 w-2.5 rounded-sm", heatColor(i))} />
              ))}
              <span>More</span>
            </div>
          </div>
          <MiniStat label="Plan compliance" value="87%" sub="last 4 weeks" icon={TrendingUp} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function heatColor(i: number) {
  return ["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary"][i];
}

function Heatmap() {
  const weeks: typeof STREAK_HEATMAP[] = [];
  for (let i = 0; i < STREAK_HEATMAP.length; i += 7) weeks.push(STREAK_HEATMAP.slice(i, i + 7));
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((d) => (
              <div key={d.date} className={cn("h-2.5 w-2.5 rounded-sm", heatColor(d.intensity))} title={d.date} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BigStat({ icon: Icon, label, value, sub, tone, children }: { icon: any; label: string; value: string; sub?: string; tone?: "success" | "warning" | "primary"; children?: React.ReactNode }) {
  const toneClass = tone === "success" ? "text-success bg-success/15" : tone === "warning" ? "text-warning bg-warning/15" : "text-primary bg-primary/15";
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl", toneClass)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function MiniStat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon?: any }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}