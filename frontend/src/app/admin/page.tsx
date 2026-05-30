'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/layout/DashboardLayout'
import StatsCard from '@/components/ui/StatsCard'
import { getStoredUser } from '@/lib/auth'
import {
  getAdminStats,
  getAdminUsers,
  getAdminServers,
  deleteUser,
  updateUserRole,
  adminDeleteServer
} from '@/lib/admin'
import clsx from 'clsx'

interface AdminStats {
  users: number
  servers: { total: number; running: number; stopped: number }
  docker: { containers: number; images: number; memTotal: number }
}

interface AdminUser {
  id: string
  email: string
  username: string
  role: string
  created_at: string
  server_count: number
}

interface AdminServer {
  id: string
  name: string
  type: string
  version: string
  port: number
  status: string
  memory_mb: number
  owner_name: string
  owner_email: string
  created_at: string
}

type Tab = 'overview' | 'users' | 'servers'

export default function AdminPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [servers, setServers] = useState<AdminServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    // Check admin access
    const user = getStoredUser()
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    loadData()
  }, [router])

  async function loadData() {
    setIsLoading(true)
    try {
      const [statsData, usersData, serversData] = await Promise.all([
        getAdminStats(),
        getAdminUsers(),
        getAdminServers(),
      ])
      setStats(statsData)
      setUsers(usersData)
      setServers(serversData)
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDeleteUser(id: string, username: string) {
    if (!confirm(`Delete user "${username}"? This will also delete all their servers!`)) return
    try {
      await deleteUser(id)
      setActionMessage(`✅ User ${username} deleted`)
      loadData()
    } catch (err: any) {
      setActionMessage(`❌ ${err.response?.data?.error || 'Failed to delete user'}`)
    }
    setTimeout(() => setActionMessage(''), 3000)
  }

  async function handleRoleChange(id: string, currentRole: string) {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (!confirm(`Change role to "${newRole}"?`)) return
    try {
      await updateUserRole(id, newRole)
      setActionMessage(`✅ Role updated to ${newRole}`)
      loadData()
    } catch (err: any) {
      setActionMessage(`❌ ${err.response?.data?.error || 'Failed to update role'}`)
    }
    setTimeout(() => setActionMessage(''), 3000)
  }

  async function handleDeleteServer(id: string, name: string) {
    if (!confirm(`Force delete server "${name}"?`)) return
    try {
      await adminDeleteServer(id)
      setActionMessage(`✅ Server ${name} deleted`)
      loadData()
    } catch (err: any) {
      setActionMessage(`❌ ${err.response?.data?.error || 'Failed to delete server'}`)
    }
    setTimeout(() => setActionMessage(''), 3000)
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥' },
    { id: 'servers', label: 'All Servers', icon: '🖥️' },
  ]

  const statusColors: Record<string, string> = {
    running: 'text-green-400 bg-green-500/20',
    stopped: 'text-gray-400 bg-gray-500/20',
    creating: 'text-yellow-400 bg-yellow-500/20',
    error: 'text-red-400 bg-red-500/20',
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🛡️ Admin Panel
          </h1>
          <p className="text-gray-400 mt-1">Platform management and oversight</p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div className={clsx(
          'mb-4 p-3 rounded-lg text-sm',
          actionMessage.startsWith('✅')
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        )}>
          {actionMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-green-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard
                  label="Total Users"
                  value={stats.users}
                  icon="👥"
                  color="blue"
                />
                <StatsCard
                  label="Total Servers"
                  value={stats.servers.total}
                  icon="🖥️"
                  color="green"
                />
                <StatsCard
                  label="Running"
                  value={stats.servers.running}
                  icon="▶️"
                  color="green"
                />
                <StatsCard
                  label="Stopped"
                  value={stats.servers.stopped}
                  icon="⏹️"
                  color="red"
                />
              </div>

              {/* Docker Info */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  🐳 Docker System
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-gray-400 text-sm">Containers</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stats.docker.containers}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Images</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {stats.docker.images}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total RAM</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      {Math.round(stats.docker.memTotal / 1024 / 1024 / 1024)}GB
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">
                  📈 Platform Health
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Server utilization</span>
                    <span className="text-white text-sm font-medium">
                      {stats.servers.total > 0
                        ? Math.round((stats.servers.running / stats.servers.total) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${stats.servers.total > 0
                          ? (stats.servers.running / stats.servers.total) * 100
                          : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-gray-400 text-sm">Avg servers per user</span>
                    <span className="text-white text-sm font-medium">
                      {stats.users > 0
                        ? (stats.servers.total / stats.users).toFixed(1)
                        : 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white">All Users</h2>
                <span className="text-sm text-gray-400">{users.length} total</span>
              </div>

              <div className="divide-y divide-gray-800">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/50">
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                      {user.username[0].toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium">{user.username}</p>
                        <span className={clsx(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          user.role === 'admin'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        )}>
                          {user.role}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm truncate">{user.email}</p>
                    </div>

                    {/* Server count */}
                    <div className="text-center flex-shrink-0">
                      <p className="text-white font-bold">{user.server_count}</p>
                      <p className="text-gray-500 text-xs">servers</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRoleChange(user.id, user.role)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs transition-colors"
                      >
                        {user.role === 'admin' ? '→ User' : '→ Admin'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Servers Tab */}
          {activeTab === 'servers' && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-white">All Servers</h2>
                <span className="text-sm text-gray-400">{servers.length} total</span>
              </div>

              <div className="divide-y divide-gray-800">
                {servers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No servers found
                  </div>
                ) : (
                  servers.map((server) => (
                    <div key={server.id} className="flex items-center gap-4 p-4 hover:bg-gray-800/50">
                      <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                        🖥️
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{server.name}</p>
                          <span className={clsx(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            statusColors[server.status] || statusColors.stopped
                          )}>
                            {server.status}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm">
                          {server.type} {server.version} · Port {server.port} · Owner: {server.owner_name}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-white text-sm">{server.memory_mb}MB</p>
                        <p className="text-gray-500 text-xs">RAM</p>
                      </div>

                      <button
                        onClick={() => handleDeleteServer(server.id, server.name)}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs transition-colors flex-shrink-0"
                      >
                        Force Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  )
}