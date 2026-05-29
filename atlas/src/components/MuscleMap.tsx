import { cn } from '@/lib/utils'

interface MuscleMapProps {
  activeMuscles: string[]
  secondaryMuscles?: string[]
  showBothSides?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = { sm: 80, md: 120, lg: 180 }

// Muscle → SVG region mapping (front view: chest, abs, quads, biceps, forearms, shoulders, adductors)
// Back view: lats, traps, middle_back, lower_back, hamstrings, glutes, calves, triceps
const FRONT_MUSCLES: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  chest:       { cx: 60, cy: 55, rx: 22, ry: 12 },
  abdominals:  { cx: 60, cy: 85, rx: 14, ry: 18 },
  quadriceps:  { cx: 60, cy: 150, rx: 16, ry: 30 },
  biceps:      { cx: 28, cy: 75, rx: 8,  ry: 18 },
  forearms:    { cx: 24, cy: 110, rx: 6,  ry: 16 },
  shoulders:   { cx: 38, cy: 40, rx: 12, ry: 10 },
  adductors:   { cx: 60, cy: 140, rx: 10, ry: 16 },
  abdominals_lower: { cx: 60, cy: 105, rx: 12, ry: 8 },
}

const BACK_MUSCLES: Record<string, { cx: number; cy: number; rx: number; ry: number }> = {
  lats:         { cx: 60, cy: 65, rx: 20, ry: 16 },
  traps:        { cx: 60, cy: 32, rx: 18, ry: 10 },
  middle_back:  { cx: 60, cy: 55, rx: 18, ry: 10 },
  lower_back:   { cx: 60, cy: 85, rx: 14, ry: 10 },
  hamstrings:   { cx: 60, cy: 150, rx: 16, ry: 28 },
  glutes:       { cx: 60, cy: 115, rx: 20, ry: 14 },
  calves:       { cx: 60, cy: 200, rx: 12, ry: 20 },
  triceps:      { cx: 28, cy: 75, rx: 8,  ry: 16 },
}

function getMuscleColor(
  muscle: string,
  activeMuscles: string[],
  secondaryMuscles: string[]
): { fill: string; opacity: number } {
  if (activeMuscles.includes(muscle)) return { fill: '#6366f1', opacity: 0.85 }
  if (secondaryMuscles.includes(muscle)) return { fill: '#a5b4fc', opacity: 0.6 }
  return { fill: '#374151', opacity: 0.4 }
}

function renderBodyOutline() {
  // Simplified human body outline
  return (
    <g opacity={0.3} stroke="#6b7280" strokeWidth={1} fill="none">
      {/* Head */}
      <ellipse cx={60} cy={15} rx={10} ry={12} />
      {/* Torso */}
      <path d="M 40 27 Q 35 45 30 75 L 30 130 Q 40 140 60 140 Q 80 140 90 130 L 90 75 Q 85 45 80 27 Z" />
      {/* Arms */}
      <path d="M 30 35 L 15 55 L 10 90 L 12 120" />
      <path d="M 90 35 L 105 55 L 110 90 L 108 120" />
      {/* Legs */}
      <path d="M 45 135 L 42 180 L 40 220 L 42 250" />
      <path d="M 75 135 L 78 180 L 80 220 L 78 250" />
    </g>
  )
}

function renderMuscleRegions(
  muscles: Record<string, { cx: number; cy: number; rx: number; ry: number }>,
  activeMuscles: string[],
  secondaryMuscles: string[]
) {
  return Object.entries(muscles).map(([name, pos]) => {
    // Map secondary muscle names to their display names
    const displayName = name.replace('_lower', '')
    const { fill, opacity } = getMuscleColor(displayName, activeMuscles, secondaryMuscles)
    return (
      <ellipse
        key={name}
        cx={pos.cx}
        cy={pos.cy}
        rx={pos.rx}
        ry={pos.ry}
        fill={fill}
        opacity={opacity}
        data-muscle={displayName}
      />
    )
  })
}

export function MuscleMap({ activeMuscles, secondaryMuscles = [], showBothSides = true, size = 'md' }: MuscleMapProps) {
  const width = SIZE_MAP[size]
  const height = Math.round(width * (260 / 120))

  return (
    <div className={cn('flex gap-2 items-start', !showBothSides && 'justify-center')}>
      {/* Front view */}
      <div className="flex flex-col items-center">
        {showBothSides && <span className="text-xs text-gray-400 mb-1">Front</span>}
        <svg viewBox="0 0 120 260" width={width} height={height}>
          {renderBodyOutline()}
          {renderMuscleRegions(FRONT_MUSCLES, activeMuscles, secondaryMuscles)}
        </svg>
      </div>

      {/* Back view */}
      {showBothSides && (
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 mb-1">Back</span>
          <svg viewBox="0 0 120 260" width={width} height={height}>
            {renderBodyOutline()}
            {renderMuscleRegions(BACK_MUSCLES, activeMuscles, secondaryMuscles)}
          </svg>
        </div>
      )}
    </div>
  )
}