'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import StatsCard from '@/components/ui/StatsCard'
import ServerCard from '@/components/ui/ServerCard'
import Button from '@/components/ui/Button'
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

// ── Create Server Modal ──────────────────────────────────
function CreateServerModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [type, setType] = useState('vanilla')
  const [version, setVersion] = useState('1.20.4')
  const [memory, setMemory] = useState('1024')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) {
      setError('Server name is required')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await api.post('/api/servers', {
        name: name.trim(),
        type,
        version,
        memoryMb: parseInt(memory),
      })
      onCreated()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create server')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md">

        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Create New Server</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Server Name</label>
            <input
              type="text"
              placeholder="My Survival Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Server Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="vanilla">Vanilla</option>
              <option value="paper">Paper</option>
              <option value="forge">Forge</option>
              <option value="fabric">Fabric</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Minecraft Version</label>
            <select
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="1.20.4">1.20.4</option>
              <option value="1.20.1">1.20.1</option>
              <option value="1.19.4">1.19.4</option>
              <option value="1.18.2">1.18.2</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-300">Memory (MB)</label>
            <select
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="512">512 MB</option>
              <option value="1024">1 GB</option>
              <option value="2048">2 GB</option>
              <option value="4096">4 GB</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-800">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} isLoading={isLoading} className="flex-1">
            Create Server
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main Dashboard Page ──────────────────────────────────
export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchServers()
  }, [])

  async function fetchServers() {
    try {
      const response = await api.get('/api/servers')
      setServers(response.data.data || [])
    } catch (error) {
      console.error('Failed to fetch servers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const totalServers = servers.length
  const runningServers = servers.filter(s => s.status === 'running').length
  const stoppedServers = servers.filter(s => s.status === 'stopped').length

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Manage your Minecraft servers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + New Server
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatsCard
          label="Total Servers"
          value={totalServers}
          icon="🖥️"
          color="blue"
        />
        <StatsCard
          label="Running"
          value={runningServers}
          icon="▶️"
          color="green"
          subtitle="Currently active"
        />
        <StatsCard
          label="Stopped"
          value={stoppedServers}
          icon="⏹️"
          color="red"
          subtitle="Inactive servers"
        />
      </div>

      {/* Server List */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-semibold text-white">Your Servers</h2>
          <span className="text-sm text-gray-400">{totalServers} total</span>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-400">Loading servers...</p>
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🎮</p>
              <p className="text-white font-medium">No servers yet</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                Create your first Minecraft server to get started
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                + Create Server
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {servers.map((server) => (
               <ServerCard
               key={server.id}
               server={server}
               onRefresh={fetchServers}
  />
))}
            </div>
          )}
        </div>
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <CreateServerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            fetchServers()
          }}
        />
      )}
    </DashboardLayout>
  )
}