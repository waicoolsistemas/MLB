import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const statEntrySchema = z.object({
  player_id: z.string().uuid(),
  team_id: z.string().uuid(),
  at_bats: z.number().int().min(0).default(0),
  hits: z.number().int().min(0).default(0),
  doubles: z.number().int().min(0).default(0),
  triples: z.number().int().min(0).default(0),
  home_runs: z.number().int().min(0).default(0),
  walks: z.number().int().min(0).default(0),
  strikeouts: z.number().int().min(0).default(0),
  runs: z.number().int().min(0).default(0),
  rbi: z.number().int().min(0).default(0),
})

const saveStatsSchema = z.object({
  stats: z.array(statEntrySchema),
})

const forfeitSchema = z.object({
  forfeit_team_id: z.string().uuid(),
  winner_runs: z.number().int().min(0),
  winner_player_ids: z.array(z.string().uuid()).min(1),
})

router.get('/categories/:categoryId/teams/:teamId/player-stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await db.rpc('get_player_stats_by_team', {
      p_category_id: req.params.categoryId,
      p_team_id: req.params.teamId,
    })

    if (error) throw error

    return res.json({ stats: data || [] })
  } catch (err) {
    console.error('Player stats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/categories/:categoryId/stats/summary', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: games } = await db
      .from('games')
      .select('id')
      .eq('category_id', req.params.categoryId)
      .is('playoff_series_id', null)
      .is('deleted_at', null)

    if (!games || games.length === 0) return res.json({ gamesWithStats: [] })

    const gameIds = games.map(g => g.id)

    const { data: rows, error } = await db
      .from('game_player_stats')
      .select('game_id')
      .in('game_id', gameIds)

    if (error) throw error

    const uniqueGameIds = [...new Set((rows || []).map(r => r.game_id))]
    return res.json({ gamesWithStats: uniqueGameIds })
  } catch (err) {
    console.error('Stats summary error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/games/:gameId/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: stats, error } = await db
      .from('game_player_stats')
      .select('*, player:players!game_player_stats_player_id_fkey(full_name)')
      .eq('game_id', req.params.gameId)
      .is('deleted_at', null)
      .order('created_at')

    if (error) throw error

    const formatted = (stats || []).map((s: Record<string, unknown>) => {
      const { player, ...rest } = s
      return {
        ...rest,
        player_name: (player as { full_name: string } | null)?.full_name ?? '',
      }
    })

    return res.json({ stats: formatted })
  } catch (err) {
    console.error('Get game stats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/games/:gameId/stats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { stats: entries } = saveStatsSchema.parse(req.body)

    const { data, error } = await db.rpc('save_game_stats', {
      p_game_id: req.params.gameId,
      p_stats: entries,
    })

    if (error) throw error

    return res.json({ stats: data || [] })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Save game stats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/games/:gameId/forfeit', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { forfeit_team_id, winner_runs, winner_player_ids } = forfeitSchema.parse(req.body)

    const { data, error } = await db.rpc('process_forfeit', {
      p_game_id: req.params.gameId,
      p_forfeit_team_id: forfeit_team_id,
      p_winner_runs: winner_runs,
      p_winner_player_ids: winner_player_ids,
    })

    if (error) throw error

    return res.json(data)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Save forfeit error:', err)
    let errMsg = 'Error desconocido'
    if (err instanceof Error) {
      errMsg = err.message
    } else if (err && typeof err === 'object') {
      const e = err as Record<string, unknown>
      errMsg = (e.message as string) || (e.details as string) || (e.hint as string) || JSON.stringify(err)
    }
    return res.status(500).json({ error: `Error al guardar forfeit: ${errMsg}` })
  }
})

export default router
