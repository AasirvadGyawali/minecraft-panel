import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import Docker from 'dockerode'
import { dbGet } from '../db/database'

const docker = new Docker()

// Track active streams so we can clean them up
// Map of: serverId → Set of WebSocket clients watching it
const activeStreams = new Map<string, Set<WebSocket>>()

interface AuthPayload {
  id: string
  email: string
  role: string
}

// Parse token from WebSocket URL query string
function parseToken(req: IncomingMessage): AuthPayload | null {
  try {
    const url = new URL(req.url || '', `http://localhost`)
    const token = url.searchParams.get('token')
    if (!token) return null

    return jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as AuthPayload
  } catch {
    return null
  }
}

// Send a message to a WebSocket client safely
function safeSend(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data))
  }
}

// Stream Docker container logs to all subscribed clients
async function streamContainerLogs(
  serverId: string,
  ws: WebSocket
): Promise<void> {
  const containerName = `mc_${serverId.replace(/-/g, '_')}`

  try {
    const container = docker.getContainer(containerName)
    
    // Check container exists and is running
    const info = await container.inspect()
    if (!info.State.Running) {
      safeSend(ws, {
        type: 'error',
        message: 'Server is not running'
      })
      return
    }

    safeSend(ws, {
      type: 'connected',
      message: `Connected to ${containerName} logs...`
    })

    // Get last 50 lines of existing logs first
    const existingLogs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 50,
      timestamps: false
    })

    // Docker log streams have an 8-byte header we need to strip
    const logText = existingLogs.toString('utf8')
    const lines = logText.split('\n').filter(Boolean)
    
    lines.forEach(line => {
      // Strip the 8-byte Docker multiplexing header
      const cleanLine = line.length > 8 ? line.slice(8) : line
      if (cleanLine.trim()) {
        safeSend(ws, { type: 'log', message: cleanLine.trim() })
      }
    })

    // Now stream new logs in real-time
    const logStream = await container.logs({
      stdout: true,
      stderr: true,
      follow: true,  // Keep streaming
      tail: 0,       // Only new lines from now
      timestamps: false
    })

    // Add this client to the active streams map
    if (!activeStreams.has(serverId)) {
      activeStreams.set(serverId, new Set())
    }
    activeStreams.get(serverId)!.add(ws)

    // Handle incoming log data
    logStream.on('data', (chunk: Buffer) => {
      // Strip Docker header (first 8 bytes of each message)
      let offset = 0
      while (offset < chunk.length) {
        if (chunk.length < offset + 8) break
        const size = chunk.readUInt32BE(offset + 4)
        const message = chunk.slice(offset + 8, offset + 8 + size).toString('utf8')
        
        if (message.trim()) {
          safeSend(ws, { type: 'log', message: message.trim() })
        }
        offset += 8 + size
      }
    })

    logStream.on('end', () => {
      safeSend(ws, { type: 'disconnected', message: 'Log stream ended' })
      activeStreams.get(serverId)?.delete(ws)
    })

    logStream.on('error', (err: Error) => {
      safeSend(ws, { type: 'error', message: `Stream error: ${err.message}` })
      activeStreams.get(serverId)?.delete(ws)
    })

    // Clean up when client disconnects
    ws.on('close', () => {
     ;(logStream as any).destroy()
      activeStreams.get(serverId)?.delete(ws)
      console.log(`Client disconnected from server ${serverId} logs`)
    })

  } catch (err: any) {
    safeSend(ws, {
      type: 'error',
      message: `Failed to connect to logs: ${err.message}`
    })
  }
}

// Initialize the WebSocket server
export function initializeWebSocket(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ server: httpServer })

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    console.log('WebSocket client connected')

    // Authenticate the connection
    const user = parseToken(req)
    if (!user) {
      safeSend(ws, { type: 'error', message: 'Unauthorized' })
      ws.close()
      return
    }

    // Handle messages from client
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())

        if (message.type === 'subscribe') {
          const serverId = message.serverId

          // Verify user owns this server
          const server = dbGet(
            'SELECT * FROM servers WHERE id = ? AND owner_id = ?',
            [serverId, user.id]
          )

          if (!server) {
            safeSend(ws, { type: 'error', message: 'Server not found' })
            return
          }

          // Start streaming logs
          await streamContainerLogs(serverId, ws)
        }

        // Handle console commands sent from browser
        if (message.type === 'command') {
          const serverId = message.serverId
          const command = message.command

          const server = dbGet(
            'SELECT * FROM servers WHERE id = ? AND owner_id = ?',
            [serverId, user.id]
          )

          if (!server) return

          // Send command to Minecraft server via Docker exec
          const containerName = `mc_${serverId.replace(/-/g, '_')}`
          try {
            const container = docker.getContainer(containerName)
            const exec = await container.exec({
              Cmd: ['rcon-cli', command],
              AttachStdout: true,
              AttachStderr: true
            })
            await exec.start({ hijack: true, stdin: false })
            safeSend(ws, { type: 'log', message: `> ${command}` })
          } catch (err: any) {
            safeSend(ws, { 
              type: 'error', 
              message: `Command failed: ${err.message}` 
            })
          }
        }

      } catch (err) {
        safeSend(ws, { type: 'error', message: 'Invalid message format' })
      }
    })

    ws.on('close', () => {
      console.log('WebSocket client disconnected')
    })

    ws.on('error', (err) => {
      console.error('WebSocket error:', err)
    })

    // Send welcome message
    safeSend(ws, { type: 'connected', message: 'WebSocket connected' })
  })

  console.log('✅ WebSocket server initialized')
}