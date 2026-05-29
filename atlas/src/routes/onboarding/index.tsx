import { useState } from 'react'
import { useOnboardingStore } from '@/stores/onboardingStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase'

const GOALS = [
  { value: 'muscle_gain', label: 'Muscle Gain', icon: '💪' },
  { value: 'fat_loss', label: 'Fat Loss', icon: '🔥' },
  { value: 'strength', label: 'Strength', icon: '🏋️' },
  { value: 'general_fitness', label: 'General Fitness', icon: '🏃' },
  { value: 'recomposition', label: 'Recomposition', icon: '⚖️' },
]
const EXPERIENCES = [
  { value: 'beginner', label: 'Beginner', desc: '< 1 year' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years' },
  { value: 'advanced', label: 'Advanced', desc: '3+ years' },
]
const EQUIPMENT_OPTS = [
  { value: 'full_gym', label: 'Full Gym' },
  { value: 'barbell_only', label: 'Barbell Only' },
  { value: 'dumbbells_only', label: 'Dumbbells Only' },
  { value: 'bodyweight_only', label: 'Bodyweight Only' },
  { value: 'cables_machines', label: 'Cables & Machines' },
  { value: 'limited', label: 'Limited' },
]
const TRAINING_STYLES = [
  { value: 'full_body', label: 'Full Body', minDays: 2 },
  { value: 'upper_lower', label: 'Upper/Lower', minDays: 4 },
  { value: 'push_pull_legs', label: 'Push/Pull/Legs', minDays: 3 },
  { value: 'bodybuilding_split', label: 'Bodybuilding Split', minDays: 4 },
]
const MUSCLES = ['abdominals','abductors','adductors','biceps','calves','chest','forearms','glutes','hamstrings','lats','lower_back','middle_back','neck','quadriceps','shoulders','traps','triceps']

export default function OnboardingPage() {
  const { data, setField, setStep } = useOnboardingStore()
  const [error, setError] = useState('')
  const step = data.currentStep ?? 1

  const next = () => setStep(step + 1)
  const prev = () => setStep(step - 1)

  const canProceed = () => {
    switch (step) {
      case 1: return (data.name?.length ?? 0) >= 2
      case 2: return !!data.goal
      case 3: return !!data.experience
      case 4: return !!data.gender && !!data.age && !!data.height_cm && !!data.weight_kg
      case 5: return !!data.equipment
      case 6: return true  // defaults are always valid (3 days, 60 min)
      case 7: return !!data.training_style
      case 8: return !data.include_abs || (data.abs_days?.length ?? 0) > 0
      case 9: return true
      case 10: return true
      default: return true
    }
  }

  const handleComplete = async () => {
    // Register if not already
    if (data.email && data.password) {
      const { error: authError } = await supabase.auth.signUp({ email: data.email, password: data.password })
      if (authError) { setError(authError.message); return }
    }
    // Navigate to workout builder to select exercises
    window.location.href = '/onboarding/workout-builder'
  }

  const stepProgress = (step / 10) * 100

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4">
            <Progress value={stepProgress} />
            <div className="text-xs text-gray-400 mt-1 text-right">{step}/10</div>
          </div>
          <CardTitle>Setup Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="space-y-2">
              <Label>What should we call you?</Label>
              <Input value={data.name ?? ''} onChange={e => setField('name', e.target.value)} placeholder="Your name" autoFocus />
            </div>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-2">
              {GOALS.map(g => (
                <button key={g.value} onClick={() => setField('goal', g.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${data.goal === g.value ? 'border-brand bg-brand/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <span className="text-2xl">{g.icon}</span>
                  <span className="text-sm font-medium">{g.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Experience */}
          {step === 3 && (
            <div className="grid grid-cols-1 gap-2">
              {EXPERIENCES.map(ex => (
                <button key={ex.value} onClick={() => setField('experience', ex.value)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${data.experience === ex.value ? 'border-brand bg-brand/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <span className="font-medium">{ex.label}</span>
                  <span className="text-sm text-gray-400">{ex.desc}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Personal Data */}
          {step === 4 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Gender</Label>
                <div className="flex gap-2">
                  {['male','female','other'].map(g => (
                    <button key={g} onClick={() => setField('gender', g)}
                      className={`flex-1 py-2 rounded-lg border text-sm capitalize ${data.gender === g ? 'border-brand bg-brand/10' : 'border-gray-700'}`}>{g}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Age</Label>
                <Input type="number" value={data.age ?? ''} onChange={e => setField('age', parseInt(e.target.value) || null)} placeholder="25" />
              </div>
              <div className="space-y-1">
                <Label>Height (cm)</Label>
                <Input type="number" value={data.height_cm ?? ''} onChange={e => setField('height_cm', parseFloat(e.target.value) || null)} placeholder="180" />
              </div>
              <div className="space-y-1">
                <Label>Weight (kg)</Label>
                <Input type="number" step="0.1" value={data.weight_kg ?? ''} onChange={e => setField('weight_kg', parseFloat(e.target.value) || null)} placeholder="80" />
              </div>
            </div>
          )}

          {/* Step 5: Equipment */}
          {step === 5 && (
            <div className="grid grid-cols-1 gap-2">
              {EQUIPMENT_OPTS.map(eq => (
                <button key={eq.value} onClick={() => setField('equipment', eq.value)}
                  className={`p-3 rounded-lg border text-left transition-colors ${data.equipment === eq.value ? 'border-brand bg-brand/10' : 'border-gray-700 hover:border-gray-500'}`}>
                  <span className="font-medium">{eq.label}</span>
                </button>
              ))}
              {data.equipment === 'limited' && (
                <div className="space-y-1 mt-2">
                  <Label>What equipment do you have?</Label>
                  <Input placeholder="e.g., dumbbells, pull-up bar" onChange={e => setField('limited_equipment_items', e.target.value.split(',').map(s => s.trim()))} />
                </div>
              )}
            </div>
          )}

          {/* Step 6: Availability */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Days per week: {data.gym_days_per_week ?? 3}</Label>
                <input type="range" min={1} max={7} value={data.gym_days_per_week ?? 3}
                  onChange={e => setField('gym_days_per_week', parseInt(e.target.value))}
                  className="w-full" />
              </div>
              <div className="space-y-2">
                <Label>Session length: {data.session_length_minutes ?? 60} min</Label>
                <input type="range" min={20} max={180} step={5} value={data.session_length_minutes ?? 60}
                  onChange={e => setField('session_length_minutes', parseInt(e.target.value))}
                  className="w-full" />
              </div>
            </div>
          )}

          {/* Step 7: Training Style */}
          {step === 7 && (
            <div className="grid grid-cols-1 gap-2">
              {TRAINING_STYLES.map(ts => {
                const disabled = (data.gym_days_per_week ?? 3) < ts.minDays
                return (
                  <button key={ts.value} onClick={() => !disabled && setField('training_style', ts.value)}
                    disabled={disabled}
                    className={`p-3 rounded-lg border text-left transition-colors ${disabled ? 'opacity-40 cursor-not-allowed border-gray-800' : data.training_style === ts.value ? 'border-brand bg-brand/10' : 'border-gray-700 hover:border-gray-500'}`}>
                    <span className="font-medium">{ts.label}</span>
                    <span className="text-xs text-gray-400 ml-2">({ts.minDays}+ days)</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Step 8: Abs */}
          {step === 8 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Label>Include abs in workouts?</Label>
                <button onClick={() => setField('include_abs', !data.include_abs)}
                  className={`px-4 py-1 rounded-full text-sm ${data.include_abs ? 'bg-brand text-white' : 'bg-gray-700'}`}>
                  {data.include_abs ? 'Yes' : 'No'}
                </button>
              </div>
              {data.include_abs && (
                <div className="space-y-2">
                  <Label>Which days?</Label>
                  <div className="flex gap-2 flex-wrap">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                      <button key={i} onClick={() => {
                        const days = data.abs_days ?? []
                        setField('abs_days', days.includes(i) ? days.filter(x => x !== i) : [...days, i])
                      }}
                        className={`w-10 h-10 rounded-full text-sm ${(data.abs_days ?? []).includes(i) ? 'bg-brand text-white' : 'bg-gray-700'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 9: Recovery */}
          {step === 9 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Avg sleep hours: {data.sleep_hours ?? 7}</Label>
                <input type="range" min={3} max={12} step={0.5} value={data.sleep_hours ?? 7}
                  onChange={e => setField('sleep_hours', parseFloat(e.target.value))}
                  className="w-full" />
              </div>
              <div className="space-y-2">
                <Label>Stress level</Label>
                <div className="flex gap-2">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setField('stress_level', s)}
                      className={`w-10 h-10 rounded-full text-lg ${(data.stress_level ?? 2) === s ? 'bg-brand' : 'bg-gray-700'}`}>
                      {['😴','😐','🙂','😊','🔥'][s-1]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Job activity</Label>
                <div className="flex gap-2">
                  {[{v:'desk',l:'Desk'},{v:'mixed',l:'Mixed'},{v:'physical',l:'Physical'}].map(j => (
                    <button key={j.v} onClick={() => setField('job_activity', j.v)}
                      className={`flex-1 py-2 rounded-lg border text-sm ${(data.job_activity ?? 'desk') === j.v ? 'border-brand bg-brand/10' : 'border-gray-700'}`}>
                      {j.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cardio sessions/week: {data.cardio_sessions_per_week ?? 0}</Label>
                <input type="range" min={0} max={7} value={data.cardio_sessions_per_week ?? 0}
                  onChange={e => setField('cardio_sessions_per_week', parseInt(e.target.value))}
                  className="w-full" />
              </div>
            </div>
          )}

          {/* Step 10: Movement History */}
          {step === 10 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Prioritized muscles</Label>
                <div className="flex flex-wrap gap-1">
                  {MUSCLES.map(m => (
                    <button key={m} onClick={() => {
                      const current = data.prioritized_muscles ?? []
                      setField('prioritized_muscles', current.includes(m) ? current.filter(x => x !== m) : [...current, m])
                    }}
                      className={`px-2 py-1 rounded-full text-xs ${(data.prioritized_muscles ?? []).includes(m) ? 'bg-brand text-white' : 'bg-gray-700'}`}>
                      {m.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email (for account)</Label>
                <Input type="email" value={data.email ?? ''} onChange={e => setField('email', e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={data.password ?? ''} onChange={e => setField('password', e.target.value)} placeholder="Min 8 characters" />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Navigation */}
          <div className="flex gap-2 pt-4">
            {step > 1 && <Button variant="outline" onClick={prev} className="flex-1">Back</Button>}
            {step < 10 ? (
              <Button onClick={next} disabled={!canProceed()} className="flex-1">Continue</Button>
            ) : (
              <Button onClick={handleComplete} className="flex-1">Complete Setup</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}