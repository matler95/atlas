import { useAuthStore } from '@/stores/authStore'
import { useActiveWorkoutPlan, useWorkoutDays, useDayExercises } from '@/hooks/useWorkoutPlan'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { MuscleMap } from '@/components/MuscleMap'
import { mesocyclePhaseIndex } from '@/lib/algorithms/mesocycle'
import { useState } from 'react'

export default function PlanPage() {
  const user = useAuthStore(s => s.user)
  const { data: plan, isPending } = useActiveWorkoutPlan(user?.id)
  const { data: days } = useWorkoutDays(plan?.id)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const { data: dayExercises } = useDayExercises(selectedDayId ?? undefined)

  if (isPending) return <LoadingSpinner size="lg" className="min-h-screen" />
  if (!plan) return <div className="p-4 text-white">No active plan</div>

  const mesoWeek = plan.start_date ? mesocyclePhaseIndex(new Date(plan.start_date)) : 1
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const allMuscles = (dayExercises ?? []).flatMap(ex => ex.exercises?.primary_muscles ?? [])

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">{plan.name}</h1>

      {/* Plan Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Plan Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge>{plan.goal.replace(/_/g, ' ')}</Badge>
            <Badge variant="secondary">{plan.experience}</Badge>
            <Badge variant="outline">{plan.training_style.replace(/_/g, ' ')}</Badge>
          </div>
          <div className="text-sm text-gray-400">
            {plan.days_per_week} days/week · {plan.session_length_minutes} min sessions · Mesocycle Week {mesoWeek}
          </div>
          {plan.deload_active && (
            <Badge variant="destructive" className="mt-2">Deload Week Active</Badge>
          )}
        </CardContent>
      </Card>

      {/* Week Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((dayName, dayIdx) => {
              const day = days?.find(d => d.day_of_week === dayIdx)
              const isRest = !day
              return (
                <button
                  key={dayIdx}
                  onClick={() => day && setSelectedDayId(day.id)}
                  className={`p-2 rounded-lg text-center text-xs min-h-[60px] transition-colors ${
                    isRest
                      ? 'bg-gray-800 text-gray-500'
                      : selectedDayId === day.id
                      ? 'bg-brand text-white'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                  }`}
                >
                  <div className="font-medium">{dayName}</div>
                  <div className="mt-1 capitalize text-[10px]">
                    {isRest ? 'Rest' : day.day_type.replace(/_/g, ' ')}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Day Detail */}
      {selectedDayId && dayExercises && dayExercises.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exercises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dayExercises.map(wde => (
              <div key={wde.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <div className="font-medium">{wde.exercises?.name}</div>
                  <div className="text-sm text-gray-400">
                    {wde.suggested_sets} × {wde.suggested_reps_min}–{wde.suggested_reps_max} reps
                    {wde.suggested_weight_kg ? ` @ ${wde.suggested_weight_kg}kg` : ''}
                  </div>
                </div>
              </div>
            ))}
            {allMuscles.length > 0 && (
              <div className="pt-4">
                <MuscleMap activeMuscles={allMuscles} size="sm" />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}