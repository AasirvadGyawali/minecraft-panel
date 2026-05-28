// Shared TypeScript types for the entire backend

export interface User {
  id: string
  email: string
  username: string
  passwordHash: string
  role: 'user' | 'admin'
  createdAt: string
}

export interface Server {
  id: string
  ownerId: string
  name: string
  type: 'vanilla' | 'paper' | 'forge' | 'fabric'
  version: string
  port: number
  memoryMb: number
  status: 'running' | 'stopped' | 'creating' | 'error'
  containerId: string | null
  createdAt: string
}

// This extends Express's Request type to include our user data
// After auth middleware runs, req.user will be available
export interface AuthRequest extends Express.Request {
  user?: {
    id: string
    email: string
    role: string
  }
}