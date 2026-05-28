import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { dbRun, dbGet, dbAll } from '../db/database'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body

    if (!email || !username || !password) {
      res.status(400).json({ success: false, error: 'Email, username and password are required' })
      return
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters' })
      return
    }

    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email])
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const id = uuidv4()

    const userCount = dbGet('SELECT COUNT(*) as count FROM users', [])
    const role = (userCount?.count === 0 || userCount?.count === '0') ? 'admin' : 'user'

    dbRun(
      'INSERT INTO users (id, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [id, email, username, passwordHash, role]
    )

    const token = jwt.sign(
      { id, email, role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    res.status(201).json({
      success: true,
      data: { token, user: { id, email, username, role } }
    })

  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' })
      return
    }

    const user = dbGet('SELECT * FROM users WHERE email = ?', [email])

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      data: { token, user: { id: user.id, email: user.email, username: user.username, role: user.role } }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      res.status(401).json({ success: false, error: 'No token' })
      return
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any
    const user = dbGet('SELECT id, email, username, role, created_at FROM users WHERE id = ?', [decoded.id])

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' })
      return
    }

    res.json({ success: true, data: user })
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid token' })
  }
})

export default router