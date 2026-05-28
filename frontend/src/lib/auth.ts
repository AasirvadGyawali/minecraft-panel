import api from './api'

export interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'
}

// Save token and user to localStorage after login/register
export function saveAuth(token: string, user: User): void {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

// Remove auth data on logout
export function clearAuth(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

// Get current user from localStorage
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

// Check if user is logged in
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('token')
}

// API calls
export async function loginUser(email: string, password: string) {
  const response = await api.post('/api/auth/login', { email, password })
  return response.data
}

export async function registerUser(email: string, username: string, password: string) {
  const response = await api.post('/api/auth/register', { email, username, password })
  return response.data
}

export async function getCurrentUser() {
  const response = await api.get('/api/auth/me')
  return response.data
}