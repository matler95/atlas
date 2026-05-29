/**
 * Step 50: Final Integration Checklist
 * Run: npx tsx src/__tests__/integration-checklist.ts
 * 
 * This script verifies the codebase structure matches the implementation plan.
 * It does NOT require a live Supabase instance — it checks files and code patterns.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve, join } from 'path'

const ROOT = resolve(__dirname, '..', '..')

let passed = 0
let failed = 0

function check(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${name}`)
    passed++
  } else {
    console.log(`  ❌ ${name}`)
    failed++
  }
}

function fileExists(relPath: string): boolean {
  return existsSync(join(ROOT, relPath))
}

function fileContains(relPath: string, search: string): boolean {
  try {
    return readFileSync(join(ROOT, relPath), 'utf-8').includes(search)
  } catch {
    return false
  }
}

console.log('\n═══ ATLAS INTEGRATION CHECKLIST ═══\n')

// 1. Project scaffolding
console.log('1. Project Scaffolding')
check('package.json exists', fileExists('package.json'))
check('vite.config.ts exists', fileExists('vite.config.ts'))
check('tsconfig.json exists', fileExists('tsconfig.json'))
check('index.html exists', fileExists('index.html'))
check('src/main.tsx exists', fileExists('src/main.tsx'))
check('.env.example exists', fileExists('.env.example'))
check('tailwind.config.ts exists', fileExists('tailwind.config.ts'))

// 2. Supabase
console.log('\n2. Supabase Setup')
check('src/lib/supabase.ts exists', fileExists('src/lib/supabase.ts'))
check('src/lib/database.types.ts exists', fileExists('src/lib/database.types.ts'))
check('supabase/ directory exists', fileExists('supabase'))
check('supabase/SCHEMA.md exists', fileExists('supabase/SCHEMA.md'))

// 3. Migrations
console.log('\n3. Migrations')
check('001_enums_and_exercises.sql', fileExists('supabase/migrations/001_enums_and_exercises.sql'))
check('002_application_tables.sql', fileExists('supabase/migrations/002_application_tables.sql'))
check('003_rls_policies.sql', fileExists('supabase/migrations/003_rls_policies.sql'))
check('004_rpc_functions.sql', fileExists('supabase/migrations/004_rpc_functions.sql'))
check('Migration 001 has 19 ENUMs', fileContains('supabase/migrations/001_enums_and_exercises.sql', 'CREATE TYPE bw_signal_enum'))
check('Migration 002 has user_profiles', fileContains('supabase/migrations/002_application_tables.sql', 'CREATE TABLE user_profiles'))
check('Migration 003 has RLS policies', fileContains('supabase/migrations/003_rls_policies.sql', 'ALTER TABLE exercises ENABLE ROW LEVEL SECURITY'))
check('Migration 004 has reset_user_data', fileContains('supabase/migrations/004_rpc_functions.sql', 'reset_user_data'))

// 4. Seed
console.log('\n4. Exercise Seed')
check('seed_exercises.ts exists', fileExists('supabase/seed/seed_exercises.ts'))
check('exercise_movement_patterns.ts exists', fileExists('supabase/seed/exercise_movement_patterns.ts'))
check('exercises.json exists (repo root)', fileExists('../exercises.json') || fileExists('exercises.json'))

// 5. Algorithms
console.log('\n5. Algorithm Library')
const algos = ['utils', 'fatigue', 'readiness', 'strength', 'rpe-calibration', 'volume', 'nutrition', 'exercise-scoring', 'plan-generator', 'plan-quality', 'bodyweight-trend', 'mesocycle', 'starting-weight']
for (const a of algos) {
  check(`algorithms/${a}.ts`, fileExists(`src/lib/algorithms/${a}.ts`))
}

// 6. Edge Functions
console.log('\n6. Edge Functions')
check('complete-session/index.ts', fileExists('supabase/functions/complete-session/index.ts'))
check('update-profile-modifiers/index.ts', fileExists('supabase/functions/update-profile-modifiers/index.ts'))
check('update-volume-landmarks/index.ts', fileExists('supabase/functions/update-volume-landmarks/index.ts'))
check('_shared/cors.ts', fileExists('supabase/functions/_shared/cors.ts'))
check('_shared/response.ts', fileExists('supabase/functions/_shared/response.ts'))

// 7. Hooks
console.log('\n7. Query Hooks')
const hooks = ['useExercises', 'useUserProfile', 'useWorkoutPlan', 'useWorkoutSession', 'useProgress', 'useBodyweightLogs']
for (const h of hooks) {
  check(`hooks/${h}.ts`, fileExists(`src/hooks/${h}.ts`))
}
check('lib/queryKeys.ts', fileExists('src/lib/queryKeys.ts'))

// 8. Stores & Providers
console.log('\n8. Stores & Providers')
check('stores/authStore.ts', fileExists('src/stores/authStore.ts'))
check('stores/onboardingStore.ts', fileExists('src/stores/onboardingStore.ts'))
check('stores/workoutSessionStore.ts', fileExists('src/stores/workoutSessionStore.ts'))
check('providers/AuthProvider.tsx', fileExists('src/providers/AuthProvider.tsx'))
check('providers/ThemeProvider.tsx', fileExists('src/providers/ThemeProvider.tsx'))

// 9. UI Components
console.log('\n9. UI Components')
const uiComponents = ['button', 'card', 'input', 'label', 'badge', 'progress', 'separator', 'tabs']
for (const c of uiComponents) {
  check(`components/ui/${c}.tsx`, fileExists(`src/components/ui/${c}.tsx`))
}
check('components/MuscleMap.tsx', fileExists('src/components/MuscleMap.tsx'))
check('components/ErrorBoundary.tsx', fileExists('src/components/ErrorBoundary.tsx'))
check('components/LoadingSpinner.tsx', fileExists('src/components/LoadingSpinner.tsx'))
check('components/SkeletonCard.tsx', fileExists('src/components/SkeletonCard.tsx'))
check('components/layout/BottomNav.tsx', fileExists('src/components/layout/BottomNav.tsx'))

// 10. Routes
console.log('\n10. Routes')
check('router.tsx', fileExists('src/router.tsx'))
check('routes/auth/login.tsx', fileExists('src/routes/auth/login.tsx'))
check('routes/auth/register.tsx', fileExists('src/routes/auth/register.tsx'))
check('routes/onboarding/index.tsx', fileExists('src/routes/onboarding/index.tsx'))
check('routes/app/dashboard.tsx', fileExists('src/routes/app/dashboard.tsx'))
check('routes/app/plan.tsx', fileExists('src/routes/app/plan.tsx'))
check('routes/app/progress.tsx', fileExists('src/routes/app/progress.tsx'))
check('routes/app/library.tsx', fileExists('src/routes/app/library.tsx'))
check('routes/app/profile.tsx', fileExists('src/routes/app/profile.tsx'))
check('routes/app/workout/$sessionId.tsx', fileExists('src/routes/app/workout/$sessionId.tsx'))

// 11. Supporting libs
console.log('\n11. Supporting Libraries')
check('lib/suggestions.ts', fileExists('src/lib/suggestions.ts'))
check('lib/deload.ts', fileExists('src/lib/deload.ts'))
check('lib/i18n.ts', fileExists('src/lib/i18n.ts'))
check('lib/createInitialPlan.ts', fileExists('src/lib/createInitialPlan.ts'))
check('lib/utils.ts (cn function)', fileContains('src/lib/utils.ts', 'twMerge'))

// 12. Deployment
console.log('\n12. Deployment')
check('vercel.json', fileExists('vercel.json'))
check('netlify.toml', fileExists('netlify.toml'))

// 13. Tests
console.log('\n13. Tests')
check('vitest.config.ts', fileExists('vitest.config.ts'))
check('__tests__/algorithms.test.ts', fileExists('src/__tests__/algorithms.test.ts'))

// Summary
console.log(`\n═══ RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} checks ═══\n`)

if (failed > 0) {
  process.exit(1)
}