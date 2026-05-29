import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EXERCISES, type Exercise } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({ meta: [{ title: "Exercise library - Atlas" }] }),
  component: Library,
});

const FILTERS = ["all", "push", "pull", "legs", "core"] as const;
type Filter = typeof FILTERS[number];

function Library() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (!ql) return true;
      return (
        e.name.toLowerCase().includes(ql) ||
        e.primaryMuscles.some((m) => m.toLowerCase().includes(ql)) ||
        e.equipment.toLowerCase().includes(ql)
      );
    });
  }, [q, filter]);

  return (
    <div className="px-5 pb-6 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Library</h1>
      <p className="mt-1 text-sm text-muted-foreground">{EXERCISES.length} exercises · tap any for cues</p>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercise or muscle" className="h-12 rounded-2xl pl-11" />
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <ul className="mt-5 space-y-2">
        {results.map((ex) => (
          <ExerciseRow key={ex.id} ex={ex} open={openId === ex.id} onToggle={() => setOpenId(openId === ex.id ? null : ex.id)} />
        ))}
        {results.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No exercises match.</p>}
      </ul>
    </div>
  );
}

function ExerciseRow({ ex, open, onToggle }: { ex: Exercise; open: boolean; onToggle: () => void }) {
  return (
    <li className={cn("overflow-hidden rounded-2xl border bg-card transition-all", open ? "border-primary/40" : "border-border")}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{ex.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {ex.primaryMuscles.join(", ")} · {ex.equipment}
          </p>
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-border bg-background/30 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-sm leading-relaxed">{ex.instructions}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ex.primaryMuscles.map((m) => (
              <span key={m} className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">{m}</span>
            ))}
            {ex.secondaryMuscles.map((m) => (
              <span key={m} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{m}</span>
            ))}
            <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs capitalize text-muted-foreground">{ex.difficulty}</span>
          </div>
        </div>
      )}
    </li>
  );
}