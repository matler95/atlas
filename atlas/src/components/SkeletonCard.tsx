import { cn } from '@/lib/utils'

interface SkeletonCardProps {
  lines?: number
  showAvatar?: boolean
  className?: string
}

export function SkeletonCard({ lines = 3, showAvatar = false, className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border border-gray-700 bg-gray-900 p-6 animate-pulse', className)}>
      <div className="flex items-center gap-4 mb-4">
        {showAvatar && <div className="h-10 w-10 rounded-full bg-gray-700" />}
        <div className="h-4 w-1/3 bg-gray-700 rounded" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-3 bg-gray-700 rounded mb-2',
            i === lines - 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  )
}