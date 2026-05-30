import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth'
import { dbGet } from '../db/database'
import Docker from 'dockerode'

const router = Router()
const docker = new Docker()

router.use(authenticateToken)

function getContainerName(serverId: string): string {
  return `mc_${serverId.replace(/-/g, '_')}`
}

async function execInContainer(containerName: string, cmd: string[]): Promise<string> {
  const container = docker.getContainer(containerName)
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  })
  const stream = await exec.start({ hijack: true, stdin: false })
  return new Promise((resolve, reject) => {
    let output = ''
    stream.on('data', (chunk: Buffer) => {
      let offset = 0
      while (offset < chunk.length) {
        if (chunk.length < offset + 8) break
        const size = chunk.readUInt32BE(offset + 4)
        output += chunk.slice(offset + 8, offset + 8 + size).toString('utf8')
        offset += 8 + size
      }
    })
    stream.on('end', () => resolve(output))
    stream.on('error', reject)
  })
}

function getUserServer(serverId: string, userId: string) {
  return dbGet('SELECT * FROM servers WHERE id = ? AND owner_id = ?', [serverId, userId])
}

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const types: Record<string, string> = {
    'properties': 'config', 'yml': 'config', 'yaml': 'config',
    'json': 'json', 'txt': 'text', 'log': 'log',
    'jar': 'jar', 'zip': 'archive', 'gz': 'archive',
    'sh': 'script', 'toml': 'config',
  }
  return types[ext] || 'file'
}

// GET /api/servers/:id/files
router.get('/:id/files', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }
    if (server.status !== 'running') {
      res.status(400).json({ success: false, error: 'Server must be running to access files' })
      return
    }

    const filePath = String(req.query.path || '/data')
    if (filePath.includes('..') || !filePath.startsWith('/')) {
      res.status(400).json({ success: false, error: 'Invalid path' })
      return
    }

    const containerName = getContainerName(id)

    // Use find command for more reliable output
    const output = await execInContainer(containerName, [
      'find', filePath, '-maxdepth', '1', '-printf', '%f\t%y\t%s\t%T@\n'
    ])

    const lines = output.split('\n').filter(Boolean)
    const files: any[] = []

    for (const line of lines) {
      const parts = line.split('\t')
      if (parts.length < 3) continue

      const name = parts[0].trim()
      const type = parts[1].trim() // 'd' for directory, 'f' for file
      const size = parseInt(parts[2]) || 0

      if (!name || name === '.') continue
      // Skip the parent directory entry
      if (name === filePath.split('/').pop()) continue

      const isDirectory = type === 'd'

      files.push({
        name,
        path: `${filePath}/${name}`.replace('//', '/'),
        isDirectory,
        isSymlink: type === 'l',
        size,
        date: '',
        type: isDirectory ? 'directory' : getFileType(name)
      })
    }

    // Sort: directories first
    files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })

    res.json({ success: true, data: { path: filePath, files } })

  } catch (error: any) {
    console.error('File list error:', error)
    res.status(500).json({ success: false, error: 'Failed to list files: ' + error.message })
  }
})

// GET /api/servers/:id/files/content
router.get('/:id/files/content', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }
    if (server.status !== 'running') {
      res.status(400).json({ success: false, error: 'Server must be running' })
      return
    }

    const filePath = String(req.query.path || '')
    if (!filePath || filePath.includes('..') || !filePath.startsWith('/')) {
      res.status(400).json({ success: false, error: 'Invalid path' })
      return
    }

    const allowedExtensions = [
      '.properties', '.yml', '.yaml', '.json', '.txt',
      '.cfg', '.conf', '.log', '.toml', '.sh', '.md'
    ]
    const hasAllowedExt = allowedExtensions.some(ext => filePath.endsWith(ext))
    if (!hasAllowedExt) {
      res.status(400).json({ success: false, error: 'File type not supported for editing' })
      return
    }

    const containerName = getContainerName(id)
    const content = await execInContainer(containerName, ['cat', filePath])
    res.json({ success: true, data: { path: filePath, content } })

  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to read file: ' + error.message })
  }
})

// POST /api/servers/:id/files/content
router.post('/:id/files/content', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }
    if (server.status !== 'running') {
      res.status(400).json({ success: false, error: 'Server must be running' })
      return
    }

    const { path: filePath, content } = req.body
    if (!filePath || filePath.includes('..') || !filePath.startsWith('/')) {
      res.status(400).json({ success: false, error: 'Invalid path' })
      return
    }

    const containerName = getContainerName(id)
    const base64Content = Buffer.from(content).toString('base64')
    await execInContainer(containerName, [
      'sh', '-c', `echo "${base64Content}" | base64 -d > "${filePath}"`
    ])

    res.json({ success: true, data: { message: 'File saved successfully' } })

  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to save file: ' + error.message })
  }
})

export default router