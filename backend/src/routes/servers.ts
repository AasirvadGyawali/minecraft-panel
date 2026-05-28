import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { dbRun, dbGet, dbAll } from '../db/database'
import { authenticateToken } from '../middleware/auth'

const router = Router()
router.use(authenticateToken)

router.get('/', (req: Request, res: Response) => {
  try {
    const servers = dbAll('SELECT * FROM servers WHERE owner_id = ?', [req.user!.id])
    res.json({ success: true, data: servers })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch servers' })
  }
})

router.post('/', (req: Request, res: Response) => {
  try {
    const { name, type, version, memoryMb } = req.body

    if (!name || !type || !version) {
      res.status(400).json({ success: false, error: 'Name, type and version are required' })
      return
    }

    const usedPorts = dbAll('SELECT port FROM servers', [])
    let port = 25565
    const portSet = new Set(usedPorts.map((s: any) => s.port))
    while (portSet.has(port)) port++

    const id = uuidv4()
    dbRun(
      'INSERT INTO servers (id, owner_id, name, type, version, port, memory_mb, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.user!.id, name, type, version, port, memoryMb || 1024, 'stopped']
    )

    const server = dbGet('SELECT * FROM servers WHERE id = ?', [id])
    res.status(201).json({ success: true, data: server })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create server' })
  }
})

router.get('/:id', (req: Request, res: Response) => {
  try {
    const server = dbGet('SELECT * FROM servers WHERE id = ? AND owner_id = ?', [req.params.id, req.user!.id])
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }
    res.json({ success: true, data: server })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch server' })
  }
})

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const server = dbGet('SELECT * FROM servers WHERE id = ? AND owner_id = ?', [req.params.id, req.user!.id])
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }
    dbRun('DELETE FROM servers WHERE id = ?', [req.params.id])
    res.json({ success: true, data: { message: 'Server deleted' } })
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete server' })
  }
})

export default router