import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'
import { tryAdvanceSeries } from './playoffs.js'

const router = Router()

const gameSchema = z.object({
  home_team_id: z.string().uuid(),
  away_team_id: z.string().uuid(),
  matchday: z.number().int().min(1),
  matchday_id: z.string().uuid().nullable().optional(),
  game_date: z.string().nullable().optional(),
  game_time: z.string().nullable().optional(),
  location: z.string().optional().default(''),
  home_score: z.number().int().min(0).nullable().optional(),
  away_score: z.number().int().min(0).nullable().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'forfeit']).optional().default('scheduled'),
  notes: z.string().optional().default(''),
  forfeit_team_id: z.string().uuid().nullable().optional(),
  umpire_1: z.string().nullable().optional(),
  umpire_2: z.string().nullable().optional(),
  umpire_3: z.string().nullable().optional(),
  scorer: z.string().nullable().optional(),
})

const generateSchema = z.object({
  include_return: z.boolean().optional().default(false),
  start_date: z.string().nullable().optional(),
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

router.get('/categories/:categoryId/games', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: games, error } = await db
      .from('games')
      .select('*, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name), matchday_ref:matchdays(name)')
      .eq('category_id', req.params.categoryId)
      .is('playoff_series_id', null)
      .is('deleted_at', null)
      .order('matchday')
      .order('game_date', { nullsFirst: false })

    if (error) throw error

    const formatted = (games || []).map((g: Record<string, unknown>) => {
      const { home_team, away_team, matchday_ref, ...rest } = g
      return {
        ...rest,
        home_team_name: (home_team as { name: string } | null)?.name ?? 'Equipo eliminado',
        away_team_name: (away_team as { name: string } | null)?.name ?? 'Equipo eliminado',
        matchday_name: (matchday_ref as { name: string | null } | null)?.name ?? null,
      }
    })

    return res.json({ games: formatted })
  } catch (err) {
    console.error('List games error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/categories/:categoryId/games', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = gameSchema.parse(req.body)

    if (data.home_team_id === data.away_team_id) {
      return res.status(400).json({ error: 'El equipo local y visitante no pueden ser el mismo' })
    }

    const { data: homeTeam } = await db
      .from('teams')
      .select('id')
      .eq('id', data.home_team_id)
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    const { data: awayTeam } = await db
      .from('teams')
      .select('id')
      .eq('id', data.away_team_id)
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: 'Uno o ambos equipos no pertenecen a esta categoria' })
    }

    let matchdayId = data.matchday_id ?? null
    if (!matchdayId) {
      const { data: existingMd } = await db
        .from('matchdays')
        .select('id')
        .eq('category_id', req.params.categoryId)
        .eq('number', data.matchday)
        .is('deleted_at', null)
        .maybeSingle()

      if (existingMd) {
        matchdayId = existingMd.id
      } else {
        const { data: newMd } = await db
          .from('matchdays')
          .insert({ category_id: req.params.categoryId, number: data.matchday })
          .select('id')
          .single()
        if (newMd) matchdayId = newMd.id
      }
    }

    const { data: game, error } = await db
      .from('games')
      .insert({
        category_id: req.params.categoryId,
        home_team_id: data.home_team_id,
        away_team_id: data.away_team_id,
        matchday: data.matchday,
        matchday_id: matchdayId,
        game_date: data.game_date || null,
        game_time: data.game_time || null,
        location: data.location,
        home_score: data.home_score ?? null,
        away_score: data.away_score ?? null,
        status: data.status,
        notes: data.notes,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({ game })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create game error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/categories/:categoryId/games/generate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const opts = generateSchema.parse(req.body)

    const { data: teams, error: teamsError } = await db
      .from('teams')
      .select('id, name')
      .eq('category_id', req.params.categoryId)
      .eq('is_active', true)
      .order('name')

    if (teamsError) throw teamsError

    if (!teams || teams.length < 2) {
      return res.status(400).json({ error: 'Se necesitan al menos 2 equipos activos para generar el fixture' })
    }

    const teamList = [...teams]
    const hasBye = teamList.length % 2 !== 0
    if (hasBye) {
      teamList.push({ id: 'BYE', name: 'BYE' })
    }

    const n = teamList.length
    const rounds: { home: string; away: string }[][] = []

    for (let round = 0; round < n - 1; round++) {
      const matches: { home: string; away: string }[] = []
      for (let i = 0; i < n / 2; i++) {
        const home = i === 0 ? 0 : ((round + i - 1) % (n - 1)) + 1
        const away = ((round + (n / 2) - 1 - i) % (n - 1)) + 1

        const homeId = teamList[home === 0 ? 0 : home].id
        const awayId = teamList[away === 0 ? 0 : away].id

        if (homeId === 'BYE' || awayId === 'BYE') continue

        matches.push({
          home: round % 2 === 0 ? homeId : awayId,
          away: round % 2 === 0 ? awayId : homeId,
        })
      }
      rounds.push(matches)
    }

    const allRounds = [...rounds]
    if (opts.include_return) {
      rounds.forEach(roundMatches => {
        allRounds.push(roundMatches.map(m => ({ home: m.away, away: m.home })))
      })
    }

    if (allRounds.length === 0) {
      return res.status(400).json({ error: 'No se pudieron generar partidos' })
    }

    const now = new Date().toISOString()

    const { data: existingGameIds } = await db
      .from('games')
      .select('id')
      .eq('category_id', req.params.categoryId)
      .is('playoff_series_id', null)
      .is('deleted_at', null)

    if (existingGameIds && existingGameIds.length > 0) {
      const ids = existingGameIds.map(g => g.id)
      await db
        .from('game_player_stats')
        .update({ deleted_at: now })
        .in('game_id', ids)
        .is('deleted_at', null)
      await db
        .from('games')
        .update({ deleted_at: now })
        .in('id', ids)
    }

    await db
      .from('matchdays')
      .update({ deleted_at: now })
      .eq('category_id', req.params.categoryId)
      .is('deleted_at', null)

    const { data: categoryRow } = await db
      .from('categories')
      .select('season_id')
      .eq('id', req.params.categoryId)
      .maybeSingle()

    let scheduleDays = [0, 1, 2, 3, 4, 5, 6]
    let gamesPerDay = 1
    let timeSlots: string[] = []

    if (categoryRow) {
      const { data: seasonRow } = await db
        .from('seasons')
        .select('schedule_days, games_per_day, default_time_slots')
        .eq('id', categoryRow.season_id)
        .maybeSingle()

      if (seasonRow) {
        scheduleDays = seasonRow.schedule_days || scheduleDays
        gamesPerDay = seasonRow.games_per_day || 1
        timeSlots = seasonRow.default_time_slots || []
      }
    }

    function getNextValidDate(from: Date): Date {
      const d = new Date(from)
      for (let i = 0; i < 365; i++) {
        if (scheduleDays.includes(d.getDay())) return d
        d.setDate(d.getDate() + 1)
      }
      return d
    }

    function advanceToNextDay(from: Date): Date {
      const d = new Date(from)
      d.setDate(d.getDate() + 1)
      return getNextValidDate(d)
    }

    function formatDate(d: Date): string {
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    interface MatchdaySchedule {
      gameDate: string | null
      games: { home: string; away: string; gameTime: string | null }[]
    }

    const matchdaySchedules: MatchdaySchedule[] = []

    if (opts.start_date) {
      const startParts = opts.start_date.split('-').map(Number)
      let currentDate = getNextValidDate(new Date(startParts[0], startParts[1] - 1, startParts[2]))
      let slotIndex = 0

      for (const roundMatches of allRounds) {
        const schedule: MatchdaySchedule = { gameDate: formatDate(currentDate), games: [] }

        for (const m of roundMatches) {
          if (slotIndex >= gamesPerDay) {
            currentDate = advanceToNextDay(currentDate)
            slotIndex = 0
            schedule.gameDate = formatDate(currentDate)
          }
          const gameTime = slotIndex < timeSlots.length ? timeSlots[slotIndex] : null
          schedule.games.push({ home: m.home, away: m.away, gameTime })
          slotIndex++
        }

        matchdaySchedules.push(schedule)
        currentDate = advanceToNextDay(currentDate)
        slotIndex = 0
      }
    } else {
      for (const roundMatches of allRounds) {
        matchdaySchedules.push({
          gameDate: null,
          games: roundMatches.map(m => ({ home: m.home, away: m.away, gameTime: null })),
        })
      }
    }

    const matchdayInserts = matchdaySchedules.map((sched, idx) => ({
      category_id: req.params.categoryId,
      number: idx + 1,
      game_date: sched.gameDate,
    }))

    const { data: insertedMatchdays, error: mdError } = await db
      .from('matchdays')
      .insert(matchdayInserts)
      .select('id, number')

    if (mdError) throw mdError

    const mdMap = new Map<number, string>()
    for (const md of insertedMatchdays || []) {
      mdMap.set(md.number, md.id)
    }

    const gamesToInsert = matchdaySchedules.flatMap((sched, roundIndex) =>
      sched.games.map(g => ({
        category_id: req.params.categoryId,
        home_team_id: g.home,
        away_team_id: g.away,
        matchday: roundIndex + 1,
        matchday_id: mdMap.get(roundIndex + 1) || null,
        game_date: sched.gameDate,
        game_time: g.gameTime,
        status: 'scheduled' as const,
      }))
    )

    if (gamesToInsert.length === 0) {
      return res.status(400).json({ error: 'No se pudieron generar partidos' })
    }

    const { error: insertError } = await db
      .from('games')
      .insert(gamesToInsert)

    if (insertError) throw insertError

    await db
      .from('categories')
      .update({ fixture_generated: true })
      .eq('id', req.params.categoryId)

    return res.status(201).json({
      message: `Se generaron ${gamesToInsert.length} partidos en ${allRounds.length} jornadas`,
      count: gamesToInsert.length,
      matchdays: allRounds.length,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Generate games error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/games/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: game } = await db
      .from('games')
      .select('category_id, playoff_series_id')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (!game) return res.status(404).json({ error: 'Game not found' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, game.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = gameSchema.partial().parse(req.body)

    if (data.home_team_id && data.away_team_id && data.home_team_id === data.away_team_id) {
      return res.status(400).json({ error: 'El equipo local y visitante no pueden ser el mismo' })
    }

    const updatePayload: Record<string, unknown> = {}
    if (data.matchday !== undefined) updatePayload.matchday = data.matchday
    if (data.game_date !== undefined) updatePayload.game_date = data.game_date || null
    if (data.game_time !== undefined) updatePayload.game_time = data.game_time || null
    if (data.location !== undefined) updatePayload.location = data.location
    if (data.home_score !== undefined) updatePayload.home_score = data.home_score
    if (data.away_score !== undefined) updatePayload.away_score = data.away_score
    if (data.status !== undefined) updatePayload.status = data.status
    if (data.notes !== undefined) updatePayload.notes = data.notes
    if (data.home_team_id !== undefined) updatePayload.home_team_id = data.home_team_id
    if (data.away_team_id !== undefined) updatePayload.away_team_id = data.away_team_id
    if (data.matchday_id !== undefined) updatePayload.matchday_id = data.matchday_id
    if (data.forfeit_team_id !== undefined) updatePayload.forfeit_team_id = data.forfeit_team_id
    if (data.umpire_1 !== undefined) updatePayload.umpire_1 = data.umpire_1 || null
    if (data.umpire_2 !== undefined) updatePayload.umpire_2 = data.umpire_2 || null
    if (data.umpire_3 !== undefined) updatePayload.umpire_3 = data.umpire_3 || null
    if (data.scorer !== undefined) updatePayload.scorer = data.scorer || null

    if (data.status === 'completed') {
      const ump1 = data.umpire_1 ?? null
      const scr = data.scorer ?? null
      if (!ump1 || !ump1.trim() || !scr || !scr.trim()) {
        return res.status(400).json({ error: 'Se requiere al menos el Umpire 1 y el Anotador para finalizar el juego' })
      }
    }

    const { data: updated, error } = await db
      .from('games')
      .update(updatePayload)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error

    const isCompleted = updated.status === 'completed' || updated.status === 'forfeit'
    if (isCompleted && updated.playoff_series_id) {
      await tryAdvanceSeries(updated.playoff_series_id)
    }

    return res.json({ game: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update game error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/games/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: game, error: fetchError } = await db
      .from('games')
      .select('id, category_id')
      .eq('id', req.params.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!game) return res.status(404).json({ error: 'Game not found' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, game.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const now = new Date().toISOString()

    await db
      .from('game_player_stats')
      .update({ deleted_at: now })
      .eq('game_id', req.params.id)
      .is('deleted_at', null)

    const { error } = await db
      .from('games')
      .update({ deleted_at: now })
      .eq('id', req.params.id)

    if (error) throw error

    return res.json({ message: 'Game deleted' })
  } catch (err) {
    console.error('Delete game error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/categories/:categoryId/games', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    if (req.query.confirm !== 'true') {
      return res.status(400).json({ error: 'Confirmation required: add ?confirm=true' })
    }

    const now = new Date().toISOString()

    const { data: gameIds } = await db
      .from('games')
      .select('id')
      .eq('category_id', req.params.categoryId)
      .is('playoff_series_id', null)
      .is('deleted_at', null)

    if (gameIds && gameIds.length > 0) {
      const ids = gameIds.map(g => g.id)

      await db
        .from('game_player_stats')
        .update({ deleted_at: now })
        .in('game_id', ids)
        .is('deleted_at', null)

      const { error } = await db
        .from('games')
        .update({ deleted_at: now })
        .in('id', ids)

      if (error) throw error
    }

    await db
      .from('matchdays')
      .update({ deleted_at: now })
      .eq('category_id', req.params.categoryId)
      .is('deleted_at', null)

    await db
      .from('categories')
      .update({ fixture_generated: false })
      .eq('id', req.params.categoryId)

    return res.json({ message: 'All games deleted for this category' })
  } catch (err) {
    console.error('Delete all games error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
