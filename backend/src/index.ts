import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { initializeDatabase } from './db/database'
import { testDockerConnection } from './services/docker'
import { initializeWebSocket } from './websocket/consoleStream'
import authRoutes from './routes/auth'
import serverRoutes from './routes/servers'
import serverControlRoutes from './routes/serverControl'
import fileRoutes from './routes/files'
import uploadRoutes from './routes/upload'
import adminRoutes from './routes/admin'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Create data directory
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// ── Middleware ──────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/servers', serverRoutes)
app.use('/api/servers', serverControlRoutes)
app.use('/api/servers', fileRoutes)
app.use('/api/servers', uploadRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() }
  })
})

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

// ── Create HTTP server (needed for WebSocket) ───────────
// We use http.createServer instead of app.listen
// because WebSockets need to share the same HTTP server
const httpServer = http.createServer(app)

// ── Start Everything ─────────────────────────────────────
initializeDatabase().then(async () => {
  await testDockerConnection()

  // Initialize WebSocket server on same port as HTTP
  initializeWebSocket(httpServer)

  httpServer.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`)
    console.log(`🔌 WebSocket available on ws://localhost:${PORT}`)
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`)
  })
}).catch(console.error)

export default app