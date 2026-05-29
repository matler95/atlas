// Mock data for the MVP. Replace with Supabase queries later.

export interface Exercise {
  id: string;
  name: string;
  category: "push" | "pull" | "legs" | "core" | "cardio" | "full_body";
  equipment: "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "kettlebell";
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string;
  difficulty: "beginner" | "intermediate" | "advanced";
}

export const EXERCISES: Exercise[] = [
  { id: "bench-press", name: "Barbell Bench Press", category: "push", equipment: "barbell", primaryMuscles: ["Chest"], secondaryMuscles: ["Triceps", "Front Delts"], instructions: "Lie on bench, grip slightly wider than shoulders. Lower bar to mid-chest with control, then press up explosively. Keep shoulder blades retracted.", difficulty: "intermediate" },
  { id: "incline-db-press", name: "Incline Dumbbell Press", category: "push", equipment: "dumbbell", primaryMuscles: ["Upper Chest"], secondaryMuscles: ["Front Delts", "Triceps"], instructions: "Set bench to 30°. Press dumbbells from chest level up and slightly inward. Squeeze at the top.", difficulty: "intermediate" },
  { id: "ohp", name: "Overhead Press", category: "push", equipment: "barbell", primaryMuscles: ["Shoulders"], secondaryMuscles: ["Triceps", "Upper Chest"], instructions: "Stand with bar at collarbone. Brace core, press straight up, finish with bar over mid-foot.", difficulty: "intermediate" },
  { id: "tricep-pushdown", name: "Tricep Pushdown", category: "push", equipment: "cable", primaryMuscles: ["Triceps"], secondaryMuscles: [], instructions: "Cable at top. Keep elbows pinned, extend forearms down until lockout. Slow eccentric.", difficulty: "beginner" },
  { id: "lateral-raise", name: "Dumbbell Lateral Raise", category: "push", equipment: "dumbbell", primaryMuscles: ["Side Delts"], secondaryMuscles: [], instructions: "Slight forward lean. Raise dumbbells to shoulder height with pinky up. Control the descent.", difficulty: "beginner" },
  { id: "deadlift", name: "Conventional Deadlift", category: "pull", equipment: "barbell", primaryMuscles: ["Back", "Hamstrings", "Glutes"], secondaryMuscles: ["Forearms", "Traps"], instructions: "Bar over mid-foot, hinge to grip, brace, drive through floor. Keep bar close.", difficulty: "advanced" },
  { id: "pullup", name: "Pull-Up", category: "pull", equipment: "bodyweight", primaryMuscles: ["Lats"], secondaryMuscles: ["Biceps", "Mid Back"], instructions: "Hang from bar with full extension. Pull chest to bar by driving elbows down.", difficulty: "intermediate" },
  { id: "barbell-row", name: "Barbell Row", category: "pull", equipment: "barbell", primaryMuscles: ["Mid Back"], secondaryMuscles: ["Lats", "Biceps"], instructions: "Hinge to ~45°. Row bar to lower chest, squeeze shoulder blades.", difficulty: "intermediate" },
  { id: "lat-pulldown", name: "Lat Pulldown", category: "pull", equipment: "cable", primaryMuscles: ["Lats"], secondaryMuscles: ["Biceps"], instructions: "Wide grip. Pull bar to upper chest, drive elbows down and back.", difficulty: "beginner" },
  { id: "db-curl", name: "Dumbbell Curl", category: "pull", equipment: "dumbbell", primaryMuscles: ["Biceps"], secondaryMuscles: ["Forearms"], instructions: "Stand tall. Curl with supination, squeeze at top, control the negative.", difficulty: "beginner" },
  { id: "squat", name: "Back Squat", category: "legs", equipment: "barbell", primaryMuscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings", "Core"], instructions: "Bar on upper back. Brace, sit down and back to depth, drive through mid-foot.", difficulty: "advanced" },
  { id: "rdl", name: "Romanian Deadlift", category: "legs", equipment: "barbell", primaryMuscles: ["Hamstrings", "Glutes"], secondaryMuscles: ["Lower Back"], instructions: "Soft knees. Hinge at hips, push hips back, feel hamstring stretch, return.", difficulty: "intermediate" },
  { id: "leg-press", name: "Leg Press", category: "legs", equipment: "machine", primaryMuscles: ["Quads"], secondaryMuscles: ["Glutes", "Hamstrings"], instructions: "Feet shoulder-width on platform. Lower to ~90° knee, press through whole foot.", difficulty: "beginner" },
  { id: "lunges", name: "Walking Lunges", category: "legs", equipment: "dumbbell", primaryMuscles: ["Quads", "Glutes"], secondaryMuscles: ["Hamstrings"], instructions: "Step forward into lunge, back knee just above floor, drive up to next step.", difficulty: "intermediate" },
  { id: "calf-raise", name: "Standing Calf Raise", category: "legs", equipment: "machine", primaryMuscles: ["Calves"], secondaryMuscles: [], instructions: "Full stretch at bottom, explosive rise, pause at top.", difficulty: "beginner" },
  { id: "plank", name: "Plank", category: "core", equipment: "bodyweight", primaryMuscles: ["Core"], secondaryMuscles: ["Shoulders"], instructions: "Forearms down, body straight line. Brace abs and glutes. Hold.", difficulty: "beginner" },
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", category: "core", equipment: "bodyweight", primaryMuscles: ["Core", "Hip Flexors"], secondaryMuscles: [], instructions: "Hang from bar. Lift legs to hip height with control, no swing.", difficulty: "intermediate" },
  { id: "cable-crunch", name: "Cable Crunch", category: "core", equipment: "cable", primaryMuscles: ["Core"], secondaryMuscles: [], instructions: "Kneel under cable. Crunch ribs to pelvis, hold brief contraction.", difficulty: "beginner" },
];

export interface PlannedWorkout {
  id: string;
  name: string;
  day: string; // e.g. "Mon"
  type: "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Full Body";
  exerciseIds: string[];
  estMinutes: number;
  status: "upcoming" | "today" | "done" | "missed";
}

export const WEEKLY_PLAN: PlannedWorkout[] = [
  { id: "w1", name: "Push Day", day: "Mon", type: "Push", exerciseIds: ["bench-press", "incline-db-press", "ohp", "lateral-raise", "tricep-pushdown"], estMinutes: 58, status: "done" },
  { id: "w2", name: "Pull Day", day: "Wed", type: "Pull", exerciseIds: ["deadlift", "pullup", "barbell-row", "db-curl"], estMinutes: 52, status: "today" },
  { id: "w3", name: "Leg Day", day: "Fri", type: "Legs", exerciseIds: ["squat", "rdl", "leg-press", "lunges", "calf-raise"], estMinutes: 65, status: "upcoming" },
];

export const STRENGTH_PROGRESS = [
  { exercise: "Bench Press", current: 92.5, data: [70, 75, 77.5, 82.5, 85, 87.5, 90, 92.5] },
  { exercise: "Deadlift", current: 150, data: [110, 120, 130, 135, 140, 145, 147.5, 150] },
  { exercise: "Back Squat", current: 125, data: [90, 95, 100, 110, 115, 120, 122.5, 125] },
  { exercise: "Overhead Press", current: 55, data: [40, 42.5, 45, 47.5, 50, 50, 52.5, 55] },
];

export const BODYWEIGHT_HISTORY = [
  { week: 1, kg: 84.2 }, { week: 2, kg: 83.8 }, { week: 3, kg: 83.5 },
  { week: 4, kg: 83.1 }, { week: 5, kg: 82.9 }, { week: 6, kg: 82.6 },
  { week: 7, kg: 82.4 }, { week: 8, kg: 82.1 },
];

export const MUSCLE_VOLUME = [
  { muscle: "Chest", sets: 14, target: 12 },
  { muscle: "Back", sets: 18, target: 16 },
  { muscle: "Shoulders", sets: 10, target: 12 },
  { muscle: "Quads", sets: 12, target: 12 },
  { muscle: "Hamstrings", sets: 8, target: 10 },
  { muscle: "Biceps", sets: 9, target: 8 },
  { muscle: "Triceps", sets: 11, target: 8 },
  { muscle: "Core", sets: 6, target: 8 },
];

// Generate a year of streak heatmap data (deterministic mock)
export const STREAK_HEATMAP = (() => {
  const days: { date: string; intensity: number }[] = [];
  const today = new Date();
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // Pseudo-random based on date
    const seed = (d.getDate() * 7 + d.getMonth() * 13 + d.getFullYear()) % 9;
    const intensity = seed > 5 ? 0 : seed === 0 ? 1 : seed === 1 ? 2 : seed === 2 ? 3 : seed === 3 ? 4 : 0;
    days.push({ date: d.toISOString().slice(0, 10), intensity });
  }
  return days;
})();