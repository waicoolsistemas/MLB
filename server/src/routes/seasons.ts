import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const timeSlotRegex = /^([01]\d|2[0-3]):[0-5]\d$/

const seasonSchema = z.object({
  name: z.string().min(2, 'Season name must be at least 2 characters'),
  start_date: z.string().nullable().optional().default(null),
  end_date: z.string().nullable().optional().default(null),
  is_active: z.boolean().optional().default(true),
  schedule_type: z.enum(['dominical', 'semanal', 'custom']).optional().default('custom'),
  schedule_days: z.array(z.number().int().min(0).max(6)).optional(),
  games_per_day: z.number().int().min(1).optional().default(1),
  default_time_slots: z.array(z.string().regex(timeSlotRegex, 'Time must be HH:MM format')).optional().default([]),
})

function resolveScheduleDays(scheduleType: string, customDays?: number[]): number[] {
  if (scheduleType === 'dominical') return [0]
  if (scheduleType === 'semanal') return [1, 2, 3, 4, 5]
  if (customDays && customDays.length > 0) return customDays
  return [0, 1, 2, 3, 4, 5, 6]
}

async function canManageLeague(userId: string, role: string, leagueId: string): Promise<boolean> {
  if (role === 'super_admin') return true

  const { data: adminRecord } = await db
    .from('league_admins')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return !!adminRecord
}

router.get('/leagues/:leagueId/seasons', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageLeague(req.user!.sub, req.user!.role, req.params.leagueId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: seasons, error } = await db
      .from('seasons')
      .select('*')
      .eq('league_id', req.params.leagueId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const seasonsWithCount = await Promise.all(
      (seasons || []).map(async (season) => {
        const { count } = await db
          .from('categories')
          .select('id', { count: 'exact', head: true })
          .eq('season_id', season.id)

        return { ...season, categories_count: count || 0 }
      })
    )

    return res.json({ seasons: seasonsWithCount })
  } catch (err) {
    console.error('List seasons error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/leagues/:leagueId/seasons', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageLeague(req.user!.sub, req.user!.role, req.params.leagueId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = seasonSchema.parse(req.body)
    const scheduleDays = resolveScheduleDays(data.schedule_type!, data.schedule_days)

    const { data: season, error } = await db
      .from('seasons')
      .insert({
        league_id: req.params.leagueId,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        is_active: data.is_active,
        schedule_type: data.schedule_type,
        schedule_days: scheduleDays,
        games_per_day: data.games_per_day,
        default_time_slots: data.default_time_slots,
        created_by: req.user!.sub,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({ season })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create season error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/seasons/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: season } = await db
      .from('seasons')
      .select('league_id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!season) return res.status(404).json({ error: 'Season not found' })

    const allowed = await canManageLeague(req.user!.sub, req.user!.role, season.league_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = seasonSchema.partial().parse(req.body)

    const updatePayload: Record<string, unknown> = {}
    if (data.name !== undefined) updatePayload.name = data.name
    if (data.start_date !== undefined) updatePayload.start_date = data.start_date
    if (data.end_date !== undefined) updatePayload.end_date = data.end_date
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active
    if (data.schedule_type !== undefined) {
      updatePayload.schedule_type = data.schedule_type
      updatePayload.schedule_days = resolveScheduleDays(data.schedule_type, data.schedule_days)
    } else if (data.schedule_days !== undefined) {
      updatePayload.schedule_days = data.schedule_days
    }
    if (data.games_per_day !== undefined) updatePayload.games_per_day = data.games_per_day
    if (data.default_time_slots !== undefined) updatePayload.default_time_slots = data.default_time_slots

    const { data: updated, error } = await db
      .from('seasons')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error

    return res.json({ season: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update season error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
