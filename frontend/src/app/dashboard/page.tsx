'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getStoredUser, clearAuth } from '@/lib/auth'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    // Protect this route — redirect to login if not authenticated
    if (!isAuthenticated()) {
      router.push('/login')
      return
    }
    setUser(getStoredUser())
  }, [router])

  function handleLogout() {
    clearAuth()
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-gray-400 mt-1">
              Welcome back, <span className="text-green-400">{user.username}</span>!
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Placeholder cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {['Total Servers', 'Running', 'Stopped'].map((label, i) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <p className="text-gray-400 text-sm">{label}</p>
              <p className="text-3xl font-bold mt-1">0</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400 text-center">
            No servers yet. We'll add server management in the next step!
          </p>
        </div>
      </div>
    </div>
  )
}