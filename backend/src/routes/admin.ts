import { Router, Request, Response } from 'express'
import { authenticateToken, requireAdmin } from '../middleware/auth'
import { dbGet, dbAll, dbRun } from '../db/database'
import Docker from 'dockerode'

const router = Router()
const docker = new Docker()

// Both middlewares required — must be logged in AND be admin
router.use(authenticateToken)
router.use(requireAdmin)

// GET /api/admin/stats — platform overview
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const totalUsers = dbGet('SELECT COUNT(*) as count FROM users', [])
    const totalServers = dbGet('SELECT COUNT(*) as count FROM servers', [])
    const runningServers = dbGet(
      'SELECT COUNT(*) as count FROM servers WHERE status = ?',
      ['running']
    )
    const stoppedServers = dbGet(
      'SELECT COUNT(*) as count FROM servers WHERE status = ?',
      ['stopped']
    )

    // Get Docker system info
    let dockerInfo: any = {}
    try {
      dockerInfo = await docker.info()
    } catch {
      dockerInfo = {}
    }

    res.json({
      success: true,
      data: {
        users: totalUsers?.count || 0,
        servers: {
          total: totalServers?.count || 0,
          running: runningServers?.count || 0,
          stopped: stoppedServers?.count || 0,
        },
        docker: {
          containers: dockerInfo.Containers || 0,
          images: dockerInfo.Images || 0,
          memTotal: dockerInfo.MemTotal || 0,
        }
      }
    })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/admin/users — list all users
router.get('/users', (req: Request, res: Response) => {
  try {
    const users = dbAll(
      `SELECT 
        u.id, u.email, u.username, u.role, u.created_at,
        COUNT(s.id) as server_count
       FROM users u
       LEFT JOIN servers s ON s.owner_id = u.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      []
    )
    res.json({ success: true, data: users })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// GET /api/admin/servers — list all servers
router.get('/servers', (req: Request, res: Response) => {
  try {
    const servers = dbAll(
      `SELECT 
        s.*,
        u.username as owner_name,
        u.email as owner_email
       FROM servers s
       JOIN users u ON u.id = s.owner_id
       ORDER BY s.created_at DESC`,
      []
    )
    res.json({ success: true, data: servers })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/admin/users/:id — delete a user
router.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)

    // Prevent admin from deleting themselves
    if (id === req.user!.id) {
      res.status(400).json({ 
        success: false, 
        error: 'Cannot delete your own account' 
      })
      return
    }

    const user = dbGet('SELECT * FROM users WHERE id = ?', [id])
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    // Delete user (cascades to their servers due to FK)
    dbRun('DELETE FROM users WHERE id = ?', [id])
    res.json({ success: true, data: { message: 'User deleted' } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// PATCH /api/admin/users/:id/role — change user role
router.patch('/users/:id/role', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const { role } = req.body

    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role' })
      return
    }

    if (id === req.user!.id) {
      res.status(400).json({ 
        success: false, 
        error: 'Cannot change your own role' 
      })
      return
    }

    dbRun('UPDATE users SET role = ? WHERE id = ?', [role, id])
    res.json({ success: true, data: { message: 'Role updated' } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// DELETE /api/admin/servers/:id — force delete any server
router.delete('/servers/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const server = dbGet('SELECT * FROM servers WHERE id = ?', [id])

    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' })
      return
    }

    // Stop and remove Docker container
    const containerName = `mc_${id.replace(/-/g, '_')}`
    try {
      const container = docker.getContainer(containerName)
      const info = await container.inspect()
      if (info.State.Running) {
        await container.stop({ t: 5 })
      }
      await container.remove({ v: true })
    } catch {
      // Container might not exist — that's ok
    }

    dbRun('DELETE FROM servers WHERE id = ?', [id])
    res.json({ success: true, data: { message: 'Server deleted' } })
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router