/**
 * Seed script: transforms exercises.json into DB rows and upserts into exercises table.
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npx tsx supabase/seed/seed_exercises.ts
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { deriveMovementPattern, LOWER_BODY_MUSCLES } from './exercise_movement_patterns'

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ── Mappings ──

// Category: JSON → DB enum (spaces → underscores for "olympic weightlifting")
const CATEGORY_MAP: Record<string, string> = {
  'cardio': 'cardio',
  'olympic weightlifting': 'olympic_weightlifting',
  'plyometrics': 'plyometrics',
  'powerlifting': 'powerlifting',
  'strength': 'strength',
  'stretching': 'stretching',
  'strongman': 'strongman',
}

// Level: JSON → DB enum (1:1 mapping)
const LEVEL_MAP: Record<string, string> = {
  'beginner': 'beginner',
  'intermediate': 'intermediate',
  'expert': 'expert',
}

// Muscle group: JSON → DB enum (spaces → underscores)
function mapMuscle(muscle: string): string {
  return muscle.toLowerCase().replace(/\s+/g, '_')
}

// ── JSON exercise interface ──
interface JsonExercise {
  id: string
  name: string
  category: string
  level: string
  force: string | null
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
}

// ── Main ──
async function seed() {
  // Load exercises.json
  const jsonPath = resolve(__dirname, '..', '..', 'exercises.json')
  const raw = readFileSync(jsonPath, 'utf-8')
  const exercises: JsonExercise[] = JSON.parse(raw)

  console.log(`Loaded ${exercises.length} exercises from exercises.json`)

  // Transform each exercise
  const rows = exercises.map(ex => {
    const slug = ex.id
    const category = CATEGORY_MAP[ex.category]
    if (!category) {
      console.warn(`Unknown category "${ex.category}" for exercise "${slug}"`)
    }

    const level = LEVEL_MAP[ex.level]
    if (!level) {
      console.warn(`Unknown level "${ex.level}" for exercise "${slug}"`)
    }

    const primaryMuscles = ex.primaryMuscles.map(mapMuscle)
    const secondaryMuscles = ex.secondaryMuscles.map(mapMuscle)

    const isCompound = ex.mechanic === 'compound'
    const isLowerBody = primaryMuscles.some(m => LOWER_BODY_MUSCLES.includes(m))

    // is_unilateral derivation
    const nameLower = ex.name.toLowerCase()
    const unilateralPatterns = [
      'single', 'unilateral', 'one-arm', 'one arm', 'one-leg', 'one leg',
      'lunge', 'split squat', 'step-up', 'pistol', 'bulgarian'
    ]
    const isUnilateral = unilateralPatterns.some(p => nameLower.includes(p))

    // Movement pattern derivation
    const movementPattern = deriveMovementPattern(
      slug, ex.name, primaryMuscles, ex.force, ex.mechanic
    )

    // Equipment: null → 'unknown', else keep as-is
    const equipment = ex.equipment ?? 'unknown'

    return {
      slug,
      name: ex.name,
      category: category ?? 'strength',
      level: level ?? 'beginner',
      force: ex.force ?? null,
      mechanic: ex.mechanic ?? null,
      equipment,
      primary_muscles: primaryMuscles,
      secondary_muscles: secondaryMuscles,
      movement_pattern: movementPattern,
      is_compound: isCompound,
      is_unilateral: isUnilateral,
      is_lower_body: isLowerBody,
      instructions: ex.instructions,
    }
  })

  // Upsert in batches of 100
  const BATCH_SIZE = 100
  let totalUpserted = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { data, error } = await supabase
      .from('exercises')
      .upsert(batch, { onConflict: 'slug' })
      .select('id')

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message)
      throw error
    }

    totalUpserted += data?.length ?? batch.length
    console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: upserted ${batch.length} exercises`)
  }

  console.log(`\nSeed complete: ${totalUpserted} exercises upserted`)

  // Summary stats
  const withPattern = rows.filter(r => r.movement_pattern !== null).length
  const compound = rows.filter(r => r.is_compound).length
  console.log(`Movement patterns assigned: ${withPattern}/${rows.length}`)
  console.log(`Compound exercises: ${compound}/${rows.length}`)
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})