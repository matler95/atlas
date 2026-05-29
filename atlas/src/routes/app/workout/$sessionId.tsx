import { useState, useEffect } from 'react'
import { useParams, useNavigate } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { useActiveWorkoutPlan, useWorkoutDays, useDayExercises } from '@/hooks/useWorkoutPlan'
import { useCreateSession, useInsertSessionSet } from '@/hooks/useWorkoutSession'
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { predictSessionDuration } from '@/lib/algorithms/plan-generator'

export default function WorkoutPage() {
  const { sessionId } = useParams({ from: '/app/workout/$sessionId' })
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const { data: plan } = useActiveWorkoutPlan(user?.id)
  const { data: days } = useWorkoutDays(plan?.id)
  const createSession = useCreateSession()
  const insertSet = useInsertSessionSet()

  const store = useWorkoutSessionStore()
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [rpe, setRpe] = useState<number | null>(null)
  const [checkinScore, setCheckinScore] = useState<number | null>(null)
  const [feedbackEnergy, setFeedbackEnergy] = useState(3)
  const [feedbackDifficulty, setFeedbackDifficulty] = useState(3)
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [sessionCreated, setSessionCreated] = useState(false)

  // Find today's workout day
  const today = new Date().getDay()
  const todayDay = days?.find(d => d.day_of_week === today)
  const { data: dayExercises } = useDayExercises(todayDay?.id)

  // Create session on mount if sessionId === 'new'
  useEffect(() => {
    if (sessionId === 'new' && todayDay && !sessionCreated && user?.id) {
      const plannedDuration = predictSessionDuration(dayExercises?.length ?? 5, 3, 120)
      createSession.mutate({
        user_id: user.id,
        workout_day_id: todayDay.id,
        planned_duration_minutes: plannedDuration,
      }, {
        onSuccess: (session) => {
          store.initSession(session.id, (dayExercises ?? []).map(ex => ({
            id: ex.exercises?.id ?? ex.exercise_id,
            sets: ex.suggested_sets,
            repsMin: ex.suggested_reps_min,
            repsMax: ex.suggested_reps_max,
            weightKg: ex.suggested_weight_kg,
          })))
          setSessionCreated(true)
        }
      })
    }
  }, [sessionId, todayDay, sessionCreated, user?.id])

  const currentSet = store.sets.filter(s =>
    !s.completed &&
    s.exerciseId === (dayExercises?.[store.currentExerciseIndex]?.exercises?.id ?? dayExercises?.[store.currentExerciseIndex]?.exercise_id)
  ).find(s => s.setNumber === store.currentSetIndex + 1)

  const currentExercise = dayExercises?.[store.currentExerciseIndex]

  const handleCompleteSet = () => {
    if (!currentExercise || !currentSet) return
    const exerciseId = currentExercise.exercises?.id ?? currentExercise.exercise_id
    store.completeSet({
      exerciseId,
      setNumber: currentSet.setNumber,
      reps: parseInt(reps) || currentSet.reps,
      weightKg: parseFloat(weight) || currentSet.weightKg,
      rpe,
    })

    // Save to DB
    if (store.sessionId) {
      insertSet.mutate({
        session_id: store.sessionId,
        exercise_id: exerciseId,
        set_number: currentSet.setNumber,
        reps: parseInt(reps) || currentSet.reps,
        weight_kg: parseFloat(weight) || currentSet.weightKg,
        rpe,
      })
    }

    // Start rest timer
    store.startRestTimer(currentExercise.rest_seconds)
    setReps('')
    setRpe(null)
  }

  // Rest timer effect
  useEffect(() => {
    if (!store.restTimerActive) return
    const interval = setInterval(() => store.tickTimer(), 1000)
    return () => clearInterval(interval)
  }, [store.restTimerActive])

  // Pre-checkin phase
  if (!checkinScore) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-6">How are you feeling today?</h1>
        <div className="flex gap-4 mb-8">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              onClick={() => setCheckinScore(score)}
              className={`w-14 h-14 rounded-full text-2xl flex items-center justify-center transition-colors ${
                checkinScore === score ? 'bg-brand' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {['😴', '😐', '🙂', '😊', '🔥'][score - 1]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Warmup phase
  if (store.phase === 'warmup') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-4xl font-bold mb-4">Warm Up</h1>
        <p className="text-gray-400 mb-8">Prepare your body for the workout</p>
        <Button size="lg" onClick={() => store.setPhase('workout')}>Ready to Go</Button>
      </div>
    )
  }

  // Feedback phase
  if (store.phase === 'feedback') {
    return (
      <div className="min-h-screen bg-gray-950 text-white px-4 pt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Workout Complete! 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Energy Level (1-5)</Label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFeedbackEnergy(n)}
                    className={`w-10 h-10 rounded-full ${feedbackEnergy === n ? 'bg-brand' : 'bg-gray-700'}`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Difficulty (1-5)</Label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFeedbackDifficulty(n)}
                    className={`w-10 h-10 rounded-full ${feedbackDifficulty === n ? 'bg-brand' : 'bg-gray-700'}`}>{n}</button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={feedbackNotes} onChange={e => setFeedbackNotes(e.target.value)} placeholder="How did it go?" />
            </div>
            <Button className="w-full" onClick={() => {
              store.setPhase('complete')
              navigate({ to: '/app/dashboard' })
            }}>Save & Finish</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Workout phase
  if (!currentExercise || !currentSet) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold mb-4">All exercises complete!</h1>
        <Button onClick={() => store.setPhase('feedback')}>Continue to Feedback</Button>
      </div>
    )
  }

  const exerciseName = currentExercise.exercises?.name ?? 'Exercise'
  const totalSetsForExercise = store.sets.filter(s =>
    s.exerciseId === (currentExercise.exercises?.id ?? currentExercise.exercise_id)
  ).length
  const completedSetsForExercise = store.sets.filter(s =>
    s.exerciseId === (currentExercise.exercises?.id ?? currentExercise.exercise_id) && s.completed
  ).length

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-4">
      {/* Rest Timer Overlay */}
      {store.restTimerActive && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold text-brand mb-4">
            {Math.floor(store.restTimerSecondsRemaining / 60)}:{(store.restTimerSecondsRemaining % 60).toString().padStart(2, '0')}
          </div>
          <p className="text-gray-400 mb-4">Rest Time</p>
          <Button onClick={() => store.stopTimer()}>Skip Rest</Button>
        </div>
      )}

      {/* Exercise Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">Exercise {store.currentExerciseIndex + 1}/{dayExercises?.length}</Badge>
          <Badge>{completedSetsForExercise}/{totalSetsForExercise} sets</Badge>
        </div>
        <h1 className="text-2xl font-bold">{exerciseName}</h1>
      </div>

      {/* Set Input */}
      <div className="px-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <div className="text-lg font-medium">Set {currentSet.setNumber} of {totalSetsForExercise}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder={currentSet.weightKg.toString()}
                />
              </div>
              <div className="space-y-1">
                <Label>Reps</Label>
                <Input
                  type="number"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  placeholder={currentSet.reps.toString()}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>RPE (optional)</Label>
              <div className="flex gap-1 flex-wrap">
                {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => (
                  <button
                    key={v}
                    onClick={() => setRpe(v)}
                    className={`px-3 py-1 rounded text-sm ${rpe === v ? 'bg-brand text-white' : 'bg-gray-700 text-gray-300'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={handleCompleteSet}>Set Complete</Button>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => store.goToNextExercise()}>
            Next Exercise
          </Button>
        </div>
      </div>
    </div>
  )
}