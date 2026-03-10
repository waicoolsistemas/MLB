import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const matchdaySchema = z.object({
  number: z.number().int().min(1).optional(),
  name: z.string().nullable().optional(),
  game_date: z.string().nullable().optional(),
  game_time: z.string().nullable().optional(),
  location: z.string().optional().default(''),
  games: z.array(z.object({
    home_team_id: z.string().uuid(),
    away_team_id: z.string().uuid(),
    game_date: z.string().nullable().optional(),
    game_time: z.string().nullable().optional(),
    location: z.string().optional().default(''),
    notes: z.string().optional().default(''),
  })).optional(),
})

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

router.get('/categories/:categoryId/matchdays', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: matchdays, error } = await db
      .from('matchdays')
      .select('*')
      .eq('category_id', req.params.categoryId)
      .is('deleted_at', null)
      .order('number')

    if (error) throw error

    const { data: gameCounts, error: countError } = await db
      .from('games')
      .select('matchday_id')
      .eq('category_id', req.params.categoryId)
      .is('deleted_at', null)
      .is('playoff_series_id', null)
      .not('matchday_id', 'is', null)

    if (countError) throw countError

    const countMap = new Map<string, number>()
    for (const g of gameCounts || []) {
      if (g.matchday_id) {
        countMap.set(g.matchday_id, (countMap.get(g.matchday_id) || 0) + 1)
      }
    }

    const formatted = (matchdays || []).map(m => ({
      ...m,
      games_count: countMap.get(m.id) || 0,
    }))

    return res.json({ matchdays: formatted })
  } catch (err) {
    console.error('List matchdays error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/categories/:categoryId/matchdays', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = matchdaySchema.parse(req.body)

    let mdNumber = data.number
    if (!mdNumber) {
      const { data: maxRow } = await db
        .from('matchdays')
        .select('number')
        .eq('category_id', req.params.categoryId)
        .is('deleted_at', null)
        .order('number', { ascending: false })
        .limit(1)
        .maybeSingle()

      mdNumber = (maxRow?.number ?? 0) + 1
    }

    const { data: existing } = await db
      .from('matchdays')
      .select('id')
      .eq('category_id', req.params.categoryId)
      .eq('number', mdNumber)
      .is('deleted_at', null)
      .maybeSingle()

    if (existing) {
      return res.status(400).json({ error: `La jornada ${mdNumber} ya existe` })
    }

    const { data: matchday, error } = await db
      .from('matchdays')
      .insert({
        category_id: req.params.categoryId,
        number: mdNumber,
        name: data.name || null,
        game_date: data.game_date || null,
        game_time: data.game_time || null,
        location: data.location || '',
      })
      .select('*')
      .single()

    if (error) throw error

    if (data.games && data.games.length > 0) {
      const gamesToInsert = data.games.map(g => ({
        category_id: req.params.categoryId,
        matchday_id: matchday.id,
        matchday: mdNumber!,
        home_team_id: g.home_team_id,
        away_team_id: g.away_team_id,
        game_date: g.game_date || data.game_date || null,
        game_time: g.game_time || data.game_time || null,
        location: g.location || data.location || '',
        notes: g.notes || '',
        status: 'scheduled' as const,
      }))

      const { error: gamesError } = await db
        .from('games')
        .insert(gamesToInsert)

      if (gamesError) throw gamesError
    }

    return res.status(201).json({ matchday: { ...matchday, games_count: data.games?.length || 0 } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create matchday error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/matchdays/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: matchday } = await db
      .from('matchdays')
      .select('id, category_id, number')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!matchday) return res.status(404).json({ error: 'Jornada no encontrada' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, matchday.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const schema = z.object({
      number: z.number().int().min(1).optional(),
      name: z.string().nullable().optional(),
      game_date: z.string().nullable().optional(),
      game_time: z.string().nullable().optional(),
      location: z.string().optional(),
    })

    const data = schema.parse(req.body)

    if (data.number !== undefined && data.number !== matchday.number) {
      const { data: existing } = await db
        .from('matchdays')
        .select('id')
        .eq('category_id', matchday.category_id)
        .eq('number', data.number)
        .neq('id', req.params.id)
        .is('deleted_at', null)
        .maybeSingle()

      if (existing) {
        return res.status(400).json({ error: `La jornada ${data.number} ya existe` })
      }
    }

    const updatePayload: Record<string, unknown> = {}
    if (data.number !== undefined) updatePayload.number = data.number
    if (data.name !== undefined) updatePayload.name = data.name || null
    if (data.game_date !== undefined) updatePayload.game_date = data.game_date || null
    if (data.game_time !== undefined) updatePayload.game_time = data.game_time || null
    if (data.location !== undefined) updatePayload.location = data.location

    const { data: updated, error } = await db
      .from('matchdays')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error
    

    if (data.number !== undefined && data.number !== matchday.number) {
      await db
        .from('games')
        .update({ matchday: data.number })
        .eq('matchday_id', req.params.id)
        .is('deleted_at', null)
    }

    return res.json({ matchday: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update matchday error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/matchdays/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: matchday } = await db
      .from('matchdays')
      .select('id, category_id')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!matchday) return res.status(404).json({ error: 'Jornada no encontrada' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, matchday.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data, error } = await db.rpc('soft_delete_matchday', {
      p_matchday_id: req.params.id,
    })

    if (error) throw error

    return res.json({ message: 'Jornada eliminada', deleted_games_count: data || 0 })
  } catch (err) {
    console.error('Delete matchday error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
