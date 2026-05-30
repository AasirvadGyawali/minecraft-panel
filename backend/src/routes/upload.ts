import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import Docker from 'dockerode'
import { authenticateToken } from '../middleware/auth'
import { dbGet } from '../db/database'

const router = Router()
const docker = new Docker()

router.use(authenticateToken)

// Configure multer — store uploads temporarily in backend/uploads/
const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    // Keep original filename but add timestamp to avoid conflicts
    const timestamp = Date.now()
    cb(null, `${timestamp}-${file.originalname}`)
  }
})

// Only allow .jar and .zip files
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.jar', '.zip']
  const ext = path.extname(file.originalname).toLowerCase()
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Only .jar and .zip files are allowed'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
})

function getContainerName(serverId: string): string {
  return `mc_${serverId.replace(/-/g, '_')}`
}

function getUserServer(serverId: string, userId: string) {
  return dbGet(
    'SELECT * FROM servers WHERE id = ? AND owner_id = ?',
    [serverId, userId]
  )
}

// POST /api/servers/:id/upload
// Uploads a plugin/mod jar into the server's plugins folder
router.post('/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
  const tempFilePath = req.file?.path

  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)

    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }

    if (server.status !== 'running') {
      res.status(400).json({ 
        success: false, 
        error: 'Server must be running to upload files' 
      })
      return
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' })
      return
    }

    const containerName = getContainerName(id)
    const container = docker.getContainer(containerName)

    // Determine target folder based on server type and file
    // Paper/Spigot servers use /data/plugins/
    // Forge/Fabric servers use /data/mods/
    const targetFolder = (server.type === 'forge' || server.type === 'fabric')
      ? '/data/mods'
      : '/data/plugins'

    // Create the target directory if it doesn't exist
    const exec = await container.exec({
      Cmd: ['mkdir', '-p', targetFolder],
      AttachStdout: true,
      AttachStderr: true,
    })
    await exec.start({ hijack: true, stdin: false })

    // Copy file into container using Docker cp
    const targetPath = `${targetFolder}/${req.file.originalname}`
    
    // Read the file and put it into the container
    const fileContent = fs.readFileSync(tempFilePath!)
    
    await new Promise<void>((resolve, reject) => {
      container.putArchive(
        require('archiver') ? createTar(tempFilePath!, req.file!.originalname) : fs.createReadStream(tempFilePath!),
        { path: targetFolder },
        (err: any) => {
          if (err) reject(err)
          else resolve()
        }
      )
    }).catch(async () => {
      // Fallback: use docker exec to write file via base64
      const base64 = fileContent.toString('base64')
      const writeExec = await container.exec({
        Cmd: ['sh', '-c', `echo "${base64}" | base64 -d > "${targetPath}"`],
        AttachStdout: true,
        AttachStderr: true,
      })
      await writeExec.start({ hijack: true, stdin: false })
    })

    console.log(`📦 Uploaded ${req.file.originalname} to ${containerName}:${targetFolder}`)

    res.json({
      success: true,
      data: {
        message: `${req.file.originalname} uploaded successfully`,
        path: targetPath,
        size: req.file.size,
        folder: targetFolder
      }
    })

  } catch (error: any) {
    console.error('Upload error:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Upload failed: ' + error.message 
    })
  } finally {
    // Always clean up the temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath)
    }
  }
})

// Helper — create a tar archive for docker putArchive
function createTar(filePath: string, filename: string): any {
  const tar = require('tar-stream')
  const pack = tar.pack()
  const fileContent = fs.readFileSync(filePath)
  
  pack.entry({ name: filename, size: fileContent.length }, fileContent, (err: any) => {
    if (err) throw err
    pack.finalize()
  })
  
  return pack
}

// GET /api/servers/:id/plugins — list installed plugins
router.get('/:id/plugins', async (req: Request, res: Response) => {
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

    const containerName = getContainerName(id)
    const container = docker.getContainer(containerName)

    const targetFolder = (server.type === 'forge' || server.type === 'fabric')
      ? '/data/mods'
      : '/data/plugins'

    const exec = await container.exec({
      Cmd: ['find', targetFolder, '-maxdepth', '1', '-name', '*.jar', '-printf', '%f\t%s\n'],
      AttachStdout: true,
      AttachStderr: true,
    })

    const stream = await exec.start({ hijack: true, stdin: false })
    
    const output = await new Promise<string>((resolve) => {
      let data = ''
      stream.on('data', (chunk: Buffer) => {
        let offset = 0
        while (offset < chunk.length) {
          if (chunk.length < offset + 8) break
          const size = chunk.readUInt32BE(offset + 4)
          data += chunk.slice(offset + 8, offset + 8 + size).toString('utf8')
          offset += 8 + size
        }
      })
      stream.on('end', () => resolve(data))
      stream.on('error', () => resolve(''))
    })

    const plugins = output.split('\n')
      .filter(Boolean)
      .map(line => {
        const parts = line.split('\t')
        return {
          name: parts[0],
          size: parseInt(parts[1]) || 0,
          path: `${targetFolder}/${parts[0]}`
        }
      })

    res.json({ success: true, data: { plugins, folder: targetFolder } })

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router