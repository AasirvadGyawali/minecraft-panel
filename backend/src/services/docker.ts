import Docker from 'dockerode'
import { dbRun, dbGet } from '../db/database'

// Connect to Docker daemon
// On Windows with Docker Desktop, it uses a named pipe
const docker = new Docker()

const MINECRAFT_IMAGE = 'itzg/minecraft-server'

// Test Docker connection on startup
export async function testDockerConnection(): Promise<boolean> {
  try {
    await docker.ping()
    console.log('✅ Docker connection established')
    return true
  } catch (error) {
    console.error('❌ Docker connection failed:', error)
    return false
  }
}

// Create and start a new Minecraft server container
export async function startMinecraftServer(serverId: string): Promise<string> {
  const server = dbGet('SELECT * FROM servers WHERE id = ?', [serverId])
  
  if (!server) throw new Error('Server not found')

  const containerName = `mc_${serverId.replace(/-/g, '_')}`

  // Check if container already exists
  try {
    const existing = docker.getContainer(containerName)
    const info = await existing.inspect()
    
    if (info.State.Running) {
      throw new Error('Server is already running')
    }
    
    // Container exists but stopped — just start it
    await existing.start()
    dbRun(
      'UPDATE servers SET status = ?, container_id = ? WHERE id = ?',
      ['running', info.Id, serverId]
    )
    return info.Id
  } catch (err: any) {
    // If error is NOT "container not found", rethrow
    if (err.statusCode !== 404 && !err.message?.includes('No such container')) {
      throw err
    }
  }

  // Container doesn't exist — create a new one
  console.log(`🚀 Creating Minecraft container: ${containerName}`)

  const container = await docker.createContainer({
    name: containerName,
    Image: MINECRAFT_IMAGE,
    Env: [
      'EULA=TRUE',                              // Accept Minecraft EULA
      `MEMORY=${server.memory_mb}M`,            // Set memory limit
      `TYPE=${server.type.toUpperCase()}`,       // vanilla/paper/forge/fabric
      `VERSION=${server.version}`,              // Minecraft version
      'ONLINE_MODE=FALSE',                      // Allow cracked clients for testing
      'MAX_PLAYERS=20',
      'DIFFICULTY=normal',
    ],
    HostConfig: {
      // Port mapping: host port → container port
      PortBindings: {
        '25565/tcp': [{ HostPort: server.port.toString() }]
      },
      // Memory limit in bytes
      Memory: server.memory_mb * 1024 * 1024,
      // Restart policy
      RestartPolicy: { Name: 'unless-stopped' },
      // Mount a volume for persistent server data
      Binds: [
        `mc_data_${serverId}:/data`
      ]
    },
    ExposedPorts: {
      '25565/tcp': {}
    }
  })

  await container.start()
  
  const info = await container.inspect()

  // Update database with container ID and running status
  dbRun(
    'UPDATE servers SET status = ?, container_id = ? WHERE id = ?',
    ['running', info.Id, serverId]
  )

  console.log(`✅ Minecraft server started: ${containerName}`)
  return info.Id
}

// Stop a running Minecraft server
export async function stopMinecraftServer(serverId: string): Promise<void> {
  const server = dbGet('SELECT * FROM servers WHERE id = ?', [serverId])
  if (!server) throw new Error('Server not found')

  const containerName = `mc_${serverId.replace(/-/g, '_')}`

  try {
    const container = docker.getContainer(containerName)
    
    // Send stop signal (gives server 10 seconds to save)
    await container.stop({ t: 10 })
    
    dbRun(
      'UPDATE servers SET status = ? WHERE id = ?',
      ['stopped', serverId]
    )
    
    console.log(`⏹️ Minecraft server stopped: ${containerName}`)
  } catch (err: any) {
    if (err.statusCode === 404) {
      // Container doesn't exist — just update DB
      dbRun('UPDATE servers SET status = ? WHERE id = ?', ['stopped', serverId])
      return
    }
    throw err
  }
}

// Restart a Minecraft server
export async function restartMinecraftServer(serverId: string): Promise<void> {
  const server = dbGet('SELECT * FROM servers WHERE id = ?', [serverId])
  if (!server) throw new Error('Server not found')

  const containerName = `mc_${serverId.replace(/-/g, '_')}`

  try {
    const container = docker.getContainer(containerName)
    await container.restart({ t: 10 })
    
    dbRun(
      'UPDATE servers SET status = ? WHERE id = ?',
      ['running', serverId]
    )
    
    console.log(`↺ Minecraft server restarted: ${containerName}`)
  } catch (err: any) {
    if (err.statusCode === 404) {
      // Container gone — start fresh
      await startMinecraftServer(serverId)
      return
    }
    throw err
  }
}

// Delete a server's container and volume
export async function deleteMinecraftServer(serverId: string): Promise<void> {
  const containerName = `mc_${serverId.replace(/-/g, '_')}`

  try {
    const container = docker.getContainer(containerName)
    const info = await container.inspect()
    
    // Stop if running
    if (info.State.Running) {
      await container.stop({ t: 5 })
    }
    
    // Remove container
    await container.remove({ v: true })
    console.log(`🗑️ Container removed: ${containerName}`)
  } catch (err: any) {
    // Container doesn't exist — that's fine
    if (err.statusCode !== 404) {
      console.error('Error deleting container:', err)
    }
  }
}

// Get real-time stats for a running container
export async function getContainerStats(serverId: string): Promise<any> {
  const containerName = `mc_${serverId.replace(/-/g, '_')}`
  
  try {
    const container = docker.getContainer(containerName)
    const stats = await container.stats({ stream: false })
    
    // Calculate CPU percentage
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                     stats.precpu_stats.cpu_usage.total_usage
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                        stats.precpu_stats.system_cpu_usage
    const cpuPercent = (cpuDelta / systemDelta) * 100

    // Calculate memory usage
    const memUsage = stats.memory_stats.usage
    const memLimit = stats.memory_stats.limit
    const memPercent = (memUsage / memLimit) * 100

    return {
      cpu: cpuPercent.toFixed(1),
      memoryUsed: Math.round(memUsage / 1024 / 1024), // MB
      memoryLimit: Math.round(memLimit / 1024 / 1024), // MB
      memoryPercent: memPercent.toFixed(1)
    }
  } catch {
    return null
  }
}

export default docker