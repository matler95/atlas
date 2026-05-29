import { useState } from 'react'
import { useExercises } from '@/hooks/useExercises'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'

export default function LibraryPage() {
  const [search, setSearch] = useState('')
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null)
  const { data: exercises, isPending } = useExercises()

  if (isPending) return <LoadingSpinner size="lg" className="min-h-screen" />

  const filtered = (exercises ?? []).filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Exercise Library</h1>
      <Input
        placeholder="Search exercises..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4"
      />
      <p className="text-sm text-gray-400 mb-4">{filtered.length} exercises</p>
      <div className="space-y-2">
        {filtered.map(ex => (
          <Card key={ex.slug} className="cursor-pointer" onClick={() => setExpandedSlug(expandedSlug === ex.slug ? null : ex.slug)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{ex.name}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {ex.primary_muscles.map(m => (
                      <Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{ex.level}</Badge>
                  <span className="text-xs text-gray-400">{ex.equipment}</span>
                </div>
              </div>
              {expandedSlug === ex.slug && ex.instructions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
                    {ex.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}