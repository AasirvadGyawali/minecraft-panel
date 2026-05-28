// These are the "shapes" of our data objects
// TypeScript uses these to catch bugs before runtime

export interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'  // can only be one of these two values
  createdAt: string
}

export interface Server {
  id: string
  name: string
  type: 'vanilla' | 'paper' | 'forge' | 'fabric'
  version: string
  port: number
  memoryMb: number
  status: 'running' | 'stopped' | 'creating' | 'error'
  ownerId: string
  createdAt: string
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}