import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

// This middleware runs BEFORE route handlers
// It checks if the request has a valid JWT token
// If valid: attaches user info to req and calls next()
// If invalid: returns 401 Unauthorized immediately

interface JwtPayload {
  id: string
  email: string
  role: string
}

// We extend Express's Request type to add our user field
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Token comes in the Authorization header as: "Bearer <token>"
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // get part after "Bearer "

  if (!token) {
    res.status(401).json({ success: false, error: 'No token provided' })
    return
  }

  try {
    // Verify the token using our secret key
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback-secret'
    ) as JwtPayload

    req.user = decoded // attach user data to request
    next() // continue to the route handler
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

// Admin-only middleware — use AFTER authenticateToken
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' })
    return
  }
  next()
}