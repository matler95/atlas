import { useAuthStore } from '@/stores/authStore'
import { useFitnessSnapshots } from '@/hooks/useProgress'
import { useBodyweightLogs } from '@/hooks/useBodyweightLogs'
import { useUserProfile } from '@/hooks/useUserProfile'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { estimateBodyFatBMI, leanBodyMass } from '@/lib/algorithms/nutrition'

export default function ProgressPage() {
  const user = useAuthStore(s => s.user)
  const { data: profile } = useUserProfile(user?.id)
  const { data: snapshots, isPending: snapshotsLoading } = useFitnessSnapshots(user?.id, 60)
  const { data: bwLogs } = useBodyweightLogs(user?.id)

  if (snapshotsLoading) return <LoadingSpinner size="lg" className="min-h-screen" />

  const latestSnapshot = snapshots?.[snapshots.length - 1]
  const latestBw = bwLogs?.[0]

  const bfPct = profile ? estimateBodyFatBMI(profile.weight_kg, profile.height_cm, profile.gender) : 0
  const lbm = profile ? leanBodyMass(profile.weight_kg, bfPct) : 0

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Progress</h1>
      <Tabs defaultValue="body">
        <TabsList className="w-full">
          <TabsTrigger value="body" className="flex-1">Body</TabsTrigger>
          <TabsTrigger value="strength" className="flex-1">Strength</TabsTrigger>
          <TabsTrigger value="volume" className="flex-1">Volume</TabsTrigger>
          <TabsTrigger value="streaks" className="flex-1">Streaks</TabsTrigger>
        </TabsList>

        {/* Body Tab */}
        <TabsContent value="body">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Body Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold">{latestBw ? Number(latestBw.weight_kg).toFixed(1) : '--'}</div>
                  <div className="text-xs text-gray-400">Weight (kg)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{bfPct.toFixed(1)}%</div>
                  <div className="text-xs text-gray-400">Est. Body Fat</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{lbm.toFixed(1)}</div>
                  <div className="text-xs text-gray-400">Lean Mass (kg)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{profile ? (profile.weight_kg / ((profile.height_cm / 100) ** 2)).toFixed(1) : '--'}</div>
                  <div className="text-xs text-gray-400">BMI</div>
                </div>
              </div>
              {bwLogs && bwLogs.length > 0 && (
                <div className="pt-4">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Weight History</h3>
                  <div className="space-y-1">
                    {bwLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="flex justify-between text-sm">
                        <span className="text-gray-400">{log.date}</span>
                        <span>{Number(log.weight_kg).toFixed(1)} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Strength Tab */}
        <TabsContent value="strength">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strength Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm">Complete workouts to track your strength progress. e1RM data will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Volume Tab */}
        <TabsContent value="volume">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Volume Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              {latestSnapshot && (
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-green-400">{Number(latestSnapshot.fitness).toFixed(1)}</div>
                    <div className="text-xs text-gray-400">Fitness</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-red-400">{Number(latestSnapshot.fatigue).toFixed(1)}</div>
                    <div className="text-xs text-gray-400">Fatigue</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${Number(latestSnapshot.form) >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                      {Number(latestSnapshot.form).toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">Form</div>
                  </div>
                </div>
              )}
              {!latestSnapshot && <p className="text-gray-400 text-sm">No volume data yet. Complete workouts to see volume tracking.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Streaks Tab */}
        <TabsContent value="streaks">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Consistency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-3xl font-bold text-brand">{snapshots?.length ?? 0}</div>
                  <div className="text-xs text-gray-400">Active Days</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-brand">{bwLogs?.length ?? 0}</div>
                  <div className="text-xs text-gray-400">Weight Logs</div>
                </div>
              </div>
              {/* GitHub-style heatmap placeholder */}
              <div className="mt-4 grid grid-cols-7 gap-1">
                {Array.from({ length: 84 }).map((_, i) => {
                  const hasData = snapshots?.some((_, j) => j === i % (snapshots?.length ?? 1))
                  return (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-sm ${hasData ? 'bg-brand' : 'bg-gray-800'}`}
                    />
                  )
                })}
              </div>
              <div className="text-xs text-gray-400 mt-2">Last 12 weeks</div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}