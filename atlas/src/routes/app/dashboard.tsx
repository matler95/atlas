import { useAuthStore } from '@/stores/authStore'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useActiveWorkoutPlan, useWorkoutDays } from '@/hooks/useWorkoutPlan'
import { useFitnessSnapshots } from '@/hooks/useProgress'
import { useBodyweightLogs, useInsertBodyweightLog } from '@/hooks/useBodyweightLogs'
import { readinessScore } from '@/lib/algorithms/readiness'
import { calcBMR, calcTDEE, calcTargetCalories, calcMacros, estimateBodyFatBMI, leanBodyMass } from '@/lib/algorithms/nutrition'
import { bodyweightTrend } from '@/lib/algorithms/bodyweight-trend'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useState } from 'react'

export default function DashboardPage() {
  const user = useAuthStore(s => s.user)
  const { data: profile, isPending: profileLoading } = useUserProfile(user?.id)
  const { data: plan } = useActiveWorkoutPlan(user?.id)
  const { data: days } = useWorkoutDays(plan?.id)
  const { data: snapshots } = useFitnessSnapshots(user?.id, 30)
  const { data: bwLogs } = useBodyweightLogs(user?.id)
  const insertBw = useInsertBodyweightLog()
  const [weightInput, setWeightInput] = useState('')

  if (profileLoading) return <LoadingSpinner size="lg" className="min-h-screen" />
  if (!profile) {
    // User authenticated but no profile yet — redirect to onboarding
    window.location.href = '/onboarding'
    return <LoadingSpinner size="lg" className="min-h-screen" />
  }
  if (!profile.onboarding_completed) {
    window.location.href = '/onboarding'
    return <LoadingSpinner size="lg" className="min-h-screen" />
  }

  const latestSnapshot = snapshots?.[snapshots.length - 1]
  const fitnessState = latestSnapshot
    ? { fitness: Number(latestSnapshot.fitness), fatigue: Number(latestSnapshot.fatigue), form: Number(latestSnapshot.form) }
    : { fitness: 0, fatigue: 0, form: 0 }
  const checkinEma = 3.0 // Default until sessions exist
  const readiness = readinessScore(fitnessState, checkinEma, profile.sleep_hours)

  const bfPct = estimateBodyFatBMI(profile.weight_kg, profile.height_cm, profile.gender)
  const lbm = leanBodyMass(profile.weight_kg, bfPct)
  const bmr = calcBMR(profile.weight_kg, profile.height_cm, profile.age, profile.gender)
  const tdee = calcTDEE(bmr, profile.activity_level)
  const targetCalories = calcTargetCalories(tdee, profile.goal, bfPct)
  const macros = calcMacros(targetCalories, lbm, true)

  const latestBw = bwLogs?.[0]
  const bwTrend = bodyweightTrend(bwLogs?.map(l => ({ date: l.date, weight_kg: Number(l.weight_kg) })) ?? [])

  const timeOfDay = new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'

  const handleLogWeight = () => {
    if (!weightInput || !user?.id) return
    insertBw.mutate({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      weight_kg: parseFloat(weightInput),
    })
    setWeightInput('')
  }

  // Find today's workout day
  const today = new Date().getDay()
  const todayDay = days?.find(d => d.day_of_week === today)

  const readinessColor = readiness >= 75 ? 'text-green-400' : readiness >= 50 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 px-4 pt-6 space-y-4">
      {/* Welcome Banner */}
      <h1 className="text-2xl font-bold">
        Good {timeOfDay}, {profile.name}
      </h1>
      <p className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

      {/* Readiness Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className={`text-5xl font-bold ${readinessColor}`}>{readiness}</div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Form</span>
                <span>{fitnessState.form.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Sleep</span>
                <span>{profile.sleep_hours}h</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Check-in</span>
                <span>{checkinEma.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Nutrition Targets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-brand">{targetCalories}</div>
              <div className="text-xs text-gray-400">Calories</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand">{macros.proteinG}g</div>
              <div className="text-xs text-gray-400">Protein</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand">{macros.fatG}g</div>
              <div className="text-xs text-gray-400">Fat</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand">{macros.waterMl}ml</div>
              <div className="text-xs text-gray-400">Water</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bodyweight Widget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bodyweight</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-3xl font-bold">{latestBw ? Number(latestBw.weight_kg).toFixed(1) : '--'}</span>
              <span className="text-sm text-gray-400 ml-1">kg</span>
            </div>
            <Badge variant={bwTrend.signal === 'rapid_loss' ? 'destructive' : bwTrend.signal === 'bulk' ? 'default' : 'secondary'}>
              {bwTrend.signal === 'insufficient_data' ? 'No data' : bwTrend.signal === 'rapid_loss' ? 'Losing fast' : bwTrend.signal === 'cut' ? 'Losing' : bwTrend.signal === 'bulk' ? 'Gaining' : 'Stable'}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              placeholder="Log weight (kg)"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
            />
            <Button onClick={handleLogWeight} disabled={!weightInput}>Log</Button>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Workout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Workout</CardTitle>
        </CardHeader>
        <CardContent>
          {todayDay ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold capitalize">{todayDay.day_type.replace(/_/g, ' ')} Day</div>
                <div className="text-sm text-gray-400">Today's workout</div>
              </div>
              <Button>Start Workout</Button>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">Rest day — next workout coming up</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}