import clsx from 'clsx'

interface StatsCardProps {
  label: string
  value: string | number
  icon: string
  color?: 'green' | 'blue' | 'red' | 'yellow'
  subtitle?: string
}

export default function StatsCard({
  label,
  value,
  icon,
  color = 'green',
  subtitle
}: StatsCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-start gap-4">
      <div className={clsx(
        'w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0',
        color === 'green' && 'bg-green-500/20',
        color === 'blue' && 'bg-blue-500/20',
        color === 'red' && 'bg-red-500/20',
        color === 'yellow' && 'bg-yellow-500/20',
      )}>
        {icon}
      </div>
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-3xl font-bold text-white mt-0.5">{value}</p>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}