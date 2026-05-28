import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth'
import { dbGet, dbRun } from '../db/database'
import {
  startMinecraftServer,
  stopMinecraftServer,
  restartMinecraftServer,
  deleteMinecraftServer,
  getContainerStats
} from '../services/docker'

const router = Router()
router.use(authenticateToken)

function getUserServer(serverId: string, userId: string) {
  return dbGet(
    'SELECT * FROM servers WHERE id = ? AND owner_id = ?',
    [serverId, userId]
  )
}

// POST /api/servers/:id/start
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }
    if (server.status === 'running') {
      res.status(400).json({ success: false, error: 'Server is already running' })
      return
    }

    dbRun('UPDATE servers SET status = ? WHERE id = ?', ['creating', id])

    startMinecraftServer(id).catch((err) => {
      console.error('Failed to start server:', err)
      dbRun('UPDATE servers SET status = ? WHERE id = ?', ['error', id])
    })

    res.json({ success: true, data: { message: 'Server starting...' } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/servers/:id/stop
router.post('/:id/stop', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }

    await stopMinecraftServer(id)
    res.json({ success: true, data: { message: 'Server stopped' } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// POST /api/servers/:id/restart
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }

    await restartMinecraftServer(id)
    res.json({ success: true, data: { message: 'Server restarted' } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/servers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }

    await deleteMinecraftServer(id)
    dbRun('DELETE FROM servers WHERE id = ?', [id])
    res.json({ success: true, data: { message: 'Server deleted' } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/servers/:id/stats
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = getUserServer(id, req.user!.id)
    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }

    const stats = await getContainerStats(id)
    res.json({ success: true, data: stats })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router 