import axios from 'axios'

// Base URL of our backend — reads from environment variable
// Falls back to localhost for development
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — runs before EVERY request
// Automatically attaches JWT token if it exists
api.interceptors.request.use((config) => {
  // Only runs in browser (not during server-side rendering)
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Response interceptor — runs after EVERY response
// If we get 401 (unauthorized), clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api