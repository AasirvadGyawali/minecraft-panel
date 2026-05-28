import clsx from 'clsx'
import Link from 'next/link'

interface Server {
  id: string
  name: string
  type: string
  version: string
  port: number
  status: 'running' | 'stopped' | 'creating' | 'error'
  memory_mb: number
}

interface ServerCardProps {
  server: Server
  onStart?: (id: string) => void
  onStop?: (id: string) => void
  onRestart?: (id: string) => void
}

const statusConfig = {
  running: { label: 'Running', color: 'text-green-400 bg-green-500/20 border-green-500/30' },
  stopped: { label: 'Stopped', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30' },
  creating: { label: 'Creating', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30' },
  error: { label: 'Error', color: 'text-red-400 bg-red-500/20 border-red-500/30' },
}

export default function ServerCard({ server, onStart, onStop, onRestart }: ServerCardProps) {
  const status = statusConfig[server.status] || statusConfig.stopped

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-4">

        {/* Server Info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
            🖥️
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white truncate">{server.name}</h3>
            <p className="text-sm text-gray-400">
              {server.type} {server.version} · Port {server.port}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <span className={clsx(
          'px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0',
          status.color
        )}>
          {status.label}
        </span>
      </div>

      {/* Memory info */}
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span>💾 {server.memory_mb}MB RAM</span>
        <span>🔌 :{server.port}</span>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2">
        {server.status === 'stopped' && (
          <button
            onClick={() => onStart?.(server.id)}
            className="flex-1 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium transition-colors"
          >
            ▶ Start
          </button>
        )}
        {server.status === 'running' && (
          <>
            <button
              onClick={() => onStop?.(server.id)}
              className="flex-1 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg text-sm font-medium transition-colors"
            >
              ■ Stop
            </button>
            <button
              onClick={() => onRestart?.(server.id)}
              className="flex-1 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30 rounded-lg text-sm font-medium transition-colors"
            >
              ↺ Restart
            </button>
          </>
        )}
        <Link
          href={`/servers/${server.id}`}
          className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors text-center"
        >
          Manage →
        </Link>
      </div>
    </div>
  )
}