'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { isAuthenticated, getStoredUser, clearAuth } from '@/lib/auth'
import clsx from 'clsx'

// Navigation items for the sidebar
const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/servers', label: 'Servers', icon: '🖥️' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
]

const adminItems = [
  { href: '/admin', label: 'Admin Panel', icon: '🛡️' },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
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
    <div className="min-h-screen bg-gray-950 flex">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 z-30',
        'flex flex-col transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>

        {/* Logo */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-sm">
              🎮
            </div>
            <span className="font-bold text-white text-lg">MC Panel</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 flex flex-col gap-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">
            General
          </p>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}

          {/* Admin section — only visible to admins */}
          {user.role === 'admin' && (
            <>
              <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2 mt-6">
                Admin
              </p>
              {adminItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User info at bottom of sidebar */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-bold">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.username}</p>
              <p className="text-xs text-gray-400 truncate">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-gray-400 hover:text-red-400 transition-colors text-lg"
            >
              →
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            ☰
          </button>

          <div className="flex-1" />

          {/* Role badge */}
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            user.role === 'admin'
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
          )}>
            {user.role}
          </span>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
