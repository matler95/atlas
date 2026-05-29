import { useState } from 'react'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { useExercises } from '@/hooks/useExercises'
import { ExercisePicker } from '@/components/onboarding/ExercisePicker'
import { MuscleMap } from '@/components/MuscleMap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getSplitTemplate } from '@/lib/algorithms/plan-generator'
import { predictSessionDuration } from '@/lib/algorithms/plan-generator'
import { createInitialPlan } from '@/lib/createInitialPlan'
import { useNavigate } from '@tanstack/react-router'

export default function WorkoutBuilderPage() {
  const { data } = useOnboardingStore()
  const navigate = useNavigate()
  const { data: exercises } = useExercises()

  const style = data.training_style ?? 'full_body'
  const days = data.gym_days_per_week ?? 3
  const dayTypes = getSplitTemplate(style, days)

  const [selectedExercises, setSelectedExercises] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {}
    dayTypes.forEach(dt => { if (!initial[dt]) initial[dt] = [] })
    return initial
  })
  const [activeTab, setActiveTab] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const currentDayType = dayTypes[activeTab]
  const currentExercises = selectedExercises[currentDayType] ?? []

  const handleSelectExercise = (exerciseId: string) => {
    setSelectedExercises(prev => ({
      ...prev,
      [currentDayType]: [...(prev[currentDayType] ?? []), exerciseId],
    }))
  }

  const handleRemoveExercise = (dayType: string, exerciseId: string) => {
    setSelectedExercises(prev => ({
      ...prev,
      [dayType]: (prev[dayType] ?? []).filter(id => id !== exerciseId),
    }))
  }

  const handleReorderExercise = (dayType: string, fromIdx: number, toIdx: number) => {
    setSelectedExercises(prev => {
      const list = [...(prev[dayType] ?? [])]
      const [item] = list.splice(fromIdx, 1)
      list.splice(toIdx, 0, item)
      return { ...prev, [dayType]: list }
    })
  }

  const allDaysConfigured = dayTypes.every(dt => (selectedExercises[dt] ?? []).length > 0)

  const avgSets = 3
  const avgRest = 120
  const predictedDuration = predictSessionDuration(currentExercises.length, avgSets, avgRest)

  // Get muscles for current day's exercises
  const currentMuscles = currentExercises
    .map(id => exercises?.find(ex => ex.id === id))
    .flatMap(ex => ex?.primary_muscles ?? [])

  const handleCreatePlan = async () => {
    setCreating(true)
    try {
      await createInitialPlan(data, selectedExercises)
      navigate({ to: '/app/dashboard' })
    } catch (err) {
      console.error('Failed to create plan:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-2">Build Your Workout</h1>
      <p className="text-sm text-gray-400 mb-4">Select exercises for each training day</p>

      {/* Day Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {dayTypes.map((dt, i) => {
          const configured = (selectedExercises[dt] ?? []).length > 0
          return (
            <button
              key={`${dt}-${i}`}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === i
                  ? 'bg-brand text-white'
                  : configured
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              <span className="capitalize">{dt.replace(/_/g, ' ')}</span>
              {configured && <span className="text-xs">✓</span>}
            </button>
          )
        })}
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-gray-800 rounded-full h-2">
          <div
            className="bg-brand h-2 rounded-full transition-all"
            style={{ width: `${(dayTypes.filter(dt => (selectedExercises[dt] ?? []).length > 0).length / dayTypes.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">
          {dayTypes.filter(dt => (selectedExercises[dt] ?? []).length > 0).length}/{dayTypes.length} days
        </span>
      </div>

      {/* Current Day */}
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg capitalize">{currentDayType.replace(/_/g, ' ')} Day</CardTitle>
            <Badge variant="secondary">{predictedDuration} min</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {currentExercises.map((id, idx) => {
            const ex = exercises?.find(e => e.id === id)
            return (
              <div key={id} className="flex items-center justify-between p-2 rounded-lg bg-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{idx + 1}</span>
                  <div>
                    <div className="text-sm font-medium">{ex?.name ?? id}</div>
                    <div className="flex gap-1 mt-0.5">
                      {ex?.primary_muscles.slice(0, 2).map(m => (
                        <Badge key={m} variant="secondary" className="text-[9px]">{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {idx > 0 && (
                    <button
                      onClick={() => handleReorderExercise(currentDayType, idx, idx - 1)}
                      className="text-gray-400 hover:text-white px-1 text-xs"
                    >↑</button>
                  )}
                  <button
                    onClick={() => handleRemoveExercise(currentDayType, id)}
                    className="text-red-400 hover:text-red-300 px-1 text-xs"
                  >✕</button>
                </div>
              </div>
            )
          })}

          {currentExercises.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">No exercises selected yet</p>
          )}

          <Button variant="outline" className="w-full" onClick={() => setPickerOpen(true)}>
            + Add Exercise
          </Button>
        </CardContent>
      </Card>

      {/* Muscle Map */}
      {currentMuscles.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-sm text-gray-400">Muscles Hit</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <MuscleMap activeMuscles={[...new Set(currentMuscles)]} size="sm" />
          </CardContent>
        </Card>
      )}

      {/* Create Plan Button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!allDaysConfigured || creating}
        onClick={handleCreatePlan}
      >
        {creating ? 'Creating Plan...' : 'Create Plan'}
      </Button>

      {/* Exercise Picker Overlay */}
      {pickerOpen && (
        <ExercisePicker
          userEquipment={data.equipment ?? 'full_gym'}
          selectedIds={currentExercises}
          onSelect={handleSelectExercise}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}