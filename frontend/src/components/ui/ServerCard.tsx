'use client'

import clsx from 'clsx'
import Link from 'next/link'
import { useState } from 'react'
import api from '@/lib/api'

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
  onRefresh: () => void
}

const statusConfig = {
  running: { label: 'Running', color: 'text-green-400 bg-green-500/20 border-green-500/30', dot: 'bg-green-500' },
  stopped: { label: 'Stopped', color: 'text-gray-400 bg-gray-500/20 border-gray-500/30', dot: 'bg-gray-500' },
  creating: { label: 'Starting...', color: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30', dot: 'bg-yellow-500' },
  error: { label: 'Error', color: 'text-red-400 bg-red-500/20 border-red-500/30', dot: 'bg-red-500' },
}

export default function ServerCard({ server, onRefresh }: ServerCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const status = statusConfig[server.status] || statusConfig.stopped

  async function handleAction(action: 'start' | 'stop' | 'restart') {
    setIsLoading(true)
    try {
      await api.post(`/api/servers/${server.id}/${action}`)
      // Poll for status update
      setTimeout(onRefresh, 1000)
      setTimeout(onRefresh, 3000)
      setTimeout(onRefresh, 6000)
    } catch (err) {
      console.error(`Failed to ${action} server:`, err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
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

        {/* Status Badge with animated dot */}
        <span className={clsx(
          'px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0 flex items-center gap-1.5',
          status.color
        )}>
          <span className={clsx(
            'w-1.5 h-1.5 rounded-full',
            status.dot,
            server.status === 'running' && 'animate-pulse',
            server.status === 'creating' && 'animate-pulse'
          )} />
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span>💾 {server.memory_mb}MB RAM</span>
        <span>🔌 :{server.port}</span>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2">
        {server.status === 'stopped' || server.status === 'error' ? (
          <button
            onClick={() => handleAction('start')}
            disabled={isLoading}
            className="flex-1 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? '...' : '▶ Start'}
          </button>
        ) : server.status === 'running' ? (
          <>
            <button
              onClick={() => handleAction('stop')}
              disabled={isLoading}
              className="flex-1 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? '...' : '■ Stop'}
            </button>
            <button
              onClick={() => handleAction('restart')}
              disabled={isLoading}
              className="flex-1 py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? '...' : '↺ Restart'}
            </button>
          </>
        ) : (
          <div className="flex-1 py-1.5 text-center text-yellow-400 text-sm">
            Starting up...
          </div>
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