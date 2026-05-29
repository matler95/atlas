import { Link } from '@tanstack/react-router'
import { Home, Calendar, TrendingUp, BookOpen, User } from 'lucide-react'

const navItems = [
  { to: '/app/dashboard', icon: Home, label: 'Dashboard' },
  { to: '/app/plan', icon: Calendar, label: 'Plan' },
  { to: '/app/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/app/library', icon: BookOpen, label: 'Library' },
  { to: '/app/profile', icon: User, label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-14 bg-gray-900 border-t border-gray-700 flex items-center justify-around z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {navItems.map(({ to, icon: Icon, label }) => (
        <Link
          key={to}
          to={to}
          className="flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px]"
          activeProps={{ className: 'text-brand' }}
          inactiveProps={{ className: 'text-gray-400' }}
        >
          <Icon size={20} />
          <span className="text-[10px]">{label}</span>
        </Link>
      ))}
    </nav>
  )
}