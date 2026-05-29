# Atlas - Implementation Plan

> **Version:** 1.3 (Load Prescription System)
> **Stack:** React + Vite · TanStack Router/Query · Supabase · TypeScript

---

## Algorithm Accuracy Upgrade - Garmin Parity Without Sensors

Garmin's readiness, training load, and performance metrics are grounded in continuous physiological signals (HRV, resting HR, SpO₂). Without those, accuracy can still approach that level by substituting **higher-quality behavioral proxies** and **adaptive per-user models** in place of static population averages. The ten upgrades below require no new hardware - only data already collected or trivially collectible via one extra UI prompt.

### The Signal Substitution Map

| Garmin Signal | What It Measures | Our Substitute |
|---|---|---|
| HRV morning scan | Autonomic recovery state | Pre-session check-in (1–5) + RPE trend delta |
| Resting HR trend | Chronic fatigue accumulation | EWMA fitness/fatigue (Banister model) on session load |
| Sleep score (watch) | Sleep quality + duration | Self-reported hours + optional quality rating |
| VO₂max estimate | Aerobic fitness proxy | Not applicable (strength app) - use e1RM trend instead |
| Body Battery | Integrated recovery reserve | Composite readiness: EWMA fatigue + check-in + sleep + stress |
| Training Load | Acute vs chronic stress ratio | ACWR via EWMA (replaces rolling-window ACWR) |

---

### Upgrade A - Replace Rolling ACWR with Banister EWMA Fitness/Fatigue Model

**Problem with current plan:** Rolling 28-day chronic load average has two failure modes: it reacts too slowly to ramp-up phases (masks overtraining risk) and is too sensitive to single missed weeks (triggers false deload flags). It also treats all sessions equally regardless of recency.

**Solution:** Banister impulse-response model - industry standard in sports science, used internally by Garmin, TrainingPeaks, and Whoop. Requires no new data.

```typescript
// src/lib/algorithms/fatigue.ts - replace computeACWR entirely

interface FitnessState {
  fitness: number   // CTL: Chronic Training Load - slow decay, represents adaptation
  fatigue: number   // ATL: Acute Training Load - fast decay, represents accumulated stress
  form: number      // TSB: Training Stress Balance = fitness - fatigue (negative = fatigued)
}

const FITNESS_TC  = 42  // days - time constant for fitness decay (CTL)
const FATIGUE_TC  = 7   // days - time constant for fatigue decay (ATL)
const FITNESS_K   = 1 - Math.exp(-1 / FITNESS_TC)   // ≈ 0.0233
const FATIGUE_K   = 1 - Math.exp(-1 / FATIGUE_TC)   // ≈ 0.1331

function updateFitnessState(prev: FitnessState, todayLoad: number): FitnessState {
  const fitness = prev.fitness + FITNESS_K * (todayLoad - prev.fitness)
  const fatigue = prev.fatigue + FATIGUE_K * (todayLoad - prev.fatigue)
  return { fitness, fatigue, form: fitness - fatigue }
}

// Bootstrap: iterate over all historical sessions in chronological order
// On days with no session, call updateFitnessState(prev, 0)
function buildFitnessHistory(sessions: DatedLoad[]): FitnessState {
  let state: FitnessState = { fitness: 0, fatigue: 0, form: 0 }
  const sessionMap = new Map(sessions.map(s => [toDateString(s.date), s.load]))
  const start = sessions[0]?.date ?? new Date()
  const today = new Date()
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const load = sessionMap.get(toDateString(d)) ?? 0
    state = updateFitnessState(state, load)
  }
  return state
}

// Deload trigger: form < -30 (heavily fatigued) OR fatigue/fitness ratio > 1.5
function shouldDeload(state: FitnessState): boolean {
  return state.form < -30 || (state.fitness > 0 && state.fatigue / state.fitness > 1.5)
}
```

**Schema addition:**
```sql
-- Materialised daily snapshot - recomputed nightly via Supabase scheduled function
-- Avoids recomputing full history on every dashboard load
fitness_snapshots (
  user_id uuid FK,
  date date,
  fitness  numeric,  -- CTL
  fatigue  numeric,  -- ATL
  form     numeric,  -- TSB
  PRIMARY KEY (user_id, date)
)
```

**Readiness score update:** Replace `acwrScore` component with form-based score:
```typescript
// form range: typically -50 (overtrained) to +25 (fresh/detrained)
// Peak performance zone: form -5 to +5
const formScore = clamp(0, 30, 30 * (1 - Math.abs(state.form) / 40))
```

---

### Upgrade B - Pre-Session Check-In (The Single Biggest Accuracy Lever)

**Problem with current plan:** `sleep_hours` and `stress_level` are collected once at onboarding and never updated per session. This means the readiness score is based on stale static data - equivalent to Garmin reading your HRV from the day you bought the watch and never again.

**Solution:** One mandatory question before each workout starts. Five seconds of friction, large accuracy return.

```
"How are you feeling today?" → ⚡ 1  😐 2  🙂 3  💪 4  🔥 5
```

Optional second question shown only if check-in ≤ 2:
```
"What's dragging you down?" → 😴 Poor sleep  😰 High stress  💢 Sore muscles  🤒 Feeling ill
```

**Schema addition:**
```sql
-- Add to workout_sessions:
ALTER TABLE workout_sessions ADD COLUMN checkin_score int;        -- 1–5
ALTER TABLE workout_sessions ADD COLUMN checkin_limiters text[];  -- ['sleep','stress','soreness','illness']
```

**Usage in readiness score:**
```typescript
// Replace static sleep/stress from user_profiles with rolling check-in EMA
function rollingCheckinEMA(recentSessions: WorkoutSession[], k = 0.3): number {
  // k = 0.3 weights last session at 30%, session before at 21%, etc.
  return recentSessions
    .filter(s => s.checkin_score != null)
    .reduce((ema, s) => k * s.checkin_score! + (1 - k) * ema, 3.0) // seed at neutral 3
}

// Updated readiness formula:
function readinessScore(fitnessState: FitnessState, checkinEMA: number, sleepHours: number): number {
  const formScore    = clamp(0, 35, 35 * (1 - Math.abs(fitnessState.form) / 40))
  const checkinScore = clamp(0, 40, (checkinEMA / 5) * 40)
  const sleepScore   = clamp(0, 25, Math.min(sleepHours / 8, 1) * 25)
  return Math.round(formScore + checkinScore + sleepScore)
}
```

**Deload trigger update:** Add check-in signal:
- 3 consecutive check-ins ≤ 2 → suggest deload regardless of EWMA state
- check-in ≤ 1 with limiter `'illness'` → recommend rest day, block workout start (with override)

---

### Upgrade C - Epley e1RM for Normalized Strength Tracking

**Problem with current plan:** `MAX(weight_kg)` per week as the strength metric is volume-dependent - a week where the user did 3×5 at 100kg looks worse than a week of 3×12 at 70kg, even if fitness improved. Progress charts will show noise, not signal.

**Solution:** Epley formula converts any set to an estimated 1RM, normalizing across rep ranges and loading schemes. This is what every serious strength tracking app uses.

```typescript
// src/lib/algorithms/strength.ts

// Epley formula (best accuracy in 1–10 rep range; do not apply to sets > 12 reps)
function epley1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  if (reps > 12)  return weight  // formula degrades; return raw weight as floor
  return weight * (1 + reps / 30)
}

// RPE-adjusted 1RM: more accurate when RPE is logged
// Uses Helms percentage table (RPE 10 = true 1RM, RPE 8 = ~94% of 1RM for most lifters)
const rpePercentage: Record<number, number> = {
  10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91,
  8: 0.89, 7.5: 0.86, 7: 0.83, 6.5: 0.80, 6: 0.77
}

function rpeAdjusted1RM(weight: number, reps: number, rpe: number): number {
  const epleyMax = epley1RM(weight, reps)
  const rpePct = rpePercentage[rpe] ?? rpePercentage[Math.round(rpe)]
  if (!rpePct) return epleyMax
  return epleyMax / rpePct
}

// Best estimated 1RM for a session: take the set with highest e1RM
function sessionE1RM(sets: SessionSet[]): number {
  return Math.max(...sets.map(s => rpeAdjusted1RM(s.weight_kg, s.reps, s.rpe)))
}
```

**Schema addition:**
```sql
-- Materialised per-exercise per-session e1RM - updated after each session completion
-- Powers strength charts without recomputing on every page load
exercise_e1rm_history (
  user_id uuid FK,
  exercise_id uuid FK,
  session_id uuid FK,
  date date,
  e1rm_kg numeric,
  PRIMARY KEY (user_id, exercise_id, session_id)
)
```

**Strength progress query update:**
```sql
-- Replace MAX(weight_kg) with e1rm_kg from materialised table
SELECT date, e1rm_kg FROM exercise_e1rm_history
WHERE user_id = auth.uid() AND exercise_id = $1
ORDER BY date
```

**Progressive overload update:** Use e1RM trend instead of raw weight for deload detection:
```typescript
// If e1RM for an exercise has dropped >5% over 3 consecutive sessions → flag plateau
function detectPlateau(e1rmHistory: number[]): 'progressing' | 'plateau' | 'regression' {
  if (e1rmHistory.length < 3) return 'progressing'
  const recent = e1rmHistory.slice(-3)
  const trend = (recent[2] - recent[0]) / recent[0]
  if (trend > 0.01)  return 'progressing'
  if (trend > -0.05) return 'plateau'
  return 'regression'
}
```

---

### Upgrade D - RPE Calibration Drift Correction

**Problem with current plan:** RPE is treated as a stable, calibrated signal. In reality, beginners systematically under-rate RPE (they report RPE 7 on sets that are actually RPE 9 because they don't know what near-failure feels like). As users gain experience, their RPE calibration shifts. The progressive overload thresholds (`RPE ≤ 7` → progress) will misfire for months with new users.

**Solution:** Track a per-user RPE calibration offset derived from completion rate vs reported RPE. If a user consistently reports RPE 7 but fails to complete target reps 40% of the time, their RPE is deflated - adjust thresholds accordingly.

```typescript
// src/lib/algorithms/rpe-calibration.ts

interface RpeCalibration {
  offset: number      // negative = user underestimates effort (common for beginners)
  confidence: number  // 0–1, based on sample size
}

function computeRpeCalibration(recentSets: SessionSet[], targetReps: number): RpeCalibration {
  const sample = recentSets.filter(s => s.rpe >= 6 && s.rpe <= 9)
  if (sample.length < 20) return { offset: 0, confidence: 0 }

  // At RPE 8, completion rate should be ~90% (can finish but hard)
  // If actual completion rate at reported-RPE-8 is 60%, user's real RPE was ~9.5
  const rpe8Sets = sample.filter(s => s.rpe === 8)
  const completionAtRpe8 = rpe8Sets.filter(s => s.reps >= targetReps).length / rpe8Sets.length
  const expectedCompletion = 0.90
  const offset = (expectedCompletion - completionAtRpe8) * -2.5  // scale to RPE units

  return {
    offset: clamp(-2, 0.5, offset),  // cap: can only correct downward for beginners + small positive
    confidence: Math.min(1, sample.length / 50)
  }
}

// Apply when reading RPE in progressive overload decisions:
function calibratedRpe(raw: number, cal: RpeCalibration): number {
  return raw + cal.offset * cal.confidence
}
```

**Schema addition:**
```sql
ALTER TABLE user_profiles ADD COLUMN rpe_offset numeric DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN rpe_calibration_confidence numeric DEFAULT 0;
-- Recomputed monthly via scheduled function
```

---

### Upgrade E - Intra-Session Fatigue Rate as Volume Signal

**Problem with current plan:** Volume landmarks (MEV/MAV/MRV) are fixed population averages that don't adapt to the individual. A user with fast fatigue accumulation will hit MRV at lower volumes than the table predicts.

**Solution:** Use RPE progression within a session - the rate at which RPE rises across sets at the same weight - as a per-user fatigue accumulation signal. This directly informs when to cap volume for that individual.

```typescript
// src/lib/algorithms/intra-session-fatigue.ts

// For a given exercise in a session, measure how fast RPE climbed per set
function rpeRiseRate(sets: SessionSet[]): number | null {
  if (sets.length < 2) return null
  const sorted = [...sets].sort((a, b) => a.set_number - b.set_number)
  const deltas = sorted.slice(1).map((s, i) => s.rpe - sorted[i].rpe)
  return mean(deltas)  // RPE points per set
}

// Threshold: if rpeRiseRate > 1.5 per set, this user accumulates fatigue faster than average
// Lower their per-session set cap for this muscle group accordingly
function personalMRVModifier(rpeRiseRate: number): number {
  if (rpeRiseRate <= 0.5) return 1.1   // slow fatigue accumulator - can handle more
  if (rpeRiseRate <= 1.0) return 1.0   // average
  if (rpeRiseRate <= 1.5) return 0.9   // moderate accumulator
  return 0.8                            // fast accumulator - reduce volume ceiling
}
```

**Schema addition:**
```sql
ALTER TABLE user_profiles ADD COLUMN fatigue_accumulation_modifier numeric DEFAULT 1.0;
-- Updated after each session by a background job
```

**Usage:** Multiply all MRV values by `fatigue_accumulation_modifier` before the volume color-coding in Phase 7.3, and before the sets cap in `calcSetsReps` (Phase 4.3).

---

### Upgrade F - Weight Increment Personalisation via Velocity Proxy

**Problem with current plan:** Fixed increments (2.5kg upper / 5kg lower) are beginner defaults. Intermediate and advanced lifters hit plateaus at these increments within weeks. The increment should be a function of the user's current training age and their recent rate of progress.

**Solution:** Derive a personalized increment from the slope of the e1RM trend (Upgrade C prerequisite).

```typescript
// src/lib/algorithms/progressive-overload.ts - update increment logic

function personalizedIncrement(
  exerciseId: string,
  e1rmHistory: number[],   // last 6 sessions
  experience: string
): number {
  const isLower = isLowerBodyExercise(exerciseId)
  const baseIncrement = isLower ? 5 : 2.5

  if (e1rmHistory.length < 4) return baseIncrement  // not enough data - use default

  // Calculate average weekly e1RM gain over last 4 sessions
  const weeklyGain = (e1rmHistory[e1rmHistory.length - 1] - e1rmHistory[0]) / (e1rmHistory.length - 1)

  // If progressing fast (beginner): use base increment
  // If progressing slowly (intermediate+): use smaller micro-increment
  if (weeklyGain > baseIncrement * 0.8) return baseIncrement
  if (weeklyGain > baseIncrement * 0.3) return baseIncrement * 0.5  // half-increment
  return baseIncrement * 0.25  // micro-load - suggest fractional plates
}
```

**UI implication:** When increment drops to micro-load territory, show a tip: *"Consider fractional plates (1.25kg) - you're in intermediate territory."*

---

### Upgrade G - Adaptive Volume Landmarks (Personal MEV/MAV/MRV)

**Problem with current plan:** Population MEV/MAV/MRV from the algorithm docs are starting estimates, not personal ground truth. Someone with high muscle fiber density may genuinely grow on 6 weekly sets (below population MEV). Using fixed values means the volume prescription stays suboptimal indefinitely.

**Solution:** Track performance response per volume level to build a per-user landmark model that converges over 8–12 weeks.

```typescript
// src/lib/algorithms/volume-landmarks.ts

interface VolumeLandmarks {
  mev: number  // Minimum Effective Volume
  mav: number  // Maximum Adaptive Volume
  mrv: number  // Maximum Recoverable Volume
  confidence: number  // 0–1; below 0.5 use population defaults as prior
}

// After each mesocycle (4-week block), compute:
// - At what weekly set count did e1RM start improving? → personal MEV
// - At what set count did improvement plateau? → personal MAV
// - At what set count did performance decline? → personal MRV
function updatePersonalLandmarks(
  weeklySets: number[],       // weekly volume per muscle group, last 12 weeks
  weeklyE1rmChange: number[], // corresponding performance delta
  populationDefaults: VolumeLandmarks
): VolumeLandmarks {
  if (weeklySets.length < 8) return { ...populationDefaults, confidence: 0 }

  // Fit a simple piecewise: flat → rising → plateau → decline
  // Use the population prior blended with observed data proportional to confidence
  const observedMEV = findInflectionPoint(weeklySets, weeklyE1rmChange, 'start')
  const observedMRV = findInflectionPoint(weeklySets, weeklyE1rmChange, 'decline')
  const conf = Math.min(1, weeklySets.length / 16)

  return {
    mev: lerp(populationDefaults.mev, observedMEV ?? populationDefaults.mev, conf),
    mav: lerp(populationDefaults.mav, (observedMEV + observedMRV) / 2 ?? populationDefaults.mav, conf),
    mrv: lerp(populationDefaults.mrv, observedMRV ?? populationDefaults.mrv, conf),
    confidence: conf
  }
}
```

**Schema addition:**
```sql
user_volume_landmarks (
  user_id uuid FK,
  muscle_group text,
  mev numeric,
  mav numeric,
  mrv numeric,
  confidence numeric DEFAULT 0,
  last_updated timestamptz,
  PRIMARY KEY (user_id, muscle_group)
)
-- Seeded at plan creation with population defaults; updated end of each 4-week block
```

---

### Upgrade H - Session Duration as Fatigue Proxy

**Problem with current plan:** `started_at` and `completed_at` are stored but never used algorithmically. Session duration is a free signal.

**Solution:** Compute actual vs planned duration ratio. Consistently longer sessions (user taking extra rest, moving slower) correlate with accumulated fatigue; sessions abandoned early are a strong deload signal.

```typescript
// Add to session load computation:
function sessionDurationModifier(
  actualMinutes: number,
  plannedMinutes: number  // from user_profiles.session_length_minutes
): number {
  const ratio = actualMinutes / plannedMinutes
  if (ratio < 0.5)  return 0.6   // abandoned - low load regardless of sets logged
  if (ratio < 0.8)  return 0.85
  if (ratio <= 1.3) return 1.0   // normal
  if (ratio <= 1.6) return 1.1   // grinding - slightly elevated load signal
  return 1.2                      // much longer than planned - elevated fatigue signal
}

// Apply to sessionLoad():
function sessionLoad(sets: SessionSet[], durationModifier: number): number {
  const rawLoad = sets.reduce((sum, s) => sum + s.set_number * s.reps * s.weight_kg * rpeMultiplier(s.rpe), 0)
  return rawLoad * durationModifier
}
```

---

### Upgrade I - Bodyweight Trend as Nutritional Recovery Signal

**Problem with current plan:** Bodyweight is logged and charted but never fed back into training algorithms. Rate of weight change carries meaningful information.

**Solution:** Use 7-day rolling bodyweight trend to modulate volume prescription and flag nutritional risk.

```typescript
// src/lib/algorithms/bodyweight-trend.ts

function bodyweightTrend(logs: BodyweightLog[]): {
  weeklyRateKg: number    // positive = gaining, negative = losing
  signal: 'bulk' | 'cut' | 'maintain' | 'rapid-loss' | 'insufficient-data'
} {
  const recent = logs.slice(-14).sort((a, b) => a.date.localeCompare(b.date))
  if (recent.length < 5) return { weeklyRateKg: 0, signal: 'insufficient-data' }

  // Linear regression slope over last 14 days → weekly rate
  const weeklyRate = linearRegressionSlope(recent.map(l => l.weight_kg)) * 7

  if (weeklyRate < -0.75) return { weeklyRateKg: weeklyRate, signal: 'rapid-loss' }
  if (weeklyRate < -0.2)  return { weeklyRateKg: weeklyRate, signal: 'cut' }
  if (weeklyRate > 0.5)   return { weeklyRateKg: weeklyRate, signal: 'bulk' }
  return { weeklyRateKg: weeklyRate, signal: 'maintain' }
}

// Apply in volume prescription:
// rapid-loss → reduce MRV by 15% (insufficient calories to recover from high volume)
// bulk → can tolerate full MAV/MRV
// cut → reduce MRV by 10%, prioritise compound exercises in scoring
function bodyweightVolumeModifier(signal: string): number {
  return { 'rapid-loss': 0.85, 'cut': 0.90, 'maintain': 1.0, 'bulk': 1.05, 'insufficient-data': 1.0 }[signal] ?? 1.0
}
```

**Dashboard implication:** If `signal === 'rapid-loss'` and goal is `muscle_gain` → show warning: *"Weight dropping faster than expected for muscle gain. Check calorie intake."*

---

### Upgrade J - Mesocycle Progression Planning (Periodisation Model)

**Problem with current plan:** Volume and load are prescribed weekly with no structured progression arc. This is the equivalent of Garmin suggesting today's workout without a training block plan - accurate locally, blind globally.

**Solution:** Implement a simple linear periodisation mesocycle model. 4-week blocks with a built-in deload week. Volume progresses within the block; the deload resets fatigue without losing fitness (the Banister model makes this visible via form score).

```typescript
// src/lib/algorithms/mesocycle.ts

interface Mesocycle {
  weekNumber: 1 | 2 | 3 | 4   // 1–3 = loading, 4 = deload
  volumeMultiplier: number
  intensityTarget: string      // rep range description
}

const mesocycleWeeks: Mesocycle[] = [
  { weekNumber: 1, volumeMultiplier: 0.85, intensityTarget: '10-12' },  // intro - lower volume, higher reps
  { weekNumber: 2, volumeMultiplier: 1.00, intensityTarget: '8-10' },
  { weekNumber: 3, volumeMultiplier: 1.10, intensityTarget: '6-8' },    // overreach - higher intensity
  { weekNumber: 4, volumeMultiplier: 0.55, intensityTarget: '10-12' },  // deload
]

function currentMesocycleWeek(planStartDate: Date): Mesocycle {
  const weeksSinceStart = Math.floor(daysBetween(planStartDate, new Date()) / 7)
  return mesocycleWeeks[weeksSinceStart % 4]
}
```

**Schema addition:**
```sql
ALTER TABLE workout_plans ADD COLUMN start_date date;
-- Mesocycle week is derived at runtime - no need to store it
```

**Usage:** Apply `volumeMultiplier` to the `calcSetsReps` output and `intensityTarget` to override the default rep range for each week. The deload week (week 4) naturally aligns with the Banister form score recovery peak - which is the key insight: deload isn't triggered only by distress signals, it's scheduled.

---

### New Schema Additions Summary

```sql
-- Add these tables/columns alongside the existing schema:

-- Upgrade A
fitness_snapshots (user_id, date, fitness, fatigue, form)

-- Upgrade B
ALTER TABLE workout_sessions ADD checkin_score int;
ALTER TABLE workout_sessions ADD checkin_limiters text[];

-- Upgrade C
exercise_e1rm_history (user_id, exercise_id, session_id, date, e1rm_kg)

-- Upgrade D
ALTER TABLE user_profiles ADD rpe_offset numeric DEFAULT 0;
ALTER TABLE user_profiles ADD rpe_calibration_confidence numeric DEFAULT 0;

-- Upgrade E
ALTER TABLE user_profiles ADD fatigue_accumulation_modifier numeric DEFAULT 1.0;

-- Upgrade G
user_volume_landmarks (user_id, muscle_group, mev, mav, mrv, confidence, last_updated)

-- Upgrade J
ALTER TABLE workout_plans ADD start_date date;
```

### Updated Algorithm Dependencies Map

```
workout_sessions (including checkin_score)
├── Banister EWMA (Upgrade A) → fitness_snapshots
├── readinessScore (Phase 8) ← form + checkinEMA + sleep
├── sessionLoad (Phase 9.1) ← sets × reps × weight × rpeMultiplier × durationMod
└── RPE calibration (Upgrade D) ← rpe vs completion rate

session_sets
├── e1RM (Upgrade C) → exercise_e1rm_history
├── intra-session fatigue rate (Upgrade E) → fatigue_accumulation_modifier
├── suggestNextWeight (Phase 6.1) ← calibratedRpe + personalizedIncrement (Upgrade F)
└── plateau detection (Upgrade C) ← e1rm trend slope

bodyweight_logs
└── bodyweight trend (Upgrade I) → volume modifier in calcSetsReps

workout_plans.start_date
└── mesocycle week (Upgrade J) → volumeMultiplier + intensityTarget

user_volume_landmarks
└── adaptive MEV/MAV/MRV (Upgrade G) - replaces static table after 8 weeks
```

### Implementation Order for Algorithm Upgrades

These cut across phases - implement in this order to avoid rework:

| Priority | Upgrade | Phase to Insert Into | Dependency |
|----------|---------|----------------------|------------|
| P0 | B - Pre-session check-in | Phase 5 (session start) | None - add one question |
| P0 | C - Epley e1RM | Phase 5 (set logging) | None |
| P1 | A - Banister EWMA | Phase 9 (replaces ACWR) | e1RM for load normalization |
| P1 | H - Duration modifier | Phase 9 (session load) | None |
| P2 | D - RPE calibration | Phase 6 (overload engine) | 20+ sessions of data |
| P2 | F - Personalized increments | Phase 6 (overload engine) | e1RM history (6+ sessions) |
| P2 | I - Bodyweight trend | Phase 7 (body tab) | 5+ bodyweight logs |
| P3 | E - Intra-session fatigue | Phase 7 (volume tracking) | 4+ weeks of sessions |
| P3 | G - Adaptive landmarks | Phase 7 (volume tracking) | 8–12 weeks of sessions |
| P3 | J - Mesocycle planning | Phase 4 (plan creation) | None - set `start_date` at plan creation |

---

## Critical Issues & Gaps (Review Before Starting)

Before executing the plan, address these structural concerns:

| # | Area | Issue | Risk |
|---|------|--------|------|
| 1 | Auth | PKCE flow requires `code_verifier` stored across redirects - ensure `sessionStorage` fallback for private browsers | Auth broken on Safari |
| 2 | Schema | `workout_day_exercises.suggested_weight` will be stale after plan edits - needs invalidation trigger | Wrong weight suggestions |
| 3 | Algo | ACWR denominator is zero on week 1 (no chronic load) - guard against divide-by-zero | Crash on new users |
| 4 | RLS | `exercises` SELECT open to all auth'd users is correct, but seed script needs service-role key, not anon | Seed script fails |
| 5 | i18n | Phase 10 introduces i18n late - string extraction retrofitted onto 9 phases of hardcoded strings is high effort; consider extracting from Phase 2 onward | Major rework in Sprint 10 |
| 6 | PWA | Service worker caching exercises table response (Phase 11) conflicts with auth headers - cache the REST response body, not the request | SW intercepts auth'd requests |
| 7 | GDPR | "Consider hashing age/height/weight" is vague - decide at schema design time (Phase 1), not Phase 12 | Schema migration under live data |
| 8 | Exercise swap | "Session-scoped override doesn't affect plan template" requires a separate `session_exercise_overrides` table not listed in the schema | Missing table |
| 9 | Deload | Volume modifier `0.5×` applied to `workout_day_exercises` mutates the plan - use a `deload_active` flag + modifier at read time instead | Plan permanently corrupted |
| 10 | Starting weight | `bodyweight × coefficient × 0.85` cap "at bodyweight for beginners" is ambiguous - deadlift starting at bodyweight is reasonable; bench is not. Needs per-exercise coefficient table | Dangerous weight suggestions |

---

## Architecture Overview

```
src/
├── lib/
│   ├── supabase.ts               # Typed client
│   ├── auth/                     # AuthProvider, hooks
│   ├── api/                      # exercises, plans, sessions, progress
│   └── algorithms/
│       ├── exercise-scoring.ts   # Phase 4.1
│       ├── sets-reps.ts          # Phase 4.3
│       ├── progressive-overload.ts  # Phase 6.1
│       └── fatigue.ts            # Phase 9.1
├── routes/                       # TanStack Router file-based routes
└── components/
```

---

## Database Schema (Complete)

### Core Tables

```sql
-- Read-only exercise library (seeded)
exercises (
  id uuid PK,
  name text,
  force text,           -- push | pull | static
  level text,           -- beginner | intermediate | expert
  mechanic text,        -- compound | isolation
  equipment text,
  category text,
  primary_muscles text[],
  secondary_muscles text[],
  instructions text[],
  search_vector tsvector  -- GIN index for FTS
)

-- One row per user
user_profiles (
  id uuid PK = auth.uid(),
  name text,
  gender text,
  age int,
  height_cm numeric,
  weight_kg numeric,
  goal text,
  experience text,
  equipment text[],
  equipment_details text,
  days_per_week int,
  session_length_minutes int,
  split_type text,
  abs_preference text,
  sleep_hours numeric,
  stress_level int,          -- 1–5
  job_activity text,
  cardio_sessions_per_week int,
  movement_notes text,
  language text DEFAULT 'en',
  created_at timestamptz
)

-- Active plan (one per user)
workout_plans (
  id uuid PK,
  user_id uuid FK,
  split_type text,
  days_per_week int,
  created_at timestamptz,
  is_active bool DEFAULT true
)

workout_days (
  id uuid PK,
  plan_id uuid FK,
  name text,           -- "Push", "Pull", "Legs"
  target_muscles text[],
  day_of_week int      -- 0=Mon…6=Sun, nullable
)

workout_day_exercises (
  id uuid PK,
  day_id uuid FK,
  exercise_id uuid FK,
  position int,
  suggested_sets int,
  suggested_rep_range text,   -- "8-12"
  suggested_weight_kg numeric -- nullable, updated by overload engine
)

-- ⚠️ MISSING FROM ORIGINAL - add this
session_exercise_overrides (
  session_id uuid FK,
  day_exercise_id uuid FK,
  override_exercise_id uuid FK,
  PRIMARY KEY (session_id, day_exercise_id)
)

workout_sessions (
  id uuid PK,
  user_id uuid FK,
  workout_day_id uuid FK,
  started_at timestamptz,
  completed_at timestamptz,
  status text,         -- in_progress | completed | abandoned
  rpe_feedback int,    -- 1–10
  feel_feedback text
)

session_sets (
  id uuid PK,
  session_id uuid FK,
  exercise_id uuid FK,
  set_number int,
  weight_kg numeric,
  reps int,
  rpe int,
  completed_at timestamptz
)

bodyweight_logs (
  id uuid PK,
  user_id uuid FK,
  date date,
  weight_kg numeric
)

weight_suggestions (
  user_id uuid FK,
  exercise_id uuid FK,
  suggested_weight_kg numeric,
  basis text,          -- "progression" | "maintenance" | "deload" | "estimate"
  computed_at timestamptz,
  PRIMARY KEY (user_id, exercise_id)
)
```

### RLS Policies

```sql
-- exercises: any authenticated user can read
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON exercises FOR SELECT TO authenticated USING (true);

-- all user tables: user_id = auth.uid()
-- Apply to: user_profiles, workout_plans, workout_days, workout_day_exercises,
--           session_exercise_overrides, workout_sessions, session_sets,
--           bodyweight_logs, weight_suggestions
```

---

## Phase 1 - Supabase Foundation

### 1.1 Project Setup

- [ ] Create Supabase project, enable email auth (magic link + password), configure PKCE flow
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env`
- [ ] Install `@supabase/supabase-js`, create `src/lib/supabase.ts` (typed client)
- [ ] Generate TypeScript types: `supabase gen types typescript --local > src/lib/database.types.ts`
- [ ] **Decide GDPR posture now** - store raw values or derived (BMR/TDEE only)? Document the decision.

### 1.2 Database Schema

- [ ] Run schema migrations in order (see schema above)
- [ ] Add all RLS policies and verify in Supabase dashboard
- [ ] Add GIN index on `exercises.search_vector`
- [ ] Add `session_exercise_overrides` table (missing from original plan)

### 1.3 Seed Exercises

```typescript
// scripts/seed-exercises.ts
// Requires SUPABASE_SERVICE_ROLE_KEY (not anon key - anon blocked by RLS)
const supabase = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY)
```

- [ ] Map `exercises.json` fields to DB columns
- [ ] Populate `search_vector` via `to_tsvector('english', name || ' ' || array_to_string(primary_muscles, ' '))`
- [ ] Run via `npx tsx scripts/seed-exercises.ts`

---

## Phase 2 - Auth & Onboarding

### 2.1 Auth Context

- [ ] `src/lib/auth/AuthProvider.tsx` wrapping `onAuthStateChange`
- [ ] Add auth to TanStack Router context
- [ ] Protected route wrapper → redirects unauthenticated to `/`
- [ ] Handle PKCE `code` exchange on redirect URL (required for magic link + PKCE)

### 2.2 Onboarding → Account Creation Flow

```
[Onboarding steps 1–N]
     ↓ localStorage: forge-onboarding-draft
[Create account step]
     ↓ Supabase signup
[RPC: create_user_profile(profile_data jsonb)]
     ↓ flushes draft, writes user_profiles + user_goals atomically
[Redirect to plan generation]
```

Edge cases to handle:
- User closes browser mid-onboarding → resume from draft on next visit
- Existing user with no profile → check on login, redirect to onboarding
- Existing user with profile → skip to dashboard

### 2.3 Profile Schema Mapping

> All fields from original plan are correct. Add `language text DEFAULT 'en'` to support Phase 10 i18n.

**Note:** Begin extracting UI strings to `en.json` from this phase onward to avoid Phase 10 retroactive extraction.

---

## Phase 3 - Exercise Library

### 3.1 API Layer

```typescript
// src/lib/api/exercises.ts
export async function searchExercises(q: string, filters: ExerciseFilters) {
  let query = supabase.from('exercises').select('*')
  if (q) query = query.textSearch('search_vector', q)
  if (filters.equipment) query = query.contains('equipment', [filters.equipment])
  if (filters.muscles) query = query.overlaps('primary_muscles', filters.muscles)
  return query
}
```

### 3.2 Filter State via URL

- [ ] `useDeferredValue` + 300ms debounce for search input
- [ ] `useSearch` (TanStack Router) for filter params - shareable deep links
- [ ] Filter chips: `equipment`, `level`, `category`, `muscle`

---

## Phase 4 - Workout Plan Creation

### 4.1 Exercise Scoring Pipeline

```typescript
// src/lib/algorithms/exercise-scoring.ts
// Pipeline (in order - each stage filters/mutates the candidate list):

function scoreExercises(candidates: Exercise[], context: ScoringContext): ScoredExercise[] {
  return candidates
    .filter(e => hardEquipmentFilter(e, context.userEquipment))   // HARD filter
    .map(e => ({
      ...e,
      score: 0
        + goalScore(e, context.goal)              // §3.5 compound bonus table
        + experienceScore(e, context.experience)  // level vs user exp
        + muscleAlignmentScore(e, context.dayTargets) // +3 if primary match
        - mechanicDiversityPenalty(e, context.selected) // 3rd+ same mechanic
        - movementSimilarityPenalty(e, context.selected) // cosine sim on muscle vectors
    }))
    .sort((a, b) => b.score - a.score)
}
```

### 4.2 Split Template Generation

| Split | Days | Day Labels |
|-------|------|------------|
| PPL | 3 | Push · Pull · Legs |
| PPL | 6 | Push · Pull · Legs · Push · Pull · Legs |
| Upper/Lower | 4 | Upper · Lower · Upper · Lower |
| Full Body | 3 | Full · Full · Full |
| Push/Pull | 4 | Push · Pull · Push · Pull |

- [ ] Warn if `days_per_week` incompatible with `split_type` (§9.4)
- [ ] Auto-populate `workout_day_exercises` with top-scored candidates (not locked)
- [ ] User edits via `plan.$id.tsx` UI

### 4.3 Sets/Reps Calculation

```typescript
// src/lib/algorithms/sets-reps.ts
function calcSetsReps(muscle: MuscleGroup, exercisesForMuscle: number, context: UserContext) {
  const weeklyTarget = MEV[muscle] + (MAV[muscle] - MEV[muscle]) * 0.5
  const rawSets = weeklyTarget / exercisesForMuscle
  const experienceMultiplier = { beginner: 0.7, intermediate: 1.0, advanced: 1.15 }[context.experience]
  const recoveryMod = recoveryModifier(context.sleep, context.stress, context.jobActivity)
  return {
    sets: clamp(2, 5, Math.round(rawSets * experienceMultiplier * recoveryMod)),
    repRange: goalRepRange(context.goal)  // e.g. "8-12" for hypertrophy
  }
}
```

### 4.4 Save Plan Flow

- [ ] Upsert `workout_day_exercises` on save (position, exercise_id, sets, rep_range)
- [ ] Sonner toast on success/error
- [ ] Invalidate TanStack Query cache for plan + dashboard

---

## Phase 5 - Workout Execution & Logging

### 5.1 Initial Load, Sets & Reps Prescription

This is the most nuanced estimation problem in the app. The key insight is that **no single formula works across exercise types** - a barbell back squat and a dumbbell lateral raise live in completely different load spaces. The system works in layers, each one narrowing uncertainty.

---

#### Layer 0 - Data Source Priority (before any formula runs)

```
1. User has history for THIS exercise           → use last session e1RM (most accurate)
2. User has history for a RELATED exercise      → cross-estimate via equivalence table
3. No history - user self-reported experience   → bodyweight-ratio estimate
4. No history - user is "beginner"              → fixed conservative starting point
```

The app never shows raw formula output to the user - it always shows a human-readable suggestion with an explanation and a clear override affordance.

---

#### Layer 1 - Exercise Classification

Before any number is computed, classify the exercise on three axes. These drive which formula and which defaults apply.

```typescript
// src/lib/algorithms/exercise-meta.ts

type LoadType =
  | 'barbell'       // bilateral, plates - weight increments in 2.5/5kg jumps
  | 'dumbbell'      // unilateral or bilateral - weight in fixed dumbbell increments (2kg jumps typically)
  | 'cable'         // stack machine - weight in fixed increments (usually 5-10kg plates)
  | 'machine'       // guided path, often plate-loaded or selectorized
  | 'bodyweight'    // no external load - progression via reps, tempo, or variant
  | 'band'          // resistance band - progression via band colour/tension level
  | 'kettlebell'    // fixed weight, similar to dumbbell but coarser increments (4kg jumps)

type MovementPattern =
  | 'horizontal_push'   // bench press, push-up, cable fly
  | 'vertical_push'     // overhead press, landmine press
  | 'horizontal_pull'   // row variations
  | 'vertical_pull'     // pull-up, lat pulldown
  | 'squat'             // squat pattern, leg press
  | 'hinge'             // deadlift, RDL, hip thrust
  | 'isolation_upper'   // curl, extension, lateral raise, face pull
  | 'isolation_lower'   // leg extension, leg curl, calf raise
  | 'carry'             // farmer's walk, suitcase carry
  | 'core'              // plank, ab wheel, cable crunch

type Bilaterality = 'bilateral' | 'unilateral'

interface ExerciseMeta {
  loadType: LoadType
  pattern: MovementPattern
  bilaterality: Bilaterality
  requiresBarbell: boolean   // affects increment size
  isCompound: boolean        // affects default rep range and volume
}

// Stored as columns in the exercises table - seeded alongside exercises.json
// (or derived from existing force/mechanic/equipment fields)
```

**Schema addition:**
```sql
ALTER TABLE exercises ADD COLUMN load_type text;
ALTER TABLE exercises ADD COLUMN movement_pattern text;
ALTER TABLE exercises ADD COLUMN bilaterality text;
-- Populated during seed - derivable from equipment + category + force fields
```

---

#### Layer 2 - Bodyweight Ratio Table (per movement pattern × experience)

These are research-backed population medians for working weight (not 1RM) at the given rep range. They are **starting suggestions only** - the user will calibrate them on first session.

```typescript
// src/lib/algorithms/initial-load.ts

// Ratios relative to bodyweight - for BARBELL bilateral movements
// Working weight at ~8 reps (≈75% 1RM) for an average person at each experience level
const barbellRatios: Record<MovementPattern, Record<Experience, number>> = {
  squat:            { beginner: 0.50, intermediate: 0.85, advanced: 1.20 },
  hinge:            { beginner: 0.65, intermediate: 1.10, advanced: 1.50 },
  horizontal_push:  { beginner: 0.35, intermediate: 0.60, advanced: 0.90 },
  vertical_push:    { beginner: 0.20, intermediate: 0.38, advanced: 0.55 },
  horizontal_pull:  { beginner: 0.35, intermediate: 0.55, advanced: 0.80 },
  vertical_pull:    { beginner: 0.30, intermediate: 0.50, advanced: 0.75 },
  isolation_upper:  { beginner: 0.10, intermediate: 0.18, advanced: 0.26 },
  isolation_lower:  { beginner: 0.25, intermediate: 0.45, advanced: 0.65 },
  carry:            { beginner: 0.30, intermediate: 0.50, advanced: 0.75 },
  core:             { beginner: 0,    intermediate: 0,    advanced: 0    }, // bodyweight
}

// Equipment multipliers - applied to the barbell baseline
// These account for the mechanical and stability differences between modalities
const equipmentMultiplier: Record<LoadType, number> = {
  barbell:    1.00,  // baseline
  machine:    1.10,  // guided path reduces stability demand - users can handle more load
  cable:      0.80,  // unloaded start + stabilisation cost - typically 80% of barbell
  dumbbell:   0.70,  // per hand - bilateral dumbbell total ≈ barbell; but listed per-hand
  kettlebell: 0.65,  // similar to dumbbell but less wrist-friendly position
  bodyweight: 0,     // handled separately
  band:       0,     // handled separately
}

// Unilateral penalty: each side works harder due to stabilisation
const unilateralMultiplier = 0.55  // per side vs bilateral total (not 0.5 - unilateral is harder)

function estimateWorkingWeight(
  exercise: ExerciseMeta,
  bodyweight: number,
  experience: Experience,
  targetReps: number
): number {
  if (exercise.loadType === 'bodyweight' || exercise.loadType === 'band') return 0

  const base = barbellRatios[exercise.pattern]?.[experience] ?? 0.3
  const eqMod = equipmentMultiplier[exercise.loadType] ?? 0.75
  const uniMod = exercise.bilaterality === 'unilateral' ? unilateralMultiplier : 1.0

  // Adjust for rep target: ratios above are for ~8 reps (75% 1RM)
  // Epley inverse: if target is different, scale accordingly
  const repAdjustment = 30 / (30 + targetReps - 8)  // approaches 1 at 8 reps

  const raw = bodyweight * base * eqMod * uniMod * repAdjustment

  // Round to nearest valid increment for this load type
  return roundToIncrement(raw, exercise.loadType)
}

function roundToIncrement(weight: number, loadType: LoadType): number {
  const increments: Record<LoadType, number> = {
    barbell: 2.5, dumbbell: 2, cable: 2.5, machine: 5,
    kettlebell: 4, bodyweight: 0, band: 0
  }
  const inc = increments[loadType] ?? 2.5
  return Math.round(weight / inc) * inc
}
```

**Concrete examples for a 80kg intermediate male:**

| Exercise | Pattern | LoadType | Bilateral | Calc | Suggestion |
|---|---|---|---|---|---|
| Barbell back squat | squat | barbell | bilateral | 80 × 0.85 × 1.0 × 1.0 | **68 kg** |
| Barbell bench press | h_push | barbell | bilateral | 80 × 0.60 × 1.0 × 1.0 | **48 kg** |
| Dumbbell bench press | h_push | dumbbell | bilateral | 80 × 0.60 × 0.70 × 1.0 | **34 kg** → **17.5 kg/hand** |
| DB incline press | h_push | dumbbell | bilateral | 80 × 0.60 × 0.70 × 0.9 | **30 kg** → **15 kg/hand** |
| Dumbbell lateral raise | iso_upper | dumbbell | unilateral | 80 × 0.18 × 0.70 × 0.55 | **~7 kg/hand** |
| Cable lateral raise | iso_upper | cable | unilateral | 80 × 0.18 × 0.80 × 0.55 | **~8 kg** |
| Leg press | squat | machine | bilateral | 80 × 0.85 × 1.10 × 1.0 | **75 kg** |
| Barbell deadlift | hinge | barbell | bilateral | 80 × 1.10 × 1.0 × 1.0 | **88 kg** |
| Lat pulldown | v_pull | cable | bilateral | 80 × 0.50 × 0.80 × 1.0 | **32 kg** |
| Dumbbell row | h_pull | dumbbell | unilateral | 80 × 0.55 × 0.70 × 0.55 | **17 kg/hand** |
| Barbell curl | iso_upper | barbell | bilateral | 80 × 0.18 × 1.0 × 1.0 | **14 kg** |
| Dumbbell curl | iso_upper | dumbbell | unilateral | 80 × 0.18 × 0.70 × 0.55 | **~7 kg/hand** |

> **Dumbbell note:** the app should always show per-hand weight for dumbbell unilateral exercises and make this explicit in the UI. `"7.5 kg × each hand"` not `"15 kg"`.

---

#### Layer 3 - Cross-Exercise Transfer (Related Exercise History)

When a user has logged a barbell bench press but now adds dumbbell bench press to their plan for the first time, the app can estimate the dumbbell weight from the barbell e1RM. This is better than the population estimate.

```typescript
// src/lib/algorithms/initial-load.ts

// Cross-modality transfer table: given e1RM on source exercise, estimate working weight on target
// These are multiplied by the target rep% (e.g. 75% for 8 reps)
type TransferPair = { from: LoadType; to: LoadType; multiplier: number }

const transferFactors: TransferPair[] = [
  { from: 'barbell', to: 'dumbbell',   multiplier: 0.70 },  // per hand, total = ~same
  { from: 'dumbbell', to: 'barbell',   multiplier: 1.35 },  // bilateral barbell > dumbbell total
  { from: 'barbell', to: 'cable',      multiplier: 0.80 },
  { from: 'barbell', to: 'machine',    multiplier: 1.10 },
  { from: 'machine', to: 'barbell',    multiplier: 0.90 },
  { from: 'dumbbell', to: 'cable',     multiplier: 1.10 },  // per unit
  { from: 'cable', to: 'dumbbell',     multiplier: 0.90 },
]

function crossEstimate(
  sourceE1RM: number,
  sourceLoadType: LoadType,
  targetLoadType: LoadType,
  targetBilaterality: Bilaterality,
  targetReps: number
): number {
  const transfer = transferFactors.find(t => t.from === sourceLoadType && t.to === targetLoadType)
  if (!transfer) return 0  // no transfer known - fall back to bodyweight ratio

  // Convert e1RM to working weight for target reps
  const repPct = 30 / (30 + targetReps)  // Epley inverse at target reps
  const working = sourceE1RM * transfer.multiplier * repPct

  // Apply unilateral modifier if target is unilateral and source was bilateral
  const uniMod = targetBilaterality === 'unilateral' ? unilateralMultiplier : 1.0

  return roundToIncrement(working * uniMod, targetLoadType)
}
```

**Example:** User has 80 kg barbell bench press e1RM. Adding DB incline press (8 reps target):
`80 × 0.70 × (30/38) × 1.0 = 80 × 0.70 × 0.79 ≈ 44 kg total → **22 kg per hand**`

---

#### Layer 4 - Bodyweight & Band Exercises

These cannot use weight as a load metric. Progression model is different.

```typescript
type BodyweightProgression =
  | { type: 'reps'; suggestion: string }           // "3 × 8 - progress to 3 × 12, then harder variant"
  | { type: 'variant'; next: string }              // "try archer push-up when you hit 3 × 15"
  | { type: 'added_load'; suggestion: number }     // "add 5 kg plate when you can do 3 × 12"
  | { type: 'tempo'; suggestion: string }          // "3 sec descent, pause at bottom"

// Bodyweight exercise progression ladder (stored in exercises table or hardcoded map)
const bodweightProgressionLadder: Record<string, string[]> = {
  'push-up':           ['knee push-up', 'push-up', 'archer push-up', 'weighted push-up', 'ring push-up'],
  'pull-up':           ['band-assisted pull-up', 'pull-up', 'weighted pull-up'],
  'dip':               ['bench dip', 'parallel bar dip', 'weighted dip'],
  'bodyweight-squat':  ['bodyweight squat', 'goblet squat', 'front squat', 'back squat'],
  // ...
}

function suggestBodyweightProgress(
  exercise: Exercise,
  lastSession: { reps: number; sets: number } | null
): BodyweightProgression {
  if (!lastSession) return { type: 'reps', suggestion: '3 × 8 - focus on full range of motion' }

  const totalReps = lastSession.sets * lastSession.reps
  if (totalReps >= 36) {  // e.g. 3 × 12+ - ready to advance
    const ladder = bodweightProgressionLadder[exercise.id]
    const currentIdx = ladder?.indexOf(exercise.id) ?? -1
    if (currentIdx >= 0 && currentIdx < ladder.length - 1) {
      return { type: 'variant', next: ladder[currentIdx + 1] }
    }
    return { type: 'added_load', suggestion: 5 }
  }
  return { type: 'reps', suggestion: `${lastSession.sets} × ${lastSession.reps + 1}` }
}
```

---

#### Layer 5 - Initial Sets & Reps Suggestion

Sets and reps are not just formula outputs - they depend on where the exercise sits in the session (position matters) and the user's goal.

```typescript
interface SetRepSuggestion {
  sets: number
  repLow: number
  repHigh: number
  rpe_target: number    // show this to user as guidance ("aim for RPE 7-8")
  note?: string
}

function suggestInitialSetsReps(
  exercise: ExerciseMeta,
  position: number,        // order in the session (1 = first exercise)
  goal: Goal,
  experience: Experience,
  mesocycleWeek: 1 | 2 | 3 | 4
): SetRepSuggestion {

  // Rep range by goal - compound vs isolation distinction
  const repRanges: Record<Goal, { compound: [number,number]; isolation: [number,number] }> = {
    strength:       { compound: [3, 6],   isolation: [8, 12] },
    hypertrophy:    { compound: [6, 10],  isolation: [10, 15] },
    endurance:      { compound: [12, 20], isolation: [15, 25] },
    weight_loss:    { compound: [8, 12],  isolation: [12, 20] },
    general_health: { compound: [8, 12],  isolation: [12, 15] },
  }

  const range = exercise.isCompound
    ? repRanges[goal].compound
    : repRanges[goal].isolation

  // Mesocycle week adjusts intensity (higher week = lower reps = higher load)
  const weekRepOffset = [2, 0, -2, 2][mesocycleWeek - 1]  // week 4 = deload, back to easier
  const adjRange: [number, number] = [range[0] + weekRepOffset, range[1] + weekRepOffset]

  // Sets: 3 for most cases; reduce for later exercises in session
  const baseSets = experience === 'beginner' ? 2 : 3
  const positionPenalty = position >= 4 ? 1 : 0  // 4th+ exercise in session: drop a set

  // RPE target: first session for new exercise = conservative RPE 6-7
  const rpeTarget = experience === 'beginner' ? 6 : 7

  return {
    sets: baseSets - positionPenalty,
    repLow: Math.max(1, adjRange[0]),
    repHigh: adjRange[1],
    rpe_target: rpeTarget,
    note: position === 1 ? undefined : position >= 4 ? 'Later in session - one fewer set to manage fatigue' : undefined
  }
}
```

---

#### UI: How Suggestions Are Presented

Every suggestion must show its reasoning. The user should understand *why* the app picked this number, which makes overrides feel informed rather than arbitrary.

```
┌─────────────────────────────────────────────┐
│  Dumbbell Bench Press                        │
│                                             │
│  Suggested:  3 × 8-10  ·  17.5 kg/hand     │
│                                             │
│  Based on: your barbell bench press (80 kg  │
│  e1RM) and intermediate experience          │
│                          [Why?] [Override]  │
└─────────────────────────────────────────────┘
```

- [ ] "Why?" expands an inline explanation card (no modal)
- [ ] "Override" opens inline numeric inputs for weight, sets, reps - pre-filled with suggestion
- [ ] Override saves to `session_sets` with `user_override: true` flag - tracked separately so the overload engine knows the user rejected the suggestion (important for calibration)
- [ ] After the first set is logged, the suggestion card collapses - weight is now the logged value

**Schema addition:**
```sql
ALTER TABLE session_sets ADD COLUMN user_override boolean DEFAULT false;
ALTER TABLE session_sets ADD COLUMN suggested_weight_kg numeric;  -- what the app suggested
ALTER TABLE session_sets ADD COLUMN suggested_reps int;           -- what the app suggested
-- Storing both actual and suggested allows calibration of estimation accuracy over time
```

### 5.2 Session Logging

```
workout start  → INSERT workout_sessions (status: 'in_progress')
set complete   → UPSERT session_sets (session_id, exercise_id, set_number, ...)
workout end    → UPDATE workout_sessions (status: 'completed', completed_at, rpe_feedback)
```

### 5.3 Rest Timer Persistence

```typescript
// On timer start:
sessionStorage.setItem('rest-timer', JSON.stringify({ endsAt: Date.now() + durationMs }))

// On visibility change / mount:
const stored = sessionStorage.getItem('rest-timer')
if (stored) {
  const { endsAt } = JSON.parse(stored)
  const remaining = endsAt - Date.now()
  if (remaining > 0) resumeTimer(remaining)
}
```

### 5.4 Weight Override & Exercise Swap

- [ ] Override: update `session_sets.weight_kg` before insert (pre-populated from suggestion)
- [ ] Swap: insert into `session_exercise_overrides` (session-scoped, plan unchanged)

---

## Phase 6 - Progressive Overload Engine

### 6.1 `suggestNextWeight` - Full System

The overload engine runs after every completed session. It reads the last 3 sessions per exercise, applies RPE calibration (Upgrade D), and outputs a typed suggestion. The user can override at any point; overrides feed back into the engine's confidence scoring.

```typescript
// src/lib/algorithms/progressive-overload.ts

type OverloadDecision =
  | 'progress'     // add weight or reps
  | 'maintain'     // same weight, target top of rep range
  | 'technique'    // weight is fine but form cue needed - don't add load yet
  | 'deload'       // reduce weight
  | 'first_session'// no history - use initial estimate (Layer 0 of 5.1)

interface WeightSuggestion {
  weight: number
  sets: number
  repLow: number
  repHigh: number
  decision: OverloadDecision
  basis: string         // human-readable explanation shown in UI
  confidence: number    // 0–1; low confidence = show suggestion with softer framing
}

async function suggestNext(
  userId: string,
  exerciseId: string,
  exercise: ExerciseMeta
): Promise<WeightSuggestion> {

  const history = await getLast3Sessions(userId, exerciseId)
  const calibration = await getRpeCalibration(userId)  // Upgrade D

  if (history.length === 0) {
    // No history - fall through to 5.1 estimation layers
    return firstSessionSuggestion(userId, exerciseId, exercise)
  }

  const last = history[0]
  const lastWeight = last.weight_kg
  const calibratedAvgRpe = mean(last.sets.map(s => calibratedRpe(s.rpe, calibration)))
  const completionRate = last.sets.filter(s => s.reps >= s.targetReps).length / last.sets.length

  // Check if user override on last session - if they went lighter than suggested,
  // don't punish by suggesting the (higher) suggestion again this session
  const lastWasOverride = last.sets.some(s => s.user_override)
  const effectiveWeight = lastWasOverride
    ? Math.min(lastWeight, last.suggestedWeight ?? lastWeight)
    : lastWeight

  const increment = personalizedIncrement(exerciseId, history.map(h => h.e1rm), experience)

  // Decision tree
  if (completionRate === 1.0 && calibratedAvgRpe <= 7.0) {
    // All reps completed, felt easy - add weight
    return {
      weight: roundToIncrement(effectiveWeight + increment, exercise.loadType),
      sets: last.sets.length,
      repLow: last.repLow, repHigh: last.repHigh,
      decision: 'progress',
      basis: `All sets completed at RPE ${calibratedAvgRpe.toFixed(1)} - time to add weight`,
      confidence: history.length >= 3 ? 0.9 : 0.7
    }
  }

  if (completionRate === 1.0 && calibratedAvgRpe <= 8.5) {
    // Completed but challenging - maintain weight, push reps toward top of range
    return {
      weight: effectiveWeight,
      sets: last.sets.length,
      repLow: last.repHigh,  // target top of rep range this session
      repHigh: last.repHigh,
      decision: 'maintain',
      basis: `Strong session at RPE ${calibratedAvgRpe.toFixed(1)} - same weight, aim for ${last.repHigh} reps`,
      confidence: 0.85
    }
  }

  if (completionRate >= 0.7 && calibratedAvgRpe > 8.5) {
    // Completed most reps but too hard - maintain and note technique
    return {
      weight: effectiveWeight,
      sets: last.sets.length,
      repLow: last.repLow, repHigh: last.repHigh,
      decision: 'technique',
      basis: `High RPE (${calibratedAvgRpe.toFixed(1)}) - consolidate this weight before progressing`,
      confidence: 0.8
    }
  }

  // Failed reps or RPE spiked - reduce load
  const deloadFactor = completionRate < 0.5 ? 0.90 : 0.95
  return {
    weight: roundToIncrement(effectiveWeight * deloadFactor, exercise.loadType),
    sets: last.sets.length,
    repLow: last.repLow, repHigh: last.repHigh,
    decision: 'deload',
    basis: `Completion rate ${Math.round(completionRate * 100)}% - slight reset to rebuild quality`,
    confidence: 0.75
  }
}
```

### 6.2 Increment Logic by Exercise Type

The fixed `2.5 / 5 kg` split from the original plan is beginner-only. The personalized increment (Upgrade F) wraps this:

```typescript
function baseIncrement(exercise: ExerciseMeta): number {
  // Increment rules by load type and pattern
  if (exercise.loadType === 'bodyweight') return 0
  if (exercise.loadType === 'band') return 0

  // Isolations: smaller increments - the absolute load is lower, so 2.5 kg is a large % jump
  if (!exercise.isCompound) {
    return exercise.loadType === 'dumbbell' ? 1 : 2   // DB isolation: 1 kg/hand; cable: 2 kg
  }

  // Compound movements by pattern
  if (['squat', 'hinge'].includes(exercise.pattern)) {
    return exercise.loadType === 'barbell' ? 5 : 2.5   // lower body barbell: 5 kg; machine/DB: 2.5
  }

  return exercise.loadType === 'barbell' ? 2.5 : 2     // upper body compound default
}
```

**Practical examples:**

| Exercise | Load Type | Is Compound | Base Increment |
|---|---|---|---|
| Barbell squat | barbell | yes | **5 kg** |
| Leg press | machine | yes | **2.5 kg** |
| Barbell bench | barbell | yes | **2.5 kg** |
| Dumbbell bench | dumbbell | yes | **2 kg/hand** |
| Lat pulldown | cable | yes | **2.5 kg** |
| Dumbbell curl | dumbbell | no | **1 kg/hand** |
| Cable lateral raise | cable | no | **2 kg** |
| Barbell overhead press | barbell | yes | **2.5 kg** |
| Dumbbell lateral raise | dumbbell | no | **1 kg/hand** |

When the personalized increment (Upgrade F) detects the user is in intermediate/advanced territory (flat e1RM slope), it halves or quarters these base increments and shows a micro-load tip.

### 6.3 Override Feedback Loop

User overrides are not ignored - they train the suggestion engine.

```typescript
// After each session, evaluate override pattern per exercise
async function processOverrides(sessionId: string, userId: string): Promise<void> {
  const sets = await getSessionSets(sessionId)
  const overriddenSets = sets.filter(s => s.user_override)

  for (const set of overriddenSets) {
    const diff = set.weight_kg - (set.suggested_weight_kg ?? set.weight_kg)

    // User consistently goes lighter than suggestion → suggestion is too aggressive
    // Store a per-exercise correction factor
    await updateExerciseCorrectionFactor(userId, set.exercise_id, diff)
  }
}
```

**Schema addition:**
```sql
-- Per-user per-exercise correction factor for suggestion accuracy
ALTER TABLE weight_suggestions ADD COLUMN user_correction_factor numeric DEFAULT 1.0;
-- correction_factor < 1.0: user consistently goes lighter than suggestion
-- correction_factor > 1.0: user consistently goes heavier (system is being too conservative)
-- Applied multiplicatively to future suggestions for this exercise
```

### 6.4 Feedback Loop - End of Session

- [ ] Run `suggestNext` for all exercises in the session after the feedback screen
- [ ] Process overrides and update `user_correction_factor`
- [ ] Upsert into `weight_suggestions` (weight, sets, repLow, repHigh, decision, basis, confidence)
- [ ] Dashboard "Next session" card shows decision badge + weight - colour-coded:
  - `progress` → green arrow up + weight
  - `maintain` → blue = same weight, target reps shown
  - `technique` → amber → consolidate note
  - `deload` → red → reset weight shown

---

## Phase 7 - Progress Tracking

### 7.1 Bodyweight Logging

- [ ] Floating "Log weight" FAB on Progress > Body tab
- [ ] Chart: last 12 weeks from `bodyweight_logs`
- [ ] Prevent duplicate entries per date (upsert on `(user_id, date)`)

### 7.2 Strength Progress

```sql
SELECT
  date_trunc('week', ws.started_at) AS week,
  MAX(ss.weight_kg) AS max_weight
FROM session_sets ss
JOIN workout_sessions ws ON ws.id = ss.session_id
WHERE ss.exercise_id = $1 AND ws.user_id = auth.uid()
GROUP BY 1 ORDER BY 1
```

### 7.3 Volume Tracking

- [ ] Aggregate `session_sets` for current week by `primary_muscles`
- [ ] Color coding per MEV/MAV/MRV landmarks (§5.1):
  - `< MEV` → grey
  - `MEV–MAV` → green
  - `MAV–MRV` → amber
  - `> MRV` → red

### 7.4 Streaks & Heatmap

```sql
-- Streak: consecutive weeks with all planned sessions completed
-- Heatmap: COUNT(sessions) per day, last 52 weeks
SELECT date(started_at), COUNT(*) FROM workout_sessions
WHERE user_id = auth.uid() AND status = 'completed'
  AND started_at >= now() - interval '52 weeks'
GROUP BY 1
```

---

## Phase 8 - Dashboard (Real Data)

| Card | Data Source | Key Formula |
|------|-------------|-------------|
| Readiness score | `bodyweight_logs`, `workout_sessions` | `readinessScore(sleep, stress, ACWR)` |
| Today's workout | `workout_plans`, `workout_days` | Plan schedule + current week cycle |
| Calories/Protein | `user_profiles` | Mifflin-St Jeor → TDEE → goal macro split |
| Weekly rings | `workout_sessions` | `completed this week / planned this week` |
| Suggested weight | `weight_suggestions` | Last overload engine run |

**Readiness score formula (Phase 9 prerequisite - implement in order):**

```typescript
function readinessScore(sleep: number, stress: number, acwr: number): number {
  const sleepScore = clamp(0, 40, (sleep / 9) * 40)
  const stressScore = clamp(0, 30, ((5 - stress) / 4) * 30)
  const acwrScore = acwr === 0 ? 30 : clamp(0, 30, (1 - Math.abs(acwr - 1)) * 30)
  return Math.round(sleepScore + stressScore + acwrScore)
}
```

---

## Phase 9 - Readiness & Deload Detection

### 9.1 ACWR

```typescript
// src/lib/algorithms/fatigue.ts
// ⚠️ Guard against zero chronicLoad on new users
function computeACWR(sessions: SessionWithLoad[]): number {
  const now = Date.now()
  const acute = sumLoad(sessions.filter(s => isWithinDays(s.date, 7, now)))
  const chronic = sumLoad(sessions.filter(s => isWithinDays(s.date, 28, now))) / 4
  if (chronic === 0) return 1.0  // neutral on no history
  return acute / chronic
}

function sessionLoad(sets: SessionSet[]): number {
  return sets.reduce((sum, s) => sum + s.sets * s.reps * s.weight_kg * rpeMultiplier(s.rpe), 0)
}
```

### 9.2 Deload Triggers

- ACWR > 1.5 or readiness < 50 → show deload banner
- **⚠️ Do NOT mutate `workout_day_exercises.suggested_sets`** - use a `deload_active` flag in `workout_plans` and apply `0.5×` multiplier at read time

### 9.3 Recovery Modifier

| Condition | Modifier |
|-----------|----------|
| sleep ≥ 7h, stress ≤ 2, desk job | 1.0× |
| sleep 6–7h OR stress 3, mixed job | 0.9× |
| sleep < 6h AND stress ≥ 3 | 0.8× |
| sleep < 5h OR stress ≥ 4 OR physical job | 0.75× |

---

## Phase 10 - Profile, i18n, Notifications

### 10.1 Edit Profile

- [ ] Reuse onboarding components for edit form
- [ ] Fields: goal, experience, equipment, split, session length, bodyweight, recovery settings
- [ ] On save: update `user_profiles`, invalidate dashboard cache

### 10.2 i18n

> **If strings were extracted from Phase 2 onward, this is a small wiring task. If not, budget 3–5 days.**

- [ ] `npm install i18next react-i18next`
- [ ] `src/i18n/en.json` + `pl.json`
- [ ] `i18n.changeLanguage()` on login from `user_profiles.language`

### 10.3 Notifications

- [ ] Browser Notification API + ServiceWorker for workout reminders
- [ ] Store preferences in `user_profiles`
- [ ] Request permission only after user explicitly opts in (don't prompt on first load)

### 10.4 Data Reset RPC

```sql
CREATE OR REPLACE FUNCTION reset_user_progress()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM session_sets WHERE session_id IN (
    SELECT id FROM workout_sessions WHERE user_id = auth.uid()
  );
  DELETE FROM workout_sessions WHERE user_id = auth.uid();
  DELETE FROM bodyweight_logs WHERE user_id = auth.uid();
  DELETE FROM weight_suggestions WHERE user_id = auth.uid();
END;
$$;
```

---

## Phase 11 - PWA

- [ ] `manifest.webmanifest`: name, icons (192px + 512px), `display: standalone`, `theme_color`
- [ ] `vite-plugin-pwa` for app shell + static asset caching
- [ ] Cache exercises: cache the REST response **body** in SW, not the authenticated request - exercises are public data
- [ ] `<meta name="apple-mobile-web-app-capable">` + status bar meta for iOS
- [ ] Offline fallback page for when network unavailable during workout

---

## Phase 12 - Security & Data Audit

- [ ] Verify all RLS policies in Supabase dashboard (use Policy Tester)
- [ ] Disable Supabase Realtime logging for user tables
- [ ] Cross-reference every `user_profiles` column against the algorithm that consumes it - remove unused
- [ ] GDPR compliance check:
  - If storing raw biometrics: add `data_processing_consent` timestamp to `user_profiles`
  - Document retention policy for `session_sets` (e.g. user can export + delete)
  - Add account deletion RPC that cascades all user data
- [ ] Penetration checklist: SQL injection (Supabase parameterised queries ✓), XSS (React escaping ✓), CSRF (SameSite cookies - verify Supabase config)

---

## Sprint Roadmap

| Sprint | Phases | Outcome | Shippable? |
|--------|--------|---------|------------|
| 1 | 1.1–1.3 | Supabase connected, exercises seeded | Dev only |
| 2 | 2.1–2.3 | Auth + onboarding saves real profile | ✓ |
| 3 | 3.1–3.2 | Library reads from Supabase | ✓ |
| 4 | 4.1–4.4 | Real plan creation with scoring | ✓ |
| 5 | 5.1–5.4 | Workout execution logs to DB | ✓ |
| 6 | 6.1–6.2 | Progressive overload suggestions | ✓ |
| 7 | 7.1–7.4 | Progress tabs show real data | ✓ |
| 8 | 8 | Dashboard fully live | ✓ |
| 9 | 9 | Readiness + deload system | ✓ |
| 10 | 10–12 | Profile editing, i18n, PWA, security audit | ✓ Launch-ready |

> Each sprint leaves the app shippable - mock data replaced only after real implementation verified.

---

## Algorithm Dependencies Map

> Full updated map is in the **Algorithm Accuracy Upgrade** section above. Summary of original signals:

```
user_profiles
├── calcSetsReps (Phase 4.3) ← experience, goal, sleep, stress, job_activity,
│                               fatigue_accumulation_modifier (Upgrade E),
│                               bodyweightVolumeModifier (Upgrade I)
├── recoveryModifier (Phase 9.3) ← sleep, stress, job_activity
├── startingWeight (Phase 5.1) ← weight_kg, experience
├── readinessScore (Phase 8) ← form (Upgrade A) + checkinEMA (Upgrade B) + sleep
└── macroTargets (Phase 8) ← age, height_cm, weight_kg, gender, goal

session_sets
├── sessionLoad (Phase 9.1) ← weight × reps × rpeMultiplier × durationMod (Upgrade H)
├── e1RM (Upgrade C) → exercise_e1rm_history → suggestNextWeight + strengthProgress
├── rpeCalibration (Upgrade D) ← rpe vs completion rate → calibrated thresholds
└── intraSessionFatigueRate (Upgrade E) → fatigue_accumulation_modifier

workout_sessions (+ checkin_score from Upgrade B)
├── Banister EWMA (Upgrade A) → fitness_snapshots (fitness/fatigue/form)
├── streaks (Phase 7.4) ← started_at, status
└── checkinEMA → readinessScore

bodyweight_logs → bodyweightTrend (Upgrade I) → volumeModifier
workout_plans.start_date → mesocycleWeek (Upgrade J) → volumeMultiplier + repRange
user_volume_landmarks → adaptive MEV/MAV/MRV (Upgrade G, active after 8 weeks)
```

---

## Open Questions (Decide Before Phase 4)

1. **Split schedule**: Is the workout day tied to a calendar day-of-week, or is it positional (session 1, 2, 3 in sequence)? Positional is more flexible for users who miss days.
2. **Plan versioning**: When a user edits their plan mid-cycle, do historical sessions retain their old plan context? Suggest `workout_sessions.snapshot_day_id` pointing to a versioned day definition.
3. **Exercise swap scope**: Is "swap for this session" the only supported scope, or should "swap permanently" also be an option?
4. **Multi-plan support**: Schema supports one active plan per user - is that the intended constraint, or should users be able to switch between saved plans?
5. **Bodyweight exercises**: How are they handled in progressive overload? Band resistance, tempo, rep targets, or bodyweight + added load?
