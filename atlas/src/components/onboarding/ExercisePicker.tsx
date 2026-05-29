import { useState } from 'react'
import { useExercises } from '@/hooks/useExercises'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EQUIPMENT_FILTER_MAP } from '@/lib/algorithms/exercise-scoring'

interface ExercisePickerProps {
  userEquipment: string
  selectedIds: string[]
  onSelect: (exerciseId: string) => void
  onClose: () => void
}

export function ExercisePicker({ userEquipment, selectedIds, onSelect, onClose }: ExercisePickerProps) {
  const [search, setSearch] = useState('')
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null)
  const { data: exercises } = useExercises()

  const equipmentMap = EQUIPMENT_FILTER_MAP()
  const allowedEquipment = equipmentMap[userEquipment] ?? []

  const allExercises = exercises ?? []
  // If no exercises match equipment filter, show all (exercises may not be seeded yet)
  const equipmentFiltered = allExercises.filter(ex => allowedEquipment.includes(ex.equipment))
  const showAll = equipmentFiltered.length === 0 && allExercises.length > 0
  const baseList = showAll ? allExercises : equipmentFiltered

  const filtered = baseList.filter(ex => {
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase())) return false
    if (muscleFilter && !ex.primary_muscles.includes(muscleFilter as never)) return false
    return true
  })

  const muscles = ['chest','quadriceps','hamstrings','shoulders','lats','biceps','triceps','glutes','calves','abdominals','forearms','traps','lower_back','middle_back']

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 overflow-y-auto pb-20">
      <div className="sticky top-0 bg-gray-950 z-10 px-4 pt-4 pb-2 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Add Exercise</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm">Close</button>
        </div>
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2"
        />
        <div className="flex gap-1 overflow-x-auto pb-1">
          <button
            onClick={() => setMuscleFilter(null)}
            className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${!muscleFilter ? 'bg-brand text-white' : 'bg-gray-700 text-gray-300'}`}
          >
            All
          </button>
          {muscles.map(m => (
            <button
              key={m}
              onClick={() => setMuscleFilter(m === muscleFilter ? null : m)}
              className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${muscleFilter === m ? 'bg-brand text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {m.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 pt-2 space-y-1">
        {filtered.slice(0, 100).map(ex => {
          const isSelected = selectedIds.includes(ex.id)
          return (
            <button
              key={ex.id}
              onClick={() => { if (!isSelected) { onSelect(ex.id); onClose() }}}
              disabled={isSelected}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-brand/30 bg-brand/5 opacity-50 cursor-not-allowed'
                  : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-sm">{ex.name}</div>
                  <div className="flex gap-1 mt-1">
                    {ex.primary_muscles.slice(0, 3).map(m => (
                      <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">{ex.equipment}</span>
                  {isSelected && <div className="text-xs text-brand mt-1">✓ Added</div>}
                </div>
              </div>
            </button>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">No exercises match your filters</p>
        )}
      </div>
    </div>
  )
}