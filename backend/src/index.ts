import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { initializeDatabase } from './db/database'
import authRoutes from './routes/auth'
import serverRoutes from './routes/servers'
import serverControlRoutes from './routes/serverControl'

// Load environment variables from .env file
dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Create data directory if it doesn't exist
// This is where our SQLite database file will live
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// ── Middleware ──────────────────────────────────────────
// CORS: allows our frontend (localhost:3000) to talk to backend (localhost:4000)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))

// Parse JSON request bodies
app.use(express.json())

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }))

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/servers', serverRoutes)
app.use('/api/servers', serverControlRoutes)

// Health check endpoint — useful for deployment platforms
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    data: { 
      status: 'ok', 
      timestamp: new Date().toISOString() 
    } 
  })
})

// 404 handler — catches any unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ── Start Server ─────────────────────────────────────────
// ── Start Server ─────────────────────────────────────────
import { testDockerConnection } from './services/docker'

initializeDatabase().then(async () => {
  await testDockerConnection()
  app.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}).catch(console.error)