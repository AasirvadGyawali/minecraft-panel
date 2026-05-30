'use client'
import FileManager from '@/components/ui/FileManager'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import Console from '@/components/ui/Console'
import Button from '@/components/ui/Button'
import api from '@/lib/api'
import clsx from 'clsx'

interface Server {
  id: string
  name: string
  type: string
  version: string
  port: number
  status: 'running' | 'stopped' | 'creating' | 'error'
  memory_mb: number
  created_at: string
}

export default function ServerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [server, setServer] = useState<Server | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  const serverId = String(params.id)

  useEffect(() => {
    fetchServer()
    // Poll every 5 seconds to update status
    const interval = setInterval(fetchServer, 5000)
    return () => clearInterval(interval)
  }, [serverId])

  async function fetchServer() {
    try {
      const response = await api.get(`/api/servers/${serverId}`)
      setServer(response.data.data)
    } catch (error) {
      console.error('Failed to fetch server:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleAction(action: 'start' | 'stop' | 'restart') {
    setActionLoading(true)
    try {
      await api.post(`/api/servers/${serverId}/${action}`)
      setTimeout(fetchServer, 1000)
      setTimeout(fetchServer, 3000)
    } catch (err) {
      console.error(`Failed to ${action}:`, err)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure? This will delete the server and all its data!')) return
    try {
      await api.delete(`/api/servers/${serverId}`)
      router.push('/dashboard')
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!server) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-400">Server not found</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const statusColors = {
    running: 'text-green-400 bg-green-500/20 border-green-500/30',
    stopped: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
    creating: 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30',
    error: 'text-red-400 bg-red-500/20 border-red-500/30',
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{server.name}</h1>
            <span className={clsx(
              'px-2.5 py-1 rounded-full text-xs font-medium border',
              statusColors[server.status]
            )}>
              {server.status}
            </span>
          </div>
          <p className="text-gray-400 mt-1">
            {server.type} {server.version} · Port {server.port} · {server.memory_mb}MB RAM
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        {(server.status === 'stopped' || server.status === 'error') && (
          <Button
            onClick={() => handleAction('start')}
            isLoading={actionLoading}
          >
            ▶ Start Server
          </Button>
        )}
        {server.status === 'running' && (
          <>
            <Button
              variant="danger"
              onClick={() => handleAction('stop')}
              isLoading={actionLoading}
            >
              ■ Stop Server
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAction('restart')}
              isLoading={actionLoading}
            >
              ↺ Restart Server
            </Button>
          </>
        )}
        <Button
          variant="danger"
          onClick={handleDelete}
          className="ml-auto"
        >
          🗑 Delete Server
        </Button>
      </div>

      {/* Server Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Type', value: server.type },
          { label: 'Version', value: server.version },
          { label: 'Port', value: server.port },
          { label: 'Memory', value: `${server.memory_mb}MB` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-xs">{label}</p>
            <p className="text-white font-semibold mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Live Console */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          Live Console
        </h2>
        <Console serverId={server.id} serverStatus={server.status} />
      </div>

      {/* File Manager */}
{server.status === 'running' && (
  <div className="mb-6">
    <h2 className="text-lg font-semibold text-white mb-3">
      File Manager
    </h2>
    <FileManager serverId={server.id} />
  </div>
)}

      {/* Connection Info */}
      {server.status === 'running' && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <p className="text-green-400 font-medium mb-1">
            Server is online!
          </p>
          <p className="text-gray-400 text-sm">
            Connect in Minecraft: <span className="text-white font-mono">localhost:{server.port}</span>
          </p>
        </div>
      )}
    </DashboardLayout>
  )
}