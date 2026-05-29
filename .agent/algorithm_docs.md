# Training Plan Generation: Algorithms, Data Science & Best Practices

> **Purpose:** A reference document describing the algorithmic approaches, data science principles, and design patterns used in Atlas - a React + Vite · TanStack Router/Query · Supabase · TypeScript application. Sections marked **[Upgrade A–J]** correspond directly to the Algorithm Accuracy Upgrade section of the implementation plan.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Collection: What to Collect and Why](#2-data-collection-what-to-collect-and-why)
3. [Exercise Selection Algorithms](#3-exercise-selection-algorithms)
4. [Periodization Models](#4-periodization-models)
5. [Volume & Load Prescription](#5-volume--load-prescription)
6. [Starting Weight Estimation](#6-starting-weight-estimation)
7. [Nutrition Modeling](#7-nutrition-modeling)
8. [Fatigue & Readiness Monitoring](#8-fatigue--readiness-monitoring)
9. [Plan Quality Assessment](#9-plan-quality-assessment)
10. [Feedback Loops & Adaptation](#10-feedback-loops--adaptation)
11. [Pre-Session Check-In \[Upgrade B\]](#11-pre-session-check-in-upgrade-b)
12. [Strength Tracking: Epley e1RM \[Upgrade C\]](#12-strength-tracking-epley-e1rm-upgrade-c)
13. [RPE Calibration Drift Correction \[Upgrade D\]](#13-rpe-calibration-drift-correction-upgrade-d)
14. [Intra-Session Fatigue Rate \[Upgrade E\]](#14-intra-session-fatigue-rate-upgrade-e)
15. [Personalized Weight Increments \[Upgrade F\]](#15-personalized-weight-increments-upgrade-f)
16. [Adaptive Volume Landmarks \[Upgrade G\]](#16-adaptive-volume-landmarks-upgrade-g)
17. [Session Duration as Fatigue Proxy \[Upgrade H\]](#17-session-duration-as-fatigue-proxy-upgrade-h)
18. [Bodyweight Trend as Recovery Signal \[Upgrade I\]](#18-bodyweight-trend-as-recovery-signal-upgrade-i)
19. [Mesocycle Progression Planning \[Upgrade J\]](#19-mesocycle-progression-planning-upgrade-j)
20. [Common Pitfalls & Anti-Patterns](#20-common-pitfalls--anti-patterns)
21. [Scientific References](#21-scientific-references)

---

## 1. System Architecture

### The Three-Phase Model

Any serious training plan generator should operate in three phases:

```
Phase 1: CONSTRAINT COLLECTION
  Gather user data → translate into algorithmic constraints

Phase 2: CONSTRAINED GENERATION
  Build plan within constraints → optimize for quality

Phase 3: ADAPTIVE REPLAN
  Observe user response → modify plan iteratively
```

Most fitness apps only implement Phase 2. The leap in quality comes from properly connecting all three.

### Core Principle: Constraints First, Optimization Second

The fundamental architecture should be:

1. **Hard constraints** - absolute filters (e.g., "user has no barbell → exclude barbell exercises")
2. **Soft constraints** - scoring preferences (e.g., "compound exercises score higher for strength goals")
3. **Optimization** - among all valid candidates, pick the best combination

This hierarchy prevents the common failure of optimizing for fitness quality while ignoring practical constraints.

---

## 2. Data Collection: What to Collect and Why

### The Data Value Principle

> Every data point collected must have at least one algorithm that consumes it. If data is collected but never used, it creates onboarding friction without improving outcomes.

### Tier 1: Essential Data (Drives Plan Generation)

These fields have high algorithmic value - each directly influences plan structure:

| Data Point | Type | Why It Matters | Algorithmic Use |
|-----------|------|----------------|-----------------|
| **Training goal** | Enum | Determines rep ranges, intensity, exercise selection bias, periodization strategy | Periodization selection, exercise scoring, calorie targets |
| **Experience level** | Enum or continuous | Determines volume tolerance, exercise complexity, periodization complexity | Periodization blocks, starting weights, volume landmarks |
| **Available equipment** | Multi-select | Hard constraint on exercise pool | Exercise filtering (hard exclusion) |
| **Training frequency** | Integer (days/week) | Determines weekly structure and split type | Plan structure, muscle group distribution |
| **Session duration** | Integer (minutes) | Determines exercises per session | Exercise count scaling |
| **Training style/preference** | Enum | Determines muscle group pairing per day | Split template selection |
| **Body weight** | Continuous (kg) | Proxy for strength standards, nutrition targets | Starting weight estimation, BMR, protein targets |
| **Gender** | Enum | Affects BMR, body composition estimates, strength standards | Nutrition calculations, strength percentile lookup |
| **Height** | Continuous (cm) | Used in BMR and body composition | Mifflin-St Jeor equation |
| **Age** | Integer (years) | Used in BMR calculation | Mifflin-St Jeor equation |
| **Activity level** | Enum | TDEE multiplier | Nutrition targets |

### Tier 2: Advanced Data (Refines Plan Quality)

These fields improve personalization but require corresponding algorithms:

| Data Point | Type | Ideal Algorithmic Use |
|-----------|------|----------------------|
| **Prioritized muscle groups** | Multi-select | Exercise scoring bonus for priority muscles |
| **Exercises to avoid** | String list | Hard exclusion + scoring penalty |
| **Injury limitations** | Structured checkboxes | Exercise substitution mapping |
| **Movement assessment** | Multiple booleans/enums | Exercise substitution (e.g., can't squat deep → replace squat variants) |
| **Training history (years)** | Integer | Refines experience beyond coarse buckets |
| **Previous programs** | Multi-select | Informs periodization strategy |
| **Peak lift numbers** | Weight × reps per exercise | Overrides bodyweight-based starting weight estimates |
| **Sleep duration** | Continuous (hours) | Volume modifier |
| **Stress level** | Ordinal (1-5) | Volume modifier, deload sensitivity |
| **Job activity level** | Enum | Volume tolerance adjustment |
| **Cardio frequency** | Integer | Conditioning volume allocation |

### Tier 3: Behavioral Data (Post-Onboarding)

Collected during usage, not during onboarding:

- Session completion rate
- RPE per set
- Weights used per set
- Body weight over time
- PRs achieved
- Deload adherence
- Weekly check-in responses

### The Anti-Pattern: Collecting Without Connecting

**Common mistake:** Gathering detailed data during onboarding (injuries, mobility assessment, recovery profile) but implementing no algorithm that consumes it.

**Consequences:**
- Increased onboarding friction → lower completion rate
- User expectation mismatch → data collected, nothing changes
- Maintenance burden → unused code paths

**Rule:** Either wire data into an algorithm immediately, or remove it from onboarding until the algorithm exists.

---

## 3. Exercise Selection Algorithms

### 3.1 The Filtering Pipeline

Exercise selection should follow a strict pipeline:

```
Full Exercise Database (N exercises)
  │
  ├─ Step 1: Equipment filter (hard)
  │   Remove exercises requiring unavailable equipment
  │
  ├─ Step 2: Injury/limitation filter (hard)
  │   Remove exercises matching user's avoid list or injury constraints
  │
  ├─ Step 3: Goal-based filter (soft or hard)
  │   For hypertrophy/strength goals: exclude pure recovery exercises
  │   (flexibility, mobility, foam rolling)
  │
  ├─ Step 4: Movement assessment filter (hard)
  │   Remove exercises incompatible with user's mobility limitations
  │
  └─ Step 5: Score remaining candidates (soft)
      Rank by composite score across multiple dimensions
```

### 3.2 Multi-Dimensional Scoring

Each exercise should be scored across multiple dimensions, then combined via weighted sum:

**Scoring Dimensions:**

| Dimension | Weight | What It Captures |
|-----------|--------|------------------|
| Equipment match quality | Medium | Direct match vs alternative substitution |
| Injury compatibility | Very High | Safety - highest weight dimension |
| User preference | Medium | Favorites/disliked exercises |
| Target muscle alignment | High | Whether exercise targets a priority muscle |
| Experience appropriateness | Medium | Exercise difficulty vs user level |
| Variety bonus | Medium | Prevents repetitive selection |
| Movement mechanic diversity | Medium | Ensures push/pull/hinge/squat mix |
| Movement plane diversity | Low-Medium | Ensures sagittal/frontal/transverse plane mix |
| Compound priority | Medium | Prioritizes compound over isolation for appropriate goals |
| Unilateral/bilateral balance | Low | Prevents all-bilateral or all-unilateral selection |
| Movement similarity penalty | Medium | Penalizes exercises too similar to already-selected ones |

**Why weighted sum works:** It produces transparent, debuggable rankings. Each dimension can be independently tuned without retraining a model. For most fitness apps, this outperforms machine learning approaches because the feature space is well-understood from exercise science.

### 3.3 Iterative Re-Ranking

**Problem with greedy selection:** If you sort all exercises by score and take the top N, you may get 5 similar push exercises because each individually scores well.

**Solution:** Iterative re-ranking - after each pick, update the context (which mechanics have been used, which planes, etc.) and re-score remaining candidates.

```
For each exercise slot:
  1. Score all candidates with current context
  2. Pick highest-scoring candidate
  3. Update context (mechanics used, planes used, unilateral status)
  4. Return to step 1 for next slot
```

This produces diverse, well-balanced selections while still respecting primary scoring dimensions.

### 3.4 Movement Pattern Constraints

**Beyond scoring, impose structural constraints:**

A well-designed session should include exercises from fundamental movement patterns:

1. **Horizontal push** (bench press, push-up)
2. **Horizontal pull** (row, pull-up)
3. **Vertical push** (overhead press)
4. **Vertical pull** (lat pulldown, pull-up)
5. **Hip hinge** (deadlift, RDL)
6. **Squat** (squat, leg press)
7. **Carry/loaded movement** (farmer's walk)
8. **Core** (plank, cable crunch)
9. **Unilateral** (lunge, split squat)

**Approach:** Require at least one exercise from each required pattern before maximizing individual scores. This is "constraints first, optimization second."

### 3.5 Goal-Based Scoring Adjustments

Goals should modify scoring weights, not hard-filter the exercise pool:

| Goal | Compound Bonus | Isolation Penalty | Rep Range Bias |
|------|---------------|-------------------|----------------|
| Strength | +4 first pick, +2 subsequent | 0 | Low (1-6) |
| Build Muscle | +2 | 0 | Moderate (6-15) |
| Lose Fat | +1 | 0 | Moderate-High (8-20) |
| General Fitness | +1 | 0 | Moderate (8-15) |
| Recomposition | +2 | 0 | Moderate (6-15) |

**Why soft > hard:** Hard filters (removing all mobility work for strength goals) produce unbalanced programs. Soft scoring biases toward appropriate exercises while allowing necessary variety.

---

## 4. Periodization Models

### 4.1 What Is Periodization

Periodization is the systematic planning of training variables (volume, intensity, exercise selection) over time to maximize adaptation and minimize overtraining.

### 4.2 Linear (Block) Periodization

**Structure:** Sequential phases, each emphasizing one quality.

```
Accumulation (Hypertrophy) → Intensification (Strength) → Realization (Peaking) → Deload
```

| Phase | Weeks | Rep Range | Intensity (% 1RM) | RIR | Volume Modifier |
|-------|-------|-----------|-------------------|-----|-----------------|
| Accumulation | 2-4 | 8-12 | 60-70% | 2 | 1.0 |
| Intensification | 2-3 | 4-6 | 70-80% | 1 | 0.9 |
| Realization | 2-3 | 2-4 | 80-90% | 0 | 0.8 |
| Deload | 1 | 10-15 | 50-60% | 3 | 0.5 |

**Best for:** Beginners (simplicity), advanced lifters (specialized overload), strength-focused goals.

### 4.3 Undulating Periodization

**Structure:** Varies rep ranges within each week (daily undulation) or across weeks (weekly undulation).

```
Session A: 10-12 reps (hypertrophy focus)
Session B: 6-8 reps (strength focus)
Session C: 12-15 reps (metabolic focus)
```

**Best for:** Intermediate lifters pursuing muscle growth, users who benefit from variety.

### 4.4 Block Periodization (Specialized)

**Structure:** Entire mesocycles dedicated to a single training quality.

```
Hypertrophy Block (4 weeks) → Strength Block (4 weeks) → Peaking Block (3 weeks) → Deload (1 week)
```

**Best for:** Advanced lifters, competition preparation, strength-focused goals.

### 4.5 Periodization Selection Logic

The choice of periodization model should depend on multiple factors:

| Factor | Beginner | Intermediate | Advanced |
|--------|----------|-------------|----------|
| **Experience** | Linear | Varies | Block |
| **Goal** | Any → Linear | Strength → Block; Muscle → Undulating | Strength → Block |
| **Frequency** | Any | 3+ days | 4+ days |
| **Recovery capacity** | Not a factor | Moderate importance | Critical factor |

**Best practice:** Don't select periodization type solely from (goal, experience). Incorporate recovery status, training frequency, and adherence history for a more robust selection.

### 4.6 Rep Range Mapping by Goal

Each goal has an evidence-based rep range "home base":

| Goal | Primary Rep Range | Supporting Evidence |
|------|-------------------|---------------------|
| Maximal Strength | 1-6 reps | Neural adaptations, motor unit recruitment (Schoenfeld et al., 2021) |
| Hypertrophy | 6-15 reps | Mechanical tension + metabolic stress (Schoenfeld & Krieger, 2017) |
| Muscular Endurance | 15-25 reps | Mitochondrial density, capillarization |
| Fat Loss | 8-20 reps | Higher reps → higher caloric expenditure per set |
| General Fitness | 8-15 reps | Balanced approach |

**Important:** The 5-30 rep range produces similar hypertrophy when sets are taken near failure (Schoenfeld et al., 2021). The rep range matters less than proximity to failure and total volume.

---

## 5. Volume & Load Prescription

### 5.1 Volume Landmarks (MEV/MAV/MRV)

Based on the work of Dr. Mike Israetel (Renaissance Periodization), weekly set volumes per muscle group have three critical thresholds:

| Threshold | Definition | Practical Meaning |
|-----------|-----------|-------------------|
| **MEV** (Minimum Effective Volume) | Minimum weekly sets to stimulate growth | Below this → no adaptation |
| **MAV** (Maximum Adaptive Volume) | Optimal weekly sets for maximal growth | Sweet spot for most training |
| **MRV** (Maximum Recoverable Volume) | Maximum weekly sets before recovery fails | Above this → overtraining |

**Population defaults per muscle group (weekly sets) - used until personal landmarks converge after 8 weeks:**

| Muscle Group | MEV | MAV | MRV |
|-------------|-----|-----|-----|
| Chest | 10 | 14 | 18 |
| Quads | 10 | 16 | 22 |
| Hamstrings | 8 | 12 | 16 |
| Shoulders | 8 | 12 | 16 |
| Lats | 8 | 14 | 18 |
| Biceps | 8 | 12 | 16 |
| Triceps | 8 | 12 | 16 |
| Glutes | 10 | 14 | 18 |
| Calves | 6 | 10 | 14 |
| Abs | 8 | 12 | 16 |

> **Important:** After 8–12 weeks, population defaults are replaced by **adaptive personal landmarks** derived from the user's actual performance response (see [Section 16](#16-adaptive-volume-landmarks-upgrade-g)). Population values are a prior, not a permanent prescription.

**Prescription formula:**

```
weeklyTarget = MEV + (MAV - MEV) × 0.5   // Target midpoint of optimal range
perExerciseSets = weeklyTarget / numberOfExercisesForMuscle
perExerciseSets = clamp(2, 5, perExerciseSets)
```

All MRV values are additionally multiplied by `fatigue_accumulation_modifier` (see [Section 14](#14-intra-session-fatigue-rate-upgrade-e)) and `bodyweightVolumeModifier` (see [Section 18](#18-bodyweight-trend-as-recovery-signal-upgrade-i)).

### 5.2 Experience-Based Volume Adjustments

Volume tolerance scales with training experience:

```
Beginner:     landmarks × 0.7  (beginners recover slower, adapt faster with less)
Intermediate: landmarks × 1.0  (baseline)
Advanced:     landmarks × 1.15 (advanced lifters need more volume for continued adaptation)
```

### 5.3 The Set Count Modifier (Periodization Integration)

Volume should decrease as intensity increases across a periodization cycle:

| Phase | Set Count Modifier | Rationale |
|-------|--------------------|-----------|
| Accumulation | 1.0 | High volume, moderate intensity |
| Intensification | 0.9 | Moderate volume, higher intensity |
| Realization | 0.8 | Lower volume, highest intensity |
| Deload | 0.5 | Minimal volume for recovery |

### 5.4 Duration-Based Exercise Scaling

Session duration should influence the number of exercises per session:

| Duration | Scaling Factor | Approximate Exercises |
|----------|---------------|----------------------|
| < 30 min | 0.5× | 3-4 |
| 30-44 min | 0.75× | 4-5 |
| 45-74 min | 1.0× (baseline) | 5-7 |
| 75-89 min | 1.25× | 6-8 |
| ≥ 90 min | 1.5× | 7-9 |

**Better approach (time budgeting):**

Rather than naive multipliers, split the session into time blocks:

```
Session time = warmup (5-10 min) + main lifts + accessories + rest periods
```

Estimate per-exercise time based on sets × (work time + rest time):
- A 3×10 exercise with 90s rest ≈ 3 × (40s + 90s) ≈ 6.5 minutes
- A 4×6 compound with 180s rest ≈ 4 × (30s + 180s) ≈ 14 minutes

This produces more realistic exercise counts than simple multipliers.

---

## 6. Starting Weight Estimation

### 6.1 Bodyweight Ratio Method

**Approach:** Multiply bodyweight by exercise-specific coefficients derived from strength standards research.

```
startingWeight = bodyweight × experienceCoefficient × safetyFactor(0.85)
```

**Strength coefficients (bodyweight multipliers for approximate 1RM):**

| Exercise | Beginner | Intermediate | Advanced |
|----------|----------|-------------|----------|
| Squat | 0.75 | 1.25 | 1.75 |
| Bench Press | 0.55 | 0.9 | 1.25 |
| Deadlift | 1.0 | 1.5 | 2.0 |
| Overhead Press | 0.35 | 0.6 | 0.85 |
| Barbell Row | 0.5 | 0.85 | 1.15 |

**Sources:** Symmetric Strength, ExRx strength standards databases.

**Working weight** = Estimated 1RM × 0.85 (leaves room for progressive overload).

### 6.2 Known Limitations

**The bodyweight noise problem:** Bodyweight is a poor proxy for strength in certain populations:

- **Overweight beginners:** 120kg person with no training history → 120 × 0.75 × 0.85 = 76.5kg squat estimate (dangerously high)
- **Very light individuals:** 55kg person → 55 × 1.25 × 0.85 = 58.6kg squat (may be appropriate but confidence is low)

**Mitigation strategies:**
1. **Per-exercise caps** - cap at bodyweight only for exercises where that's reasonable (e.g. squat). A beginner bench-press cap at bodyweight is dangerous; each exercise needs its own upper-bound coefficient. (Critical Issue #10 in the implementation plan.)
2. Apply BMI-based adjustment (BMI > 30 → reduce coefficient by 25%)
3. Use lean body mass instead of total bodyweight
4. Combine with Epley e1RM from known peak lifts when available (see Section 12)

### 6.3 Epley e1RM from Known Peak Lifts [Upgrade C]

When users have training history with known peak lifts, use the **Epley formula** with RPE adjustment (accurate in the 1–10 rep range; do not apply beyond 12 reps):

```typescript
function epley1RM(weight: number, reps: number): number {
  if (reps === 1)  return weight
  if (reps > 12)   return weight  // formula degrades; return raw weight as floor
  return weight * (1 + reps / 30)
}

// RPE-adjusted 1RM using Helms percentage table
const rpePercentage: Record<number, number> = {
  10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91,
  8: 0.89,  7.5: 0.86, 7: 0.83, 6.5: 0.80, 6: 0.77
}

function rpeAdjusted1RM(weight: number, reps: number, rpe: number): number {
  const epleyMax = epley1RM(weight, reps)
  const rpePct = rpePercentage[rpe] ?? rpePercentage[Math.round(rpe)]
  if (!rpePct) return epleyMax
  return epleyMax / rpePct
}
```

Working weight = estimated 1RM × 0.75 (conservative 75% to leave room for progressive overload).

This overrides the bodyweight-based estimate when available, providing much more accurate starting points. The same Epley e1RM is used as the primary strength-progress metric throughout the app (see [Section 12](#12-strength-tracking-epley-e1rm-upgrade-c)).

### 6.4 The Autoregulation Alternative

**The strongest approach:** Don't predict weights at all. Instead:

1. User performs warmup sets starting light
2. Progressively increases weight each set
3. Stops at target RPE (Rate of Perceived Exertion) 7-8
4. System saves that as the working weight

**Advantages:**
- No estimation error
- Accounts for daily variability (sleep, stress, nutrition)
- User learns to self-regulate from day one
- Self-correcting over time

**This is the approach used by most high-quality coaching systems.** Bodyweight estimation can serve as a starting point suggestion, but autoregulation should be the primary mechanism.

---

## 7. Nutrition Modeling

### 7.1 Basal Metabolic Rate (BMR)

**Mifflin-St Jeor equation** (most accurate for general population):

```
Male:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) + 5
Female: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) − 161
```

### 7.2 Total Daily Energy Expenditure (TDEE)

```
TDEE = BMR × Activity Multiplier
```

| Activity Level | Multiplier | Description |
|---------------|-----------|-------------|
| Sedentary | 1.2 | Desk job, little exercise |
| Light | 1.375 | Light exercise 1-3 days/week |
| Moderate | 1.55 | Moderate exercise 3-5 days/week |
| High | 1.725 | Hard exercise 6-7 days/week |

### 7.3 Goal-Based Calorie Adjustment

**Current approach (simple):**

| Goal | Adjustment |
|------|-----------|
| Lose fat | TDEE − 400 + 150 (training day bonus) |
| Build muscle | TDEE + 250 + 150 |
| Strength | TDEE + 150 + 150 |
| Recomposition | TDEE + 150 |

**Better approach (percentage-based):**

| Goal | Deficit/Surplus | Range |
|------|----------------|-------|
| Fat loss | 10-20% below TDEE | Scale by body composition (higher body fat → larger deficit acceptable) |
| Muscle gain | 5-15% above TDEE | Scale by training age (advanced → smaller surplus) |
| Recomposition | ±0-5% | Near maintenance with high protein |

**Factors that should influence the adjustment:**
- Body composition (body fat %)
- Training age (beginners can handle more aggressive deficits)
- Adherence history (start conservative, adjust based on adherence)
- Rate of weight change target (0.5-1% bodyweight/week loss is safe)

### 7.4 Macro Prescription

```
Protein = leanBodyMass(kg) × (trainingDay ? 2.2 : 1.8) g
Fat     = totalCalories × 0.25 / 9   (25% of calories)
Carbs   = (totalCalories − protein×4 − fat×9) / 4
Water   = bodyWeight(kg) × 35 ml
Fiber   = ≥ 25g/day
```

**Why lean mass for protein:** Protein targets should scale with muscle mass, not total mass. A 100kg person with 30% body fat has 70kg lean mass and needs less protein than a 100kg person with 15% body fat (85kg lean mass).

### 7.5 Body Composition Estimation

When no direct measurement is available:

**US Navy tape method** (validated ±3% vs DEXA):
```
Male:   BF% = 86.010 × log10(waist − neck) − 70.041 × log10(height) + 36.76
Female: BF% = 163.205 × log10(waist + hip − neck) − 97.684 × log10(height) − 78.387
```

**BMI-based heuristic** (crude, for initial estimation only):
```
BMI = weight(kg) / height(m)²
Male:   BF% ≈ BMI × 1.0 + 2
Female: BF% ≈ BMI × 1.2 + 4
```

---

## 8. Fatigue & Readiness Monitoring

### 8.1 Fitness/Fatigue Model - Banister EWMA [Upgrade A]

The rolling 28-day ACWR has been superseded by the **Banister impulse-response model** - the same model used internally by Garmin, TrainingPeaks, and Whoop. It reacts more appropriately to ramp-up phases, does not over-react to single missed weeks, and weights recent sessions more heavily than old ones.

```typescript
// src/lib/algorithms/fatigue.ts

interface FitnessState {
  fitness: number   // CTL: Chronic Training Load - slow decay, represents adaptation
  fatigue: number   // ATL: Acute Training Load - fast decay, represents accumulated stress
  form: number      // TSB: Training Stress Balance = fitness - fatigue (negative = fatigued)
}

const FITNESS_TC = 42  // days - time constant for fitness decay (CTL)
const FATIGUE_TC = 7   // days - time constant for fatigue decay (ATL)
const FITNESS_K  = 1 - Math.exp(-1 / FITNESS_TC)   // ≈ 0.0233
const FATIGUE_K  = 1 - Math.exp(-1 / FATIGUE_TC)   // ≈ 0.1331

function updateFitnessState(prev: FitnessState, todayLoad: number): FitnessState {
  const fitness = prev.fitness + FITNESS_K * (todayLoad - prev.fitness)
  const fatigue = prev.fatigue + FATIGUE_K * (todayLoad - prev.fatigue)
  return { fitness, fatigue, form: fitness - fatigue }
}

// Bootstrap: iterate over all historical sessions in chronological order.
// On days with no session, call updateFitnessState(prev, 0).
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

**Schema:** Snapshots are materialised nightly to avoid recomputing full history on every dashboard load:

```sql
fitness_snapshots (
  user_id uuid FK,
  date date,
  fitness  numeric,  -- CTL
  fatigue  numeric,  -- ATL
  form     numeric,  -- TSB
  PRIMARY KEY (user_id, date)
)
```

**Form score for readiness (replaces acwrScore):**
```typescript
// form range: typically -50 (overtrained) to +25 (fresh/detrained)
// Peak performance zone: form -5 to +5
const formScore = clamp(0, 35, 35 * (1 - Math.abs(state.form) / 40))
```

**Legacy note:** The rolling-window ACWR function `computeACWR` in `src/lib/algorithms/fatigue.ts` should be replaced entirely by `buildFitnessHistory` + `updateFitnessState`. The ACWR is still used in the Phase 9 implementation but is superseded once Upgrade A is in place.

### 8.2 Session Load Formula [Upgrade H]

Session load includes a **duration modifier** derived from actual vs planned session length. Consistently longer sessions correlate with accumulated fatigue; early abandonment is a deload signal.

```typescript
function sessionDurationModifier(actualMinutes: number, plannedMinutes: number): number {
  const ratio = actualMinutes / plannedMinutes
  if (ratio < 0.5)  return 0.6   // abandoned
  if (ratio < 0.8)  return 0.85
  if (ratio <= 1.3) return 1.0   // normal
  if (ratio <= 1.6) return 1.1   // grinding
  return 1.2                      // much longer than planned
}

function sessionLoad(sets: SessionSet[], durationModifier: number): number {
  const rawLoad = sets.reduce(
    (sum, s) => sum + s.set_number * s.reps * s.weight_kg * rpeMultiplier(s.rpe), 0
  )
  return rawLoad * durationModifier
}
```

`started_at` and `completed_at` are already stored in `workout_sessions`; this is a zero-cost signal.

### 8.3 Readiness Score

A composite readiness score (0–100) combining form, rolling check-in EMA, and sleep:

```typescript
function readinessScore(fitnessState: FitnessState, checkinEMA: number, sleepHours: number): number {
  const formScore    = clamp(0, 35, 35 * (1 - Math.abs(fitnessState.form) / 40))
  const checkinScore = clamp(0, 40, (checkinEMA / 5) * 40)
  const sleepScore   = clamp(0, 25, Math.min(sleepHours / 8, 1) * 25)
  return Math.round(formScore + checkinScore + sleepScore)
}
```

See [Section 11](#11-pre-session-check-in-upgrade-b) for the `checkinEMA` derivation.

### 8.4 Deload Detection

Automatic deload triggers (in priority order):

| Signal | Threshold | Action |
|--------|-----------|--------|
| Banister form | < −30 | Mandatory deload |
| fatigue/fitness ratio | > 1.5 | Mandatory deload |
| Readiness score | < 50 | Deload recommended |
| 3+ consecutive check-ins | ≤ 2 | Suggest deload regardless of EWMA state |
| Check-in ≤ 1 with limiter `'illness'` | - | Recommend rest day; block workout start (with override) |
| RPE ≥ 9 | 3+ consecutive sessions | Reduce volume 40% |
| e1RM declining | > 5% over 3 sessions | Deload + check recovery factors |

> **Implementation note (Critical Issue #9):** Do NOT mutate `workout_day_exercises.suggested_sets` during a deload. Use a `deload_active` flag in `workout_plans` and apply the `0.5×` multiplier at read time to prevent permanent plan corruption.

### 8.5 Recovery Profile Modifier

Recovery data from `user_profiles` is used to scale training volume at plan generation and at each weekly check-in:

| Condition | Volume Modifier |
|-----------|----------------|
| sleep ≥ 7h, stress ≤ 2, desk job | 1.0× |
| sleep 6–7h OR stress 3, mixed job | 0.9× |
| sleep < 6h AND stress ≥ 3 | 0.8× |
| sleep < 5h OR stress ≥ 4 OR physical job | 0.75× |

```typescript
recoveryModifier = normalize(sleepHours, stressLevel, jobActivity, cardioFrequency)
adjustedVolume   = prescribedVolume × recoveryModifier
```

A user sleeping 4 hours should not train at the same volume as one sleeping 8 hours. This is the single highest-ROI personalization improvement available without new hardware.

---

## 9. Plan Quality Assessment

### 9.1 Multi-Dimensional Plan Scoring

After generation, plans should be scored across multiple dimensions:

| Dimension | Weight | What to Measure |
|-----------|--------|-----------------|
| Equipment coverage | 20% | % of exercises using available equipment |
| Volume balance | 35% | How well MEV/MAV targets are hit per muscle |
| Recovery fit | 20% | Training days vs rest days appropriateness |
| Goal alignment | 25% | Rep ranges matching goal expectations |

### 9.2 Volume Balance Scoring

For each major muscle group, compare planned sets against volume landmarks:

```
score per muscle:
  0 sets        → 0 points  (no stimulus)
  < MEV         → 30 points (insufficient)
  MEV – MAV    → 100 points (optimal)
  MAV – MRV    → 70 points (high but recoverable)
  > MRV         → 40 points (overtraining risk)
```

Average across scored muscles for the volume balance dimension.

### 9.3 Validation Checks

Plans should be validated for:

1. **No duplicate exercises** within a single day
2. **No recovery-only exercises** in hypertrophy/strength plans (flexibility/mobility shouldn't dominate)
3. **Set counts in valid range** (2-6 sets per exercise)
4. **Rep ranges properly formatted** and within physiological ranges
5. **Rest periods appropriate** (30s-300s range)

### 9.4 Style-Frequency Compatibility

Validate that the training style is compatible with the chosen frequency:

| Days/Week | Compatible Styles | Incompatible |
|-----------|-------------------|--------------|
| 2 | Full body | PPL, bodybuilding split, upper/lower |
| 3 | Full body, PPL | Bodybuilding split |
| 4 | Upper/lower, PPL, bodybuilding split | - |
| 5+ | Any style | - |

When incompatible combinations are detected, recommend an alternative or force a compatible style.

---

## 10. Feedback Loops & Adaptation

### 10.1 Why Feedback Loops Are Essential

> A plan generator without adaptation is a calculator, not a coach.

The most impactful improvement any training app can make is connecting session data back to plan modification.

### 10.2 Data to Track Per Session

| Data Point | Source | Use |
|-----------|--------|-----|
| Exercises completed | Session log | Completion rate |
| Sets completed | Session log | Volume adherence |
| Reps per set | Session log | Performance trend |
| Weight per set | Session log | Load progression |
| RPE per set | Session log | Intensity calibration |
| Session duration | Timer | Time budget accuracy |
| Completion % | Calculated | Adherence metric |
| Tags (felt strong, low energy, etc.) | User input | Subjective readiness |

### 10.3 Adaptation Rules

**Progressive overload (when to increase load):**

All RPE thresholds below use **calibrated RPE** - see [Section 13](#13-rpe-calibration-drift-correction-upgrade-d). Raw RPE from beginners is systematically deflated; applying raw thresholds will misfire for months.

```
IF all target reps completed AND calibratedRPE ≤ 7:
  → Increase weight next session using personalizedIncrement (see Section 15)

IF all target reps completed AND calibratedRPE 7-8:
  → Maintain weight, aim for top of rep range

IF average reps < 70% of target AND calibratedRPE > 8:
  → Decrease weight or repeat weight
```

**Plateau detection** uses e1RM trend rather than raw weight (see [Section 12](#12-strength-tracking-epley-e1rm-upgrade-c)):

```typescript
// If e1RM drops > 5% over 3 consecutive sessions → flag regression
function detectPlateau(e1rmHistory: number[]): 'progressing' | 'plateau' | 'regression' {
  if (e1rmHistory.length < 3) return 'progressing'
  const recent = e1rmHistory.slice(-3)
  const trend = (recent[2] - recent[0]) / recent[0]
  if (trend > 0.01)  return 'progressing'
  if (trend > -0.05) return 'plateau'
  return 'regression'
}
```

**Volume adaptation (when to modify sets):**

```
IF performance improving AND recovery good:
  → Increase weekly sets by 1-2 per muscle (progressive overload)

IF plateau (2+ weeks no improvement):
  → Increase volume by 10-15% OR change rep range

IF fatigue indicators high (RPE consistently >8, declining e1RM):
  → Reduce volume by 20-30%
  → Schedule deload week
```

**Deload triggering:**

```
IF ACWR > 1.5:
  → Mandatory deload (reduce volume 40-50%)

IF readiness score < 50:
  → Recommended deload

IF consecutive sessions RPE ≥ 9:
  → CNS fatigue detected → reduce intensity
```

### 10.4 The Autoregulation Loop

The ideal feedback loop operates at multiple timescales:

| Timescale | Adaptation | Example |
|-----------|-----------|---------|
| **Within session** | RPE-based weight selection | "Stop at calibrated RPE 8, save weight as working weight" |
| **Between sessions** | e1RM-based load progression | "e1RM trend positive → apply personalizedIncrement" |
| **Weekly** | Volume adjustment | "Performance flat → increase sets by 1 per muscle" |
| **Bi-weekly** | Check-in response | "3 consecutive check-ins ≤ 2 → reduce volume 10%" |
| **Monthly** | Plan regeneration | "Block complete → new mesocycle phase (Upgrade J)" |
| **Quarterly** | Goal reassessment | "Reassess body composition, update targets" |

### 10.5 Constraint → Generate → Observe → Adapt

The ideal system architecture:

```
Collect useful data only
  → Generate constrained plan
    → Observe user response
      → Adapt plan
        → Observe response
          → Adapt again
            → ... (continuous loop)
```

This is fundamentally different from the "generate once, done" approach. The plan is a living document that evolves with the user.

---

## 11. Pre-Session Check-In [Upgrade B]

### 11.1 Why Static Recovery Data Is Insufficient

`sleep_hours` and `stress_level` are collected once at onboarding and never updated per session. The readiness score is therefore built on stale static data - equivalent to Garmin reading your HRV the day you bought the watch and never again. The fix requires one extra question before each workout.

### 11.2 Check-In Prompt

```
"How are you feeling today?" → ⚡ 1  😐 2  🙂 3  💪 4  🔥 5
```

Optional follow-up shown only if score ≤ 2:
```
"What's dragging you down?" → 😴 Poor sleep  😰 High stress  💢 Sore muscles  🤒 Feeling ill
```

**Schema:**
```sql
ALTER TABLE workout_sessions ADD COLUMN checkin_score int;        -- 1–5
ALTER TABLE workout_sessions ADD COLUMN checkin_limiters text[];  -- ['sleep','stress','soreness','illness']
```

### 20.3 Rolling Check-In EMA

```typescript
function rollingCheckinEMA(recentSessions: WorkoutSession[], k = 0.3): number {
  // k = 0.3 weights last session at 30%, session before at 21%, etc.
  return recentSessions
    .filter(s => s.checkin_score != null)
    .reduce((ema, s) => k * s.checkin_score! + (1 - k) * ema, 3.0) // seed at neutral 3
}
```

This replaces the static `sleep_hours`/`stress_level` lookup in the readiness score (see Section 8.3).

### 20.4 Deload Triggers from Check-In

- 3 consecutive check-ins ≤ 2 → suggest deload regardless of EWMA state
- Check-in ≤ 1 with limiter `'illness'` → recommend rest day, block workout start (with override)

---

## 12. Strength Tracking: Epley e1RM [Upgrade C]

### 12.1 The Problem with Raw Weight as a Progress Metric

`MAX(weight_kg)` per week is volume-dependent: a week of 3×5 at 100kg looks worse than 3×12 at 70kg even if fitness improved. Progress charts will show noise, not signal.

### 12.2 Epley Formula with RPE Adjustment

```typescript
// src/lib/algorithms/strength.ts

function epley1RM(weight: number, reps: number): number {
  if (reps === 1)  return weight
  if (reps > 12)   return weight  // formula degrades above 12 reps
  return weight * (1 + reps / 30)
}

const rpePercentage: Record<number, number> = {
  10: 1.00, 9.5: 0.97, 9: 0.94, 8.5: 0.91,
  8: 0.89,  7.5: 0.86, 7: 0.83, 6.5: 0.80, 6: 0.77
}

function rpeAdjusted1RM(weight: number, reps: number, rpe: number): number {
  const epleyMax = epley1RM(weight, reps)
  const rpePct = rpePercentage[rpe] ?? rpePercentage[Math.round(rpe)]
  if (!rpePct) return epleyMax
  return epleyMax / rpePct
}

// Best e1RM for a session = set with highest estimated 1RM
function sessionE1RM(sets: SessionSet[]): number {
  return Math.max(...sets.map(s => rpeAdjusted1RM(s.weight_kg, s.reps, s.rpe)))
}
```

### 12.3 Schema

```sql
-- Materialised per-exercise per-session e1RM - updated after each session completion
exercise_e1rm_history (
  user_id uuid FK,
  exercise_id uuid FK,
  session_id uuid FK,
  date date,
  e1rm_kg numeric,
  PRIMARY KEY (user_id, exercise_id, session_id)
)
```

Strength progress queries read from `exercise_e1rm_history.e1rm_kg`, not `MAX(weight_kg)`.

---

## 13. RPE Calibration Drift Correction [Upgrade D]

### 13.1 The Problem

RPE is treated as a stable, calibrated signal. Beginners systematically under-rate RPE - they report RPE 7 on sets that are effectively RPE 9 because they don't know what near-failure feels like. The progressive overload thresholds (`calibratedRPE ≤ 7 → progress`) will misfire for months with new users.

### 13.2 Calibration Algorithm

```typescript
// src/lib/algorithms/rpe-calibration.ts

interface RpeCalibration {
  offset: number      // negative = user underestimates effort (common for beginners)
  confidence: number  // 0–1; based on sample size (requires 20+ sets)
}

function computeRpeCalibration(recentSets: SessionSet[], targetReps: number): RpeCalibration {
  const sample = recentSets.filter(s => s.rpe >= 6 && s.rpe <= 9)
  if (sample.length < 20) return { offset: 0, confidence: 0 }

  // At RPE 8, completion rate should be ~90%
  const rpe8Sets = sample.filter(s => s.rpe === 8)
  const completionAtRpe8 = rpe8Sets.filter(s => s.reps >= targetReps).length / rpe8Sets.length
  const offset = (0.90 - completionAtRpe8) * -2.5  // scale to RPE units

  return {
    offset: clamp(-2, 0.5, offset),
    confidence: Math.min(1, sample.length / 50)
  }
}

function calibratedRpe(raw: number, cal: RpeCalibration): number {
  return raw + cal.offset * cal.confidence
}
```

**Schema:**
```sql
ALTER TABLE user_profiles ADD COLUMN rpe_offset numeric DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN rpe_calibration_confidence numeric DEFAULT 0;
-- Recomputed monthly via scheduled function
```

---

## 14. Intra-Session Fatigue Rate [Upgrade E]

### 14.1 Why Fixed Volume Landmarks Under-Serve Individuals

Population MEV/MAV/MRV are starting estimates, not personal ground truth. A user with fast fatigue accumulation will hit their personal MRV at lower set counts than the population table predicts.

### 14.2 Algorithm

```typescript
// src/lib/algorithms/intra-session-fatigue.ts

function rpeRiseRate(sets: SessionSet[]): number | null {
  if (sets.length < 2) return null
  const sorted = [...sets].sort((a, b) => a.set_number - b.set_number)
  const deltas = sorted.slice(1).map((s, i) => s.rpe - sorted[i].rpe)
  return mean(deltas)  // RPE points per set
}

function personalMRVModifier(rpeRiseRate: number): number {
  if (rpeRiseRate <= 0.5) return 1.1   // slow accumulator - can handle more
  if (rpeRiseRate <= 1.0) return 1.0   // average
  if (rpeRiseRate <= 1.5) return 0.9   // moderate accumulator
  return 0.8                            // fast accumulator - reduce volume ceiling
}
```

**Schema:**
```sql
ALTER TABLE user_profiles ADD COLUMN fatigue_accumulation_modifier numeric DEFAULT 1.0;
-- Updated after each session by a background job
```

Apply `fatigue_accumulation_modifier` as a multiplier on all MRV values before volume color-coding (Phase 7.3) and before the sets cap in `calcSetsReps` (Phase 4.3).

---

## 15. Personalized Weight Increments [Upgrade F]

### 15.1 The Problem with Fixed Increments

Fixed increments (2.5kg upper / 5kg lower) are beginner defaults. Intermediate and advanced lifters plateau at these increments within weeks of initial adaptation.

### 15.2 Algorithm

```typescript
// src/lib/algorithms/progressive-overload.ts

function personalizedIncrement(
  exerciseId: string,
  e1rmHistory: number[],   // last 6 sessions
  experience: string
): number {
  const isLower = isLowerBodyExercise(exerciseId)
  const baseIncrement = isLower ? 5 : 2.5

  if (e1rmHistory.length < 4) return baseIncrement  // not enough data

  const weeklyGain = (e1rmHistory[e1rmHistory.length - 1] - e1rmHistory[0]) / (e1rmHistory.length - 1)

  if (weeklyGain > baseIncrement * 0.8) return baseIncrement         // fast progress: use default
  if (weeklyGain > baseIncrement * 0.3) return baseIncrement * 0.5   // half-increment
  return baseIncrement * 0.25  // micro-load - suggest fractional plates
}
```

When increment drops to micro-load territory, surface a UI tip: *"Consider fractional plates (1.25kg) - you're in intermediate territory."*

**Prerequisite:** Epley e1RM history from [Section 12](#12-strength-tracking-epley-e1rm-upgrade-c).

---

## 16. Adaptive Volume Landmarks [Upgrade G]

### 16.1 When Personal Landmarks Replace Population Defaults

After 8–12 weeks of logged training, the system has enough data to fit a per-user piecewise response curve: flat → rising → plateau → decline. At that point, population defaults are blended out proportional to confidence.

### 16.2 Algorithm

```typescript
// src/lib/algorithms/volume-landmarks.ts

interface VolumeLandmarks {
  mev: number
  mav: number
  mrv: number
  confidence: number  // 0–1; below 0.5, population defaults dominate
}

function updatePersonalLandmarks(
  weeklySets: number[],
  weeklyE1rmChange: number[],
  populationDefaults: VolumeLandmarks
): VolumeLandmarks {
  if (weeklySets.length < 8) return { ...populationDefaults, confidence: 0 }

  const observedMEV = findInflectionPoint(weeklySets, weeklyE1rmChange, 'start')
  const observedMRV = findInflectionPoint(weeklySets, weeklyE1rmChange, 'decline')
  const conf = Math.min(1, weeklySets.length / 16)

  return {
    mev: lerp(populationDefaults.mev, observedMEV ?? populationDefaults.mev, conf),
    mav: lerp(populationDefaults.mav, ((observedMEV + observedMRV) / 2) ?? populationDefaults.mav, conf),
    mrv: lerp(populationDefaults.mrv, observedMRV ?? populationDefaults.mrv, conf),
    confidence: conf
  }
}
```

**Schema:**
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

## 17. Session Duration as Fatigue Proxy [Upgrade H]

See [Section 8.2](#82-session-load-formula-upgrade-h). `started_at` and `completed_at` in `workout_sessions` are already stored; this upgrade adds them to the session load computation at zero schema cost.

---

## 18. Bodyweight Trend as Recovery Signal [Upgrade I]

### 18.1 Algorithm

```typescript
// src/lib/algorithms/bodyweight-trend.ts

function bodyweightTrend(logs: BodyweightLog[]): {
  weeklyRateKg: number
  signal: 'bulk' | 'cut' | 'maintain' | 'rapid-loss' | 'insufficient-data'
} {
  const recent = logs.slice(-14).sort((a, b) => a.date.localeCompare(b.date))
  if (recent.length < 5) return { weeklyRateKg: 0, signal: 'insufficient-data' }

  const weeklyRate = linearRegressionSlope(recent.map(l => l.weight_kg)) * 7

  if (weeklyRate < -0.75) return { weeklyRateKg: weeklyRate, signal: 'rapid-loss' }
  if (weeklyRate < -0.2)  return { weeklyRateKg: weeklyRate, signal: 'cut' }
  if (weeklyRate > 0.5)   return { weeklyRateKg: weeklyRate, signal: 'bulk' }
  return { weeklyRateKg: weeklyRate, signal: 'maintain' }
}

function bodyweightVolumeModifier(signal: string): number {
  return {
    'rapid-loss': 0.85,
    'cut': 0.90,
    'maintain': 1.0,
    'bulk': 1.05,
    'insufficient-data': 1.0
  }[signal] ?? 1.0
}
```

### 18.2 Usage

Apply `bodyweightVolumeModifier` to the `calcSetsReps` output alongside the recovery modifier (Section 8.5) and `fatigue_accumulation_modifier` (Section 14).

**Dashboard warning:** If `signal === 'rapid-loss'` and goal is `muscle_gain`, surface: *"Weight dropping faster than expected for muscle gain. Check calorie intake."*

---

## 19. Mesocycle Progression Planning [Upgrade J]

### 19.1 The Problem with Purely Reactive Volume Prescription

Volume and load prescribed week-by-week with no structured arc is equivalent to suggesting today's workout without a training block plan - accurate locally, blind globally.

### 19.2 4-Week Mesocycle Model

```typescript
// src/lib/algorithms/mesocycle.ts

interface Mesocycle {
  weekNumber: 1 | 2 | 3 | 4
  volumeMultiplier: number
  intensityTarget: string  // rep range
}

const mesocycleWeeks: Mesocycle[] = [
  { weekNumber: 1, volumeMultiplier: 0.85, intensityTarget: '10-12' },  // intro
  { weekNumber: 2, volumeMultiplier: 1.00, intensityTarget: '8-10' },
  { weekNumber: 3, volumeMultiplier: 1.10, intensityTarget: '6-8' },    // overreach
  { weekNumber: 4, volumeMultiplier: 0.55, intensityTarget: '10-12' },  // deload
]

function currentMesocycleWeek(planStartDate: Date): Mesocycle {
  const weeksSinceStart = Math.floor(daysBetween(planStartDate, new Date()) / 7)
  return mesocycleWeeks[weeksSinceStart % 4]
}
```

**Schema:**
```sql
ALTER TABLE workout_plans ADD COLUMN start_date date;
-- Mesocycle week is derived at runtime - no need to store it
```

Apply `volumeMultiplier` to the `calcSetsReps` output and `intensityTarget` to override the default rep range each week. The deload week (week 4) naturally aligns with the Banister form score recovery peak - deload is scheduled, not just reactive.

---

## 20. Common Pitfalls & Anti-Patterns

### 20.1 Collecting Data Without Algorithms

**Anti-pattern:** Asking 20 onboarding questions but only using 10 in the algorithm.

**Impact:** Lower onboarding completion rate, user frustration, maintenance burden.

**Fix:** Every collected field must have at least one consuming algorithm. Period.

### 20.2 Hard Filters Instead of Soft Scoring

**Anti-pattern:** "User wants strength → remove all mobility exercises."

**Impact:** Imbalanced programs, missing movement patterns, potential for overuse injuries.

**Fix:** Use scoring weights that bias toward appropriate exercises while preserving variety.

### 20.3 Bodyweight as Strength Proxy

**Anti-pattern:** Starting weight = bodyweight × coefficient (ignoring body composition).

**Impact:** Overweight beginners get dangerously high estimates; underweight individuals get inadequate loads.

**Fix:** Use peak lift data when available, cap bodyweight estimates, or switch to autoregulation.

### 20.4 Naive Duration Scaling

**Anti-pattern:** 90-minute session → 150% more exercises (produces 15+ exercises per session).

**Impact:** Unrealistic plans, garbage training quality, user overwhelm.

**Fix:** Use time-budgeting (warmup + exercises × time per exercise + rest) to calculate realistic capacity.

### 20.5 Ignoring Recovery Data

**Anti-pattern:** Collecting sleep, stress, and job activity but generating plans as if they don't exist.

**Impact:** Same volume regardless of recovery state, overtraining risk, poor adherence.

**Fix:** Create a recovery modifier that scales training volume. Poor recovery → less volume.

### 20.6 Static Plans

**Anti-pattern:** Generate plan once → never modify based on performance.

**Impact:** Plans become stale, users plateau, app feels like a PDF, not a coach.

**Fix:** Implement feedback loops using RPE, completion rate, and performance trends to drive plan adaptation.

### 20.7 Overly Coarse Experience Buckets

**Anti-pattern:** Three experience levels (beginner/intermediate/advanced) lose nuance.

**Impact:** A 6-month lifter and a 5-year lifter get the same treatment.

**Fix:** Compute a composite training score: `years + strengthPercentile + consistencyScore`, then map to a continuous spectrum.

### 20.8 Fixed Nutrition Offsets

**Anti-pattern:** Fat loss = TDEE - 400, muscle gain = TDEE + 250 (regardless of body size).

**Impact:** A 60kg female and a 100kg male get the same absolute deficit, which is proportionally very different.

**Fix:** Use percentage-based adjustments (10-20% deficit) that scale with the individual's TDEE.

---

## 21. Scientific References

### Volume & Hypertrophy
- Schoenfeld, B.J. & Krieger, J.W. (2017). "Exercise dose and muscle hypertrophy." *Sports Medicine*, 47(10), 2073-2082.
- Schoenfeld, B.J. et al. (2021). "How many times should you lift weights per week? A systematic review." *British Journal of Sports Medicine*.
- Israetel, M. "Training Volume Landmarks." Renaissance Periodization.

### Periodization
- Issurin, V.B. (2010). "New horizons for the methodology and physiology of training periodization." *Sports Medicine*, 40(3), 189-206.
- Rhea, M.R. & Alderman, B.L. (2004). "A meta-analysis of periodized versus nonperiodized strength and power training programs." *Research Quarterly for Exercise and Sport*, 75(4), 413-422.

### Starting Strength Standards
- Symmetric Strength (symmetricstrength.com). "Strength Standards: Bodyweight Ratios."
- ExRx (exrx.net). "Strength Standards."

### Body Composition
- Hodgdon, J.A. et al. (1984). "Prediction of body composition from circumference and ultrasound." *Naval Health Research Center*.
- Mifflin, M.D. et al. (1990). "A new predictive equation for resting energy expenditure." *American Journal of Clinical Nutrition*, 51(2), 241-247.

### Fatigue & Readiness
- Gabbett, T.J. (2016). "The training-injury prevention paradox." *British Journal of Sports Medicine*, 50(5), 273-280.
- Banister, E.W. (1991). "Modeling performance in sport." *Journal of Sports Sciences*.

### Progressive Overload
- Peterson, M.D. et al. (2010). "Progressive overload as a method of enhancing muscular strength and hypertrophy." *Journal of Strength and Conditioning Research*.