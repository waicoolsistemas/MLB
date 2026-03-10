import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db.js'
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  verifyAccessToken,
} from '../jwt.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'
import type { User } from '../types.js'

const router = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.enum(['manager', 'player']).default('player'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body)

    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const password_hash = await bcrypt.hash(data.password, 12)

    const { data: user, error } = await db
      .from('users')
      .insert({
        email: data.email,
        password_hash,
        full_name: data.full_name,
        role: data.role,
      })
      .select('id, email, full_name, role, is_active, created_at')
      .single()

    if (error) throw error

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    })

    const refreshToken = generateRefreshToken()
    const expiresAt = getRefreshTokenExpiry()

    await db.from('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt.toISOString(),
    })

    return res.status(201).json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Register error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body)

    const { data: user, error } = await db
      .from('users')
      .select('id, email, password_hash, full_name, role, is_active')
      .eq('email', data.email)
      .maybeSingle()

    if (error) throw error

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' })
    }

    const passwordValid = await bcrypt.compare(data.password, user.password_hash)
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    })

   const refreshToken = generateRefreshToken()
    const expiresAt = getRefreshTokenExpiry()

     await db.from('refresh_tokens').insert({
      user_id: user.id,
      token: refreshToken,
      expires_at: expiresAt.toISOString(),
    })

    return res.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
      access_token: accessToken,
      refresh_token: refreshToken,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' })
    }

    const { data, error } = await db.rpc('refresh_user_token', {
      p_token: refresh_token,
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('INVALID_TOKEN')) {
        return res.status(401).json({ error: 'Invalid refresh token' })
      }
      if (msg.includes('TOKEN_REVOKED')) {
        return res.status(401).json({ error: 'Refresh token has been revoked' })
      }
      if (msg.includes('TOKEN_EXPIRED')) {
        return res.status(401).json({ error: 'Refresh token expired' })
      }
      if (msg.includes('USER_INACTIVE')) {
        return res.status(401).json({ error: 'User not found or deactivated' })
      }
      throw error
    }

    const newAccessToken = generateAccessToken({
      sub: data.user_id,
      email: data.email,
      role: data.role,
      full_name: data.full_name,
    })

    return res.json({
      user: { id: data.user_id, email: data.email, full_name: data.full_name, role: data.role },
      access_token: newAccessToken,
      refresh_token: data.new_refresh_token,
    })
  } catch (err) {
    console.error('Refresh error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/logout', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { refresh_token } = req.body

    if (refresh_token) {
      await db
        .from('refresh_tokens')
        .update({ revoked: true })
        .eq('token', refresh_token)
        .eq('user_id', req.user!.sub)
    }

    return res.json({ message: 'Logged out successfully' })
  } catch (err) {
    console.error('Logout error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: user } = await db
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .eq('id', req.user!.sub)
      .maybeSingle()

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json({ user })
  } catch (err) {
    console.error('Me error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
