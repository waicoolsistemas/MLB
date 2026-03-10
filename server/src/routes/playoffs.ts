import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const configSchema = z.object({
  teams_count: z.number().int().min(2).max(16),
  series_format: z.enum(['single_game', 'best_of_3', 'best_of_5']),
})

const generateSchema = z.object({
  team_ids: z.array(z.string().uuid()).min(2).max(16),
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

function getRoundName(round: number, totalRounds: number): string {
  const diff = totalRounds - round
  if (diff === 0) return 'Final'
  if (diff === 1) return 'Semifinal'
  if (diff === 2) return 'Cuartos de Final'
  return `Ronda ${round}`
}

function getMaxGames(format: string): number {
  if (format === 'best_of_5') return 5
  if (format === 'best_of_3') return 3
  return 1
}

function getWinsNeeded(format: string): number {
  if (format === 'best_of_5') return 3
  if (format === 'best_of_3') return 2
  return 1
}

router.get('/categories/:categoryId/playoffs/config', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: config } = await db
      .from('playoff_configs')
      .select('*')
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    return res.json({ config })
  } catch (err) {
    console.error('Get playoff config error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/categories/:categoryId/playoffs/config', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = configSchema.parse(req.body)

    const { data: existing } = await db
      .from('playoff_configs')
      .select('id, status')
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    if (existing) {
      if (existing.status !== 'setup') {
        return res.status(400).json({ error: 'No se puede modificar la configuracion con playoffs en progreso' })
      }
      const { data: updated, error } = await db
        .from('playoff_configs')
        .update({ teams_count: data.teams_count, series_format: data.series_format })
        .eq('id', existing.id)
        .select('*')
        .single()
      if (error) throw error
      return res.json({ config: updated })
    }

    const { data: config, error } = await db
      .from('playoff_configs')
      .insert({
        category_id: req.params.categoryId,
        teams_count: data.teams_count,
        series_format: data.series_format,
      })
      .select('*')
      .single()

    if (error) throw error
    return res.status(201).json({ config })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Save playoff config error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/categories/:categoryId/playoffs/generate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { team_ids } = generateSchema.parse(req.body)

    const { data: config } = await db
      .from('playoff_configs')
      .select('*')
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    if (!config) {
      return res.status(400).json({ error: 'Primero configura los playoffs' })
    }

    if (team_ids.length !== config.teams_count) {
      return res.status(400).json({ error: `Se requieren exactamente ${config.teams_count} equipos` })
    }

    const { data: existingSeries } = await db
      .from('playoff_series')
      .select('id')
      .eq('playoff_config_id', config.id)
      .is('deleted_at', null)
      .limit(1)

    if (existingSeries && existingSeries.length > 0) {
      return res.status(400).json({ error: 'Ya existe un bracket. Eliminalo primero para regenerar.' })
    }

    const n = team_ids.length
    let totalSlots = 1
    while (totalSlots < n) totalSlots *= 2
    const totalRounds = Math.log2(totalSlots)

    const bracketSlots: (string | null)[] = new Array(totalSlots).fill(null)
    for (let i = 0; i < n; i++) {
      bracketSlots[i] = team_ids[i]
    }

    const seriesMap: Map<string, {
      round: number
      round_name: string
      series_order: number
      seed_home: number | null
      seed_away: number | null
      home_team_id: string | null
      away_team_id: string | null
      status: string
      tempId: string
      nextTempId: string | null
      next_series_slot: string | null
    }> = new Map()

    let seriesCounter = 0
    const roundSeries: string[][] = []

    for (let round = 1; round <= totalRounds; round++) {
      const roundName = getRoundName(round, totalRounds)
      const matchesInRound = totalSlots / Math.pow(2, round)
      const roundIds: string[] = []

      for (let i = 0; i < matchesInRound; i++) {
        const tempId = `temp_${seriesCounter++}`
        roundIds.push(tempId)

        if (round === 1) {
          const topIdx = i * 2
          const botIdx = i * 2 + 1
          const topTeam = bracketSlots[topIdx]
          const botTeam = bracketSlots[botIdx]
          const isBye = topTeam === null || botTeam === null

          seriesMap.set(tempId, {
            round,
            round_name: roundName,
            series_order: i + 1,
            seed_home: topTeam ? topIdx + 1 : null,
            seed_away: botTeam ? botIdx + 1 : null,
            home_team_id: topTeam,
            away_team_id: botTeam,
            status: isBye ? 'completed' : 'pending',
            tempId,
            nextTempId: null,
            next_series_slot: null,
          })
        } else {
          seriesMap.set(tempId, {
            round,
            round_name: roundName,
            series_order: i + 1,
            seed_home: null,
            seed_away: null,
            home_team_id: null,
            away_team_id: null,
            status: 'pending',
            tempId,
            nextTempId: null,
            next_series_slot: null,
          })
        }
      }

      roundSeries.push(roundIds)
    }

    for (let r = 0; r < roundSeries.length - 1; r++) {
      const currentRound = roundSeries[r]
      const nextRound = roundSeries[r + 1]
      for (let i = 0; i < currentRound.length; i++) {
        const nextIdx = Math.floor(i / 2)
        const slot = i % 2 === 0 ? 'home' : 'away'
        const s = seriesMap.get(currentRound[i])!
        s.nextTempId = nextRound[nextIdx]
        s.next_series_slot = slot
      }
    }

    const byeWinners: { tempId: string; winnerId: string }[] = []
    for (const [tempId, s] of seriesMap) {
      if (s.round === 1 && s.status === 'completed') {
        const winner = s.home_team_id || s.away_team_id
        if (winner) {
          byeWinners.push({ tempId, winnerId: winner })
        }
      }
    }

    for (const bw of byeWinners) {
      const byeSeries = seriesMap.get(bw.tempId)!
      if (byeSeries.nextTempId) {
        const nextS = seriesMap.get(byeSeries.nextTempId)!
        if (byeSeries.next_series_slot === 'home') {
          nextS.home_team_id = bw.winnerId
        } else {
          nextS.away_team_id = bw.winnerId
        }
      }
    }

    const insertOrder: string[] = []
    for (const roundIds of roundSeries) {
      insertOrder.push(...roundIds)
    }
    insertOrder.reverse()

    const tempToReal: Map<string, string> = new Map()
    for (const tempId of insertOrder) {
      const s = seriesMap.get(tempId)!
      const realNextId = s.nextTempId ? tempToReal.get(s.nextTempId) || null : null

      const { data: inserted, error } = await db
        .from('playoff_series')
        .insert({
          playoff_config_id: config.id,
          round: s.round,
          round_name: s.round_name,
          series_order: s.series_order,
          seed_home: s.seed_home,
          seed_away: s.seed_away,
          home_team_id: s.home_team_id,
          away_team_id: s.away_team_id,
          status: s.status,
          next_series_id: realNextId,
          next_series_slot: s.next_series_slot,
          winner_team_id: s.status === 'completed' ? (s.home_team_id || s.away_team_id) : null,
        })
        .select('id')
        .single()

      if (error) throw error
      tempToReal.set(tempId, inserted.id)
    }

    const maxGames = getMaxGames(config.series_format)
    const gamesToInsert: {
      category_id: string
      home_team_id: string
      away_team_id: string
      matchday: number
      status: string
      playoff_series_id: string
    }[] = []

    for (const [tempId, s] of seriesMap) {
      if (s.status === 'completed') continue
      if (!s.home_team_id || !s.away_team_id) continue
      const realId = tempToReal.get(tempId)!

      for (let g = 0; g < maxGames; g++) {
        gamesToInsert.push({
          category_id: req.params.categoryId,
          home_team_id: g % 2 === 0 ? s.home_team_id : s.away_team_id,
          away_team_id: g % 2 === 0 ? s.away_team_id : s.home_team_id,
          matchday: s.round,
          status: 'scheduled',
          playoff_series_id: realId,
        })
      }
    }

    if (gamesToInsert.length > 0) {
      const { error: gamesError } = await db.from('games').insert(gamesToInsert)
      if (gamesError) throw gamesError
    }

    await db
      .from('playoff_configs')
      .update({ status: 'in_progress' })
      .eq('id', config.id)

    return res.status(201).json({
      message: `Bracket generado con ${seriesMap.size} series y ${gamesToInsert.length} juegos`,
      series_count: seriesMap.size,
      games_count: gamesToInsert.length,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Generate playoff bracket error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/categories/:categoryId/playoffs', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: config } = await db
      .from('playoff_configs')
      .select('id')
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    if (!config) return res.status(404).json({ error: 'No playoff config found' })

    const now = new Date().toISOString()

    const { data: seriesIds } = await db
      .from('playoff_series')
      .select('id')
      .eq('playoff_config_id', config.id)
      .is('deleted_at', null)

    if (seriesIds && seriesIds.length > 0) {
      const ids = seriesIds.map(s => s.id)

      const { data: gameIds } = await db
        .from('games')
        .select('id')
        .in('playoff_series_id', ids)
        .is('deleted_at', null)

      if (gameIds && gameIds.length > 0) {
        const gIds = gameIds.map(g => g.id)

        await db
          .from('game_player_stats')
          .update({ deleted_at: now })
          .in('game_id', gIds)
          .is('deleted_at', null)

        await db
          .from('games')
          .update({ deleted_at: now })
          .in('id', gIds)
      }

      await db
        .from('playoff_series')
        .update({ deleted_at: now })
        .eq('playoff_config_id', config.id)
        .is('deleted_at', null)
    }

    await db
      .from('playoff_configs')
      .update({ status: 'setup' })
      .eq('id', config.id)

    return res.json({ message: 'Bracket eliminado' })
  } catch (err) {
    console.error('Delete playoff bracket error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/categories/:categoryId/playoffs/bracket', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: config } = await db
      .from('playoff_configs')
      .select('*')
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    if (!config) return res.json({ config: null, rounds: [] })

    const { data: allSeries, error: seriesError } = await db
      .from('playoff_series')
      .select('*, home_team:teams!playoff_series_home_team_id_fkey(id, name), away_team:teams!playoff_series_away_team_id_fkey(id, name), winner_team:teams!playoff_series_winner_team_id_fkey(id, name)')
      .eq('playoff_config_id', config.id)
      .is('deleted_at', null)
      .order('round')
      .order('series_order')

    if (seriesError) throw seriesError

    const { data: playoffGames, error: gamesError } = await db
      .from('games')
      .select('*, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name)')
      .not('playoff_series_id', 'is', null)
      .in('playoff_series_id', (allSeries || []).map(s => s.id))
      .is('deleted_at', null)
      .order('created_at')

    if (gamesError) throw gamesError

    const gamesBySeries: Record<string, typeof playoffGames> = {}
    for (const g of playoffGames || []) {
      const sid = g.playoff_series_id as string
      if (!gamesBySeries[sid]) gamesBySeries[sid] = []
      gamesBySeries[sid].push(g)
    }

    const formattedSeries = (allSeries || []).map((s: Record<string, unknown>) => {
      const { home_team, away_team, winner_team, ...rest } = s
      const seriesGames = (gamesBySeries[rest.id as string] || []).map((g: Record<string, unknown>) => {
        const { home_team: ht, away_team: at, ...gRest } = g
        return {
          ...gRest,
          home_team_name: (ht as { name: string } | null)?.name ?? '',
          away_team_name: (at as { name: string } | null)?.name ?? '',
        }
      })
      return {
        ...rest,
        home_team_name: (home_team as { name: string } | null)?.name ?? null,
        away_team_name: (away_team as { name: string } | null)?.name ?? null,
        winner_team_name: (winner_team as { name: string } | null)?.name ?? null,
        games: seriesGames,
      }
    })

    const roundsMap = new Map<number, typeof formattedSeries>()
    for (const s of formattedSeries) {
      const r = (s as Record<string, unknown>).round as number
      if (!roundsMap.has(r)) roundsMap.set(r, [])
      roundsMap.get(r)!.push(s)
    }

    const rounds = Array.from(roundsMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([round, series]) => ({
        round,
        round_name: ((series[0] as Record<string, unknown>)?.round_name as string) ?? `Ronda ${round}`,
        series,
      }))

    return res.json({ config, rounds })
  } catch (err) {
    console.error('Get playoff bracket error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export async function tryAdvanceSeries(seriesId: string): Promise<void> {
  const { data: series } = await db
    .from('playoff_series')
    .select('*, playoff_configs!inner(category_id, series_format)')
    .eq('id', seriesId)
    .maybeSingle()

  if (!series) return

  if (series.status === 'completed') return

  const categoryId = (series.playoff_configs as unknown as { category_id: string; series_format: string }).category_id
  const seriesFormat = (series.playoff_configs as unknown as { category_id: string; series_format: string }).series_format

  const { data: seriesGames } = await db
    .from('games')
    .select('home_team_id, away_team_id, home_score, away_score, status')
    .eq('playoff_series_id', seriesId)
    .is('deleted_at', null)
    .in('status', ['completed', 'forfeit'])

  let homeWins = 0
  let awayWins = 0
  for (const g of seriesGames || []) {
    const hs = g.home_score ?? 0
    const as_ = g.away_score ?? 0
    const homeIsSeriesHome = g.home_team_id === series.home_team_id
    if (hs > as_) {
      if (homeIsSeriesHome) homeWins++
      else awayWins++
    } else if (as_ > hs) {
      if (homeIsSeriesHome) awayWins++
      else homeWins++
    }
  }

  const winsNeeded = getWinsNeeded(seriesFormat)
  let winnerId: string | null = null

  if (homeWins >= winsNeeded) winnerId = series.home_team_id
  else if (awayWins >= winsNeeded) winnerId = series.away_team_id

  if (!winnerId) {
    await db
      .from('playoff_series')
      .update({ home_wins: homeWins, away_wins: awayWins, status: 'in_progress' })
      .eq('id', seriesId)
    return
  }

  await db
    .from('playoff_series')
    .update({
      home_wins: homeWins,
      away_wins: awayWins,
      winner_team_id: winnerId,
      status: 'completed',
    })
    .eq('id', seriesId)

  if (series.next_series_id && series.next_series_slot) {
    const updateField = series.next_series_slot === 'home' ? 'home_team_id' : 'away_team_id'
    await db
      .from('playoff_series')
      .update({ [updateField]: winnerId })
      .eq('id', series.next_series_id)

    const { data: nextSeries } = await db
      .from('playoff_series')
      .select('id, home_team_id, away_team_id, round')
      .eq('id', series.next_series_id)
      .maybeSingle()

    if (nextSeries && nextSeries.home_team_id && nextSeries.away_team_id) {
      const { data: existingGames } = await db
        .from('games')
        .select('id')
        .eq('playoff_series_id', nextSeries.id)
        .is('deleted_at', null)
        .limit(1)

      if (!existingGames || existingGames.length === 0) {
        const maxGames = getMaxGames(seriesFormat)
        const nextGames: {
          category_id: string
          home_team_id: string
          away_team_id: string
          matchday: number
          status: string
          playoff_series_id: string
        }[] = []

        for (let g = 0; g < maxGames; g++) {
          nextGames.push({
            category_id: categoryId,
            home_team_id: g % 2 === 0 ? nextSeries.home_team_id : nextSeries.away_team_id,
            away_team_id: g % 2 === 0 ? nextSeries.away_team_id : nextSeries.home_team_id,
            matchday: nextSeries.round,
            status: 'scheduled',
            playoff_series_id: nextSeries.id,
          })
        }

        if (nextGames.length > 0) {
          await db.from('games').insert(nextGames)
        }
      }
    }
  }

  const { data: allSeries } = await db
    .from('playoff_series')
    .select('status')
    .eq('playoff_config_id', series.playoff_config_id)
    .is('deleted_at', null)

  const allCompleted = (allSeries || []).every(s => s.status === 'completed')
  if (allCompleted) {
    await db
      .from('playoff_configs')
      .update({ status: 'completed' })
      .eq('id', series.playoff_config_id)
  }
}

router.put('/playoff-series/:seriesId/advance', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: series } = await db
      .from('playoff_series')
      .select('*, playoff_configs!inner(category_id)')
      .eq('id', req.params.seriesId)
      .maybeSingle()

    if (!series) return res.status(404).json({ error: 'Serie no encontrada' })

    const categoryId = (series.playoff_configs as unknown as { category_id: string }).category_id
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    await tryAdvanceSeries(req.params.seriesId)

    const { data: updated } = await db
      .from('playoff_series')
      .select('home_wins, away_wins, winner_team_id, status')
      .eq('id', req.params.seriesId)
      .maybeSingle()

    return res.json({
      message: updated?.status === 'completed' ? 'Serie completada' : 'Serie actualizada',
      winner_team_id: updated?.winner_team_id ?? null,
      home_wins: updated?.home_wins ?? 0,
      away_wins: updated?.away_wins ?? 0,
    })
  } catch (err) {
    console.error('Advance series error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/categories/:categoryId/playoffs/standings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: config } = await db
      .from('playoff_configs')
      .select('id')
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    if (!config) return res.json({ standings: [] })

    const { data: seriesIds } = await db
      .from('playoff_series')
      .select('id')
      .eq('playoff_config_id', config.id)
      .is('deleted_at', null)

    if (!seriesIds || seriesIds.length === 0) return res.json({ standings: [] })

    const ids = seriesIds.map(s => s.id)

    const { data: teams } = await db
      .from('teams')
      .select('id, name, logo_url')
      .eq('category_id', req.params.categoryId)
      .eq('is_active', true)

    const { data: completedGames } = await db
      .from('games')
      .select('home_team_id, away_team_id, home_score, away_score, playoff_series_id')
      .eq('category_id', req.params.categoryId)
      .eq('status', 'completed')
      .is('deleted_at', null)
      .in('playoff_series_id', ids)

    const { data: forfeitGames } = await db
      .from('games')
      .select('home_team_id, away_team_id, home_score, away_score, forfeit_team_id, playoff_series_id')
      .eq('category_id', req.params.categoryId)
      .eq('status', 'forfeit')
      .is('deleted_at', null)
      .in('playoff_series_id', ids)

    const statsMap = new Map<string, {
      games_played: number; wins: number; losses: number; draws: number
      runs_for: number; runs_against: number
    }>()

    for (const t of teams || []) {
      statsMap.set(t.id, { games_played: 0, wins: 0, losses: 0, draws: 0, runs_for: 0, runs_against: 0 })
    }

    for (const g of completedGames || []) {
      const hs = g.home_score ?? 0
      const as_ = g.away_score ?? 0
      const home = statsMap.get(g.home_team_id)
      if (home) {
        home.games_played++
        home.runs_for += hs
        home.runs_against += as_
        if (hs > as_) home.wins++
        else if (hs < as_) home.losses++
        else home.draws++
      }
      const away = statsMap.get(g.away_team_id)
      if (away) {
        away.games_played++
        away.runs_for += as_
        away.runs_against += hs
        if (as_ > hs) away.wins++
        else if (as_ < hs) away.losses++
        else away.draws++
      }
    }

    for (const g of forfeitGames || []) {
      const winnerId = g.forfeit_team_id === g.home_team_id ? g.away_team_id : g.home_team_id
      const loserId = g.forfeit_team_id
      const winnerRuns = winnerId === g.home_team_id ? (g.home_score ?? 0) : (g.away_score ?? 0)
      const winner = statsMap.get(winnerId)
      if (winner) { winner.games_played++; winner.wins++; winner.runs_for += winnerRuns }
      if (loserId) {
        const loser = statsMap.get(loserId)
        if (loser) { loser.games_played++; loser.losses++; loser.runs_against += winnerRuns }
      }
    }

    const standings = (teams || [])
      .filter(t => statsMap.get(t.id)!.games_played > 0)
      .map(t => {
        const s = statsMap.get(t.id)!
        return {
          team_id: t.id, team_name: t.name, logo_url: t.logo_url,
          games_played: s.games_played, wins: s.wins, losses: s.losses, draws: s.draws,
          runs_for: s.runs_for, runs_against: s.runs_against, run_diff: s.runs_for - s.runs_against,
        }
      })

    standings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.run_diff - a.run_diff
    })

    return res.json({ standings })
  } catch (err) {
    console.error('Playoff standings error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/categories/:categoryId/playoffs/player-stats/:teamId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await db.rpc('get_playoff_player_stats_by_team', {
      p_category_id: req.params.categoryId,
      p_team_id: req.params.teamId,
    })
    if (error) throw error
    return res.json({ stats: data || [] })
  } catch (err) {
    console.error('Playoff player stats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
