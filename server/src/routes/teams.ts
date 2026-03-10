import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from '../db.js'
import { authenticateToken, requireRole } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const teamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  logo_url: z.string().optional().default(''),
  manager_name: z.string().optional().default(''),
  manager_phone: z.string().optional().default(''),
  manager_email: z.string().email().optional().or(z.literal('')).default(''),
  is_active: z.boolean().optional().default(true),
})

function generatePassword(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 10)
}

async function canManageCategory(userId: string, role: string, categoryId: string): Promise<boolean> {
  if (role === 'super_admin') return true

  const { data: category } = await db
    .from('categories')
    .select('season_id, seasons!inner(league_id)')
    .eq('id', categoryId)
    .maybeSingle()

  if (!category) return false

  const leagueId = (category.seasons as unknown as { league_id: string }).league_id

  const { data: adminRecord } = await db
    .from('league_admins')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return !!adminRecord
}

router.get('/categories/:categoryId/teams', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: teams, error } = await db
      .from('teams')
      .select('*, players(count), manager_user:users!teams_manager_user_id_fkey(id, email, full_name)')
      .eq('category_id', req.params.categoryId)
      .order('name')

    if (error) throw error

    const teamsWithCount = (teams || []).map(t => {
      const { players, manager_user, ...rest } = t as Record<string, unknown>
      return {
        ...rest,
        players_count: Array.isArray(players) && players.length > 0 ? (players[0] as { count: number }).count : 0,
        manager_email: (manager_user as { email: string } | null)?.email ?? '',
      }
    })

    return res.json({ teams: teamsWithCount })
  } catch (err) {
    console.error('List teams error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/categories/:categoryId/teams', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = teamSchema.parse(req.body)

    let managerUserId: string | null = null
    let managerPassword: string | null = null

    if (data.manager_email) {
      const { data: existingUser } = await db
        .from('users')
        .select('id, role')
        .eq('email', data.manager_email)
        .maybeSingle()

      if (existingUser) {
        if (existingUser.role !== 'manager') {
          return res.status(400).json({ error: 'El email ya esta registrado con un rol diferente a manager' })
        }
        managerUserId = existingUser.id
      } else {
        managerPassword = generatePassword()
        const passwordHash = await bcrypt.hash(managerPassword, 12)

        const { data: newUser, error: userError } = await db
          .from('users')
          .insert({
            email: data.manager_email,
            password_hash: passwordHash,
            full_name: data.manager_name || data.manager_email.split('@')[0],
            role: 'manager',
          })
          .select('id')
          .single()

        if (userError) throw userError
        managerUserId = newUser.id
      }
    }

    const { data: team, error } = await db
      .from('teams')
      .insert({
        category_id: req.params.categoryId,
        name: data.name,
        logo_url: data.logo_url,
        manager_name: data.manager_name,
        manager_phone: data.manager_phone,
        manager_user_id: managerUserId,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({
      team,
      manager_credentials: managerPassword
        ? { email: data.manager_email, password: managerPassword }
        : null,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create team error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/teams/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: team } = await db
      .from('teams')
      .select('category_id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!team) return res.status(404).json({ error: 'Team not found' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, team.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = teamSchema.partial().parse(req.body)

    const updatePayload: Record<string, unknown> = {}
    if (data.name !== undefined) updatePayload.name = data.name
    if (data.logo_url !== undefined) updatePayload.logo_url = data.logo_url
    if (data.manager_name !== undefined) updatePayload.manager_name = data.manager_name
    if (data.manager_phone !== undefined) updatePayload.manager_phone = data.manager_phone
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active

    const { data: updated, error } = await db
      .from('teams')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error

    return res.json({ team: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update team error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/teams/:teamId/reset-manager-password', authenticateToken, requireRole('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data, error } = await db.rpc('reset_manager_password', {
      p_team_id: req.params.teamId,
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('TEAM_NOT_FOUND')) return res.status(404).json({ error: 'Equipo no encontrado' })
      if (msg.includes('NO_MANAGER_LINKED')) return res.status(400).json({ error: 'Este equipo no tiene un manager vinculado' })
      if (msg.includes('MANAGER_USER_NOT_FOUND')) return res.status(400).json({ error: 'Usuario manager no encontrado' })
      throw error
    }

    return res.json({
      credentials: {
        email: data.email,
        password: data.password,
      },
    })
  } catch (err) {
    console.error('Reset manager password error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
