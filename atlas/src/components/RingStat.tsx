import { cn } from "@/lib/utils";

type Color = "primary" | "warning" | "destructive" | "success";

const colorMap: Record<Color, string> = {
  primary: "text-primary",
  warning: "text-warning",
  destructive: "text-destructive",
  success: "text-success",
};

export function RingStat({
  label,
  value,
  total,
  unit,
  color = "primary",
}: {
  label: string;
  value: number;
  total: number;
  unit?: string;
  color?: Color;
}) {
  const pct = Math.max(0, Math.min(1, value / total));
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3">
      <div className={cn("relative", colorMap[color])}>
        <svg width="64" height="64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} stroke="currentColor" strokeOpacity="0.15" strokeWidth="5" fill="none" />
          <circle
            cx="32" cy="32" r={r}
            stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-[13px] font-bold text-foreground">{value}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">/ {total}{unit ? ` ${unit}` : ""}</p>
      </div>
    </div>
  );
}