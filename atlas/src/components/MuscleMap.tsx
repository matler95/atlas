import { cn } from "@/lib/utils";

// Canonical muscle group keys used across the app.
export type MuscleKey =
  | "chest"
  | "front_delts"
  | "side_delts"
  | "rear_delts"
  | "biceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "calves"
  | "traps"
  | "lats"
  | "mid_back"
  | "lower_back"
  | "triceps"
  | "glutes"
  | "hamstrings";

// Map free-text muscle labels (from EXERCISES) into canonical keys.
const ALIASES: Record<string, MuscleKey[]> = {
  "Chest": ["chest"],
  "Upper Chest": ["chest", "front_delts"],
  "Shoulders": ["front_delts", "side_delts"],
  "Front Delts": ["front_delts"],
  "Side Delts": ["side_delts"],
  "Rear Delts": ["rear_delts"],
  "Triceps": ["triceps"],
  "Biceps": ["biceps"],
  "Forearms": ["forearms"],
  "Core": ["abs"],
  "Hip Flexors": ["abs"],
  "Quads": ["quads"],
  "Hamstrings": ["hamstrings"],
  "Glutes": ["glutes"],
  "Calves": ["calves"],
  "Back": ["lats", "mid_back", "lower_back"],
  "Lats": ["lats"],
  "Mid Back": ["mid_back"],
  "Lower Back": ["lower_back"],
  "Traps": ["traps"],
};

export function muscleLabelsToKeys(labels: string[]): MuscleKey[] {
  const out = new Set<MuscleKey>();
  for (const l of labels) (ALIASES[l] ?? []).forEach((k) => out.add(k));
  return [...out];
}

// intensity: 0..1 per muscle (sets relative to target)
interface Props {
  intensities: Partial<Record<MuscleKey, number>>;
  className?: string;
}

function fill(v: number | undefined) {
  if (!v || v <= 0) return "hsl(var(--muscle-idle))";
  if (v < 0.5) return "hsl(var(--muscle-low))";
  if (v < 1) return "hsl(var(--muscle-mid))";
  return "hsl(var(--muscle-high))";
}

export function MuscleMap({ intensities, className }: Props) {
  const i = intensities;
  return (
    <div
      className={cn("grid grid-cols-2 gap-2", className)}
      style={{
        // Token fallbacks so the component works without extra CSS wiring.
        ["--muscle-idle" as any]: "240 6% 22%",
        ["--muscle-low" as any]: "150 60% 35%",
        ["--muscle-mid" as any]: "150 80% 50%",
        ["--muscle-high" as any]: "140 90% 60%",
      }}
    >
      {/* FRONT */}
      <svg viewBox="0 0 110 220" className="w-full">
        <Silhouette />
        {/* chest */}
        <ellipse cx="42" cy="68" rx="13" ry="9" fill={fill(i.chest)} />
        <ellipse cx="68" cy="68" rx="13" ry="9" fill={fill(i.chest)} />
        {/* front delts */}
        <ellipse cx="30" cy="58" rx="8" ry="7" fill={fill(i.front_delts)} />
        <ellipse cx="80" cy="58" rx="8" ry="7" fill={fill(i.front_delts)} />
        {/* side delts */}
        <ellipse cx="23" cy="63" rx="5" ry="8" fill={fill(i.side_delts)} />
        <ellipse cx="87" cy="63" rx="5" ry="8" fill={fill(i.side_delts)} />
        {/* biceps */}
        <ellipse cx="22" cy="84" rx="6" ry="11" fill={fill(i.biceps)} />
        <ellipse cx="88" cy="84" rx="6" ry="11" fill={fill(i.biceps)} />
        {/* forearms */}
        <ellipse cx="18" cy="108" rx="5" ry="12" fill={fill(i.forearms)} />
        <ellipse cx="92" cy="108" rx="5" ry="12" fill={fill(i.forearms)} />
        {/* abs */}
        <rect x="48" y="86" width="14" height="34" rx="3" fill={fill(i.abs)} />
        {/* obliques */}
        <ellipse cx="40" cy="105" rx="4" ry="10" fill={fill(i.obliques ?? i.abs)} />
        <ellipse cx="70" cy="105" rx="4" ry="10" fill={fill(i.obliques ?? i.abs)} />
        {/* quads */}
        <ellipse cx="44" cy="148" rx="10" ry="22" fill={fill(i.quads)} />
        <ellipse cx="66" cy="148" rx="10" ry="22" fill={fill(i.quads)} />
        {/* calves (front shins) */}
        <ellipse cx="44" cy="192" rx="7" ry="14" fill={fill(i.calves)} opacity="0.5" />
        <ellipse cx="66" cy="192" rx="7" ry="14" fill={fill(i.calves)} opacity="0.5" />
      </svg>
      {/* BACK */}
      <svg viewBox="0 0 110 220" className="w-full">
        <Silhouette />
        {/* traps */}
        <path d="M40 52 L55 44 L70 52 L62 66 L55 60 L48 66 Z" fill={fill(i.traps)} />
        {/* rear delts */}
        <ellipse cx="28" cy="60" rx="7" ry="7" fill={fill(i.rear_delts)} />
        <ellipse cx="82" cy="60" rx="7" ry="7" fill={fill(i.rear_delts)} />
        {/* lats */}
        <path d="M36 70 Q30 95 42 110 L48 90 Z" fill={fill(i.lats)} />
        <path d="M74 70 Q80 95 68 110 L62 90 Z" fill={fill(i.lats)} />
        {/* mid back */}
        <rect x="46" y="68" width="18" height="28" rx="3" fill={fill(i.mid_back)} />
        {/* lower back */}
        <rect x="46" y="98" width="18" height="20" rx="3" fill={fill(i.lower_back)} />
        {/* triceps */}
        <ellipse cx="22" cy="84" rx="6" ry="11" fill={fill(i.triceps)} />
        <ellipse cx="88" cy="84" rx="6" ry="11" fill={fill(i.triceps)} />
        {/* forearms */}
        <ellipse cx="18" cy="108" rx="5" ry="12" fill={fill(i.forearms)} />
        <ellipse cx="92" cy="108" rx="5" ry="12" fill={fill(i.forearms)} />
        {/* glutes */}
        <ellipse cx="44" cy="128" rx="10" ry="11" fill={fill(i.glutes)} />
        <ellipse cx="66" cy="128" rx="10" ry="11" fill={fill(i.glutes)} />
        {/* hamstrings */}
        <ellipse cx="44" cy="158" rx="10" ry="18" fill={fill(i.hamstrings)} />
        <ellipse cx="66" cy="158" rx="10" ry="18" fill={fill(i.hamstrings)} />
        {/* calves */}
        <ellipse cx="44" cy="192" rx="7" ry="14" fill={fill(i.calves)} />
        <ellipse cx="66" cy="192" rx="7" ry="14" fill={fill(i.calves)} />
      </svg>
    </div>
  );
}

function Silhouette() {
  return (
    <g fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1">
      {/* head */}
      <circle cx="55" cy="22" r="12" />
      {/* neck */}
      <rect x="50" y="33" width="10" height="8" />
      {/* torso */}
      <path d="M28 46 Q40 40 55 40 Q70 40 82 46 L86 88 Q80 110 78 122 L70 124 Q60 122 55 122 Q50 122 40 124 L32 122 Q30 110 24 88 Z" />
      {/* arms */}
      <path d="M28 46 Q14 60 14 80 L14 120 Q14 128 22 128 Q26 128 26 120 L28 80 Z" />
      <path d="M82 46 Q96 60 96 80 L96 120 Q96 128 88 128 Q84 128 84 120 L82 80 Z" />
      {/* legs */}
      <path d="M36 124 L34 180 L38 212 L48 212 L50 180 L52 124 Z" />
      <path d="M74 124 L76 180 L72 212 L62 212 L60 180 L58 124 Z" />
    </g>
  );
}