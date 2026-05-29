import { useAuthStore } from '@/stores/authStore'
import { useUserProfile, useUpdateUserProfile } from '@/hooks/useUserProfile'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const navigate = useNavigate()
  const { data: profile, isPending } = useUserProfile(user?.id)
  const updateProfile = useUpdateUserProfile()

  const [name, setName] = useState('')

  if (isPending) return <LoadingSpinner size="lg" className="min-h-screen" />
  if (!profile) return <div className="p-4 text-white">No profile found</div>

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate({ to: '/auth/login' })
  }

  const handleSaveName = () => {
    if (!name || !user?.id) return
    updateProfile.mutate({ userId: user.id, updates: { name } })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-20 px-4 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <div className="flex gap-2">
              <Input defaultValue={profile.name} onChange={e => setName(e.target.value)} />
              <Button onClick={handleSaveName} size="sm">Save</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-gray-400">Gender:</span> {profile.gender}</div>
            <div><span className="text-gray-400">Age:</span> {profile.age}</div>
            <div><span className="text-gray-400">Height:</span> {profile.height_cm} cm</div>
            <div><span className="text-gray-400">Weight:</span> {profile.weight_kg} kg</div>
          </div>
        </CardContent>
      </Card>

      {/* Goals & Training */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Goals & Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-gray-400">Goal:</span> {profile.goal.replace(/_/g, ' ')}</div>
          <div><span className="text-gray-400">Experience:</span> {profile.experience}</div>
          <div><span className="text-gray-400">Training Style:</span> {profile.training_style.replace(/_/g, ' ')}</div>
          <div><span className="text-gray-400">Days/Week:</span> {profile.gym_days_per_week}</div>
          <div><span className="text-gray-400">Session Length:</span> {profile.session_length_minutes} min</div>
        </CardContent>
      </Card>

      {/* Recovery */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-gray-400">Sleep:</span> {profile.sleep_hours}h</div>
          <div><span className="text-gray-400">Stress:</span> {profile.stress_level}/5</div>
          <div><span className="text-gray-400">Job Activity:</span> {profile.job_activity}</div>
          <div><span className="text-gray-400">Cardio/Week:</span> {profile.cardio_sessions_per_week}</div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div><span className="text-gray-400">Units:</span> {profile.units}</div>
          <div><span className="text-gray-400">Theme:</span> {profile.theme}</div>
          <div><span className="text-gray-400">Language:</span> {profile.language}</div>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-400 mb-4">{user?.email}</div>
          <Button variant="destructive" onClick={handleSignOut} className="w-full">Sign Out</Button>
        </CardContent>
      </Card>
    </div>
  )
}