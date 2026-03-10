import { Router } from 'express'
import { db } from '../db.js'
import { authenticateToken, requireRole } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

async function verifyTeamOwnership(userId: string, teamId: string): Promise<boolean> {
  const { data: team } = await db
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .eq('manager_user_id', userId)
    .maybeSingle()

  return !!team
}

router.get('/my-teams', authenticateToken, requireRole('manager'), async (req: AuthRequest, res) => {
  try {
    const { data: teams, error } = await db
      .from('teams')
      .select(`
        id, name, logo_url, manager_name, is_active, category_id,
        categories!inner(
          id, name, is_active,
          seasons!inner(
            id, name, is_active,
            leagues!inner(id, name, logo_url, sport_type)
          )
        ),
        players(count)
      `)
      .eq('manager_user_id', req.user!.sub)
      .order('name')

    if (error) throw error

    const formatted = (teams || []).map(t => {
      const cat = t.categories as unknown as {
        id: string; name: string; is_active: boolean
        seasons: { id: string; name: string; is_active: boolean; leagues: { id: string; name: string; logo_url: string; sport_type: string } }
      }
      const { categories, players, ...rest } = t as Record<string, unknown>
      return {
        ...rest,
        players_count: Array.isArray(players) && players.length > 0 ? (players[0] as { count: number }).count : 0,
        category_name: cat.name,
        category_is_active: cat.is_active,
        season_id: cat.seasons.id,
        season_name: cat.seasons.name,
        season_is_active: cat.seasons.is_active,
        league_id: cat.seasons.leagues.id,
        league_name: cat.seasons.leagues.name,
        league_logo_url: cat.seasons.leagues.logo_url,
        league_sport_type: cat.seasons.leagues.sport_type,
      }
    })

    return res.json({ teams: formatted })
  } catch (err) {
    console.error('Manager my-teams error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/my-teams/:teamId', authenticateToken, requireRole('manager'), async (req: AuthRequest, res) => {
  try {
    const owned = await verifyTeamOwnership(req.user!.sub, req.params.teamId)
    if (!owned) return res.status(403).json({ error: 'No tienes acceso a este equipo' })

    const { data: team, error } = await db
      .from('teams')
      .select(`
        id, name, logo_url, manager_name, manager_phone, is_active, category_id,
        categories!inner(
          id, name, is_active,
          seasons!inner(
            id, name, is_active,
            leagues!inner(id, name, logo_url, sport_type)
          )
        ),
        players(count)
      `)
      .eq('id', req.params.teamId)
      .maybeSingle()

    if (error) throw error
    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' })

    const cat = team.categories as unknown as {
      id: string; name: string; is_active: boolean
      seasons: { id: string; name: string; is_active: boolean; leagues: { id: string; name: string; logo_url: string; sport_type: string } }
    }
    const { categories, players, ...rest } = team as Record<string, unknown>

    return res.json({
      team: {
        ...rest,
        players_count: Array.isArray(players) && players.length > 0 ? (players[0] as { count: number }).count : 0,
        category_name: cat.name,
        category_is_active: cat.is_active,
        season_id: cat.seasons.id,
        season_name: cat.seasons.name,
        league_name: cat.seasons.leagues.name,
        league_logo_url: cat.seasons.leagues.logo_url,
        league_sport_type: cat.seasons.leagues.sport_type,
      },
    })
  } catch (err) {
    console.error('Manager team detail error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/my-teams/:teamId/roster', authenticateToken, requireRole('manager'), async (req: AuthRequest, res) => {
  try {
    const owned = await verifyTeamOwnership(req.user!.sub, req.params.teamId)
    if (!owned) return res.status(403).json({ error: 'No tienes acceso a este equipo' })

    const { data: players, error } = await db
      .from('players')
      .select('id, full_name, curp, birth_date, phone, photo_url, is_active, created_at')
      .eq('team_id', req.params.teamId)
      .order('full_name')

    if (error) throw error

    return res.json({ players: players || [] })
  } catch (err) {
    console.error('Manager roster error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/my-teams/:teamId/games', authenticateToken, requireRole('manager'), async (req: AuthRequest, res) => {
  try {
    const owned = await verifyTeamOwnership(req.user!.sub, req.params.teamId)
    if (!owned) return res.status(403).json({ error: 'No tienes acceso a este equipo' })

    const { data: team } = await db
      .from('teams')
      .select('category_id')
      .eq('id', req.params.teamId)
      .maybeSingle()

    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' })

    const { data: games, error } = await db
      .from('games')
      .select('*, home_team:teams!games_home_team_id_fkey(name), away_team:teams!games_away_team_id_fkey(name), matchday_ref:matchdays(name)')
      .eq('category_id', team.category_id)
      .is('playoff_series_id', null)
      .is('deleted_at', null)
      .or(`home_team_id.eq.${req.params.teamId},away_team_id.eq.${req.params.teamId}`)
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
    console.error('Manager games error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/my-teams/:teamId/standings', authenticateToken, requireRole('manager'), async (req: AuthRequest, res) => {
  try {
    const owned = await verifyTeamOwnership(req.user!.sub, req.params.teamId)
    if (!owned) return res.status(403).json({ error: 'No tienes acceso a este equipo' })

    const { data: teamData } = await db
      .from('teams')
      .select('category_id')
      .eq('id', req.params.teamId)
      .maybeSingle()

    if (!teamData) return res.status(404).json({ error: 'Equipo no encontrado' })

    const categoryId = teamData.category_id

    const { data: teams, error: teamsError } = await db
      .from('teams')
      .select('id, name, logo_url')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('name')

    if (teamsError) throw teamsError

    const { data: completedGames, error: completedError } = await db
      .from('games')
      .select('home_team_id, away_team_id, home_score, away_score')
      .eq('category_id', categoryId)
      .eq('status', 'completed')
      .is('playoff_series_id', null)
      .is('deleted_at', null)

    if (completedError) throw completedError

    const { data: forfeitGames, error: forfeitError } = await db
      .from('games')
      .select('home_team_id, away_team_id, home_score, away_score, forfeit_team_id')
      .eq('category_id', categoryId)
      .eq('status', 'forfeit')
      .is('playoff_series_id', null)
      .is('deleted_at', null)

    if (forfeitError) throw forfeitError

    const statsMap = new Map<string, {
      games_played: number; wins: number; losses: number; draws: number; runs_for: number; runs_against: number
    }>()

    for (const t of teams || []) {
      statsMap.set(t.id, { games_played: 0, wins: 0, losses: 0, draws: 0, runs_for: 0, runs_against: 0 })
    }

    for (const g of completedGames || []) {
      const hs = g.home_score ?? 0
      const as_ = g.away_score ?? 0
      const home = statsMap.get(g.home_team_id)
      if (home) {
        home.games_played++; home.runs_for += hs; home.runs_against += as_
        if (hs > as_) home.wins++; else if (hs < as_) home.losses++; else home.draws++
      }
      const away = statsMap.get(g.away_team_id)
      if (away) {
        away.games_played++; away.runs_for += as_; away.runs_against += hs
        if (as_ > hs) away.wins++; else if (as_ < hs) away.losses++; else away.draws++
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

    const standings = (teams || []).map(t => {
      const s = statsMap.get(t.id)!
      return {
        team_id: t.id,
        team_name: t.name,
        logo_url: t.logo_url,
        games_played: s.games_played,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        runs_for: s.runs_for,
        runs_against: s.runs_against,
        run_diff: s.runs_for - s.runs_against,
      }
    })

    standings.sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.run_diff - a.run_diff
    })

    return res.json({ standings })
  } catch (err) {
    console.error('Manager standings error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/my-teams/:teamId/stats', authenticateToken, requireRole('manager'), async (req: AuthRequest, res) => {
  try {
    const owned = await verifyTeamOwnership(req.user!.sub, req.params.teamId)
    if (!owned) return res.status(403).json({ error: 'No tienes acceso a este equipo' })

    const { data: teamData } = await db
      .from('teams')
      .select('category_id')
      .eq('id', req.params.teamId)
      .maybeSingle()

    if (!teamData) return res.status(404).json({ error: 'Equipo no encontrado' })

    const { data, error } = await db.rpc('get_player_stats_by_team', {
      p_category_id: teamData.category_id,
      p_team_id: req.params.teamId,
    })

    if (error) throw error

    return res.json({ stats: data || [] })
  } catch (err) {
    console.error('Manager stats error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/my-teams/:teamId/payments', authenticateToken, requireRole('manager'), async (req: AuthRequest, res) => {
  try {
    const owned = await verifyTeamOwnership(req.user!.sub, req.params.teamId)
    if (!owned) return res.status(403).json({ error: 'No tienes acceso a este equipo' })

    const { data: team } = await db
      .from('teams')
      .select('category_id')
      .eq('id', req.params.teamId)
      .maybeSingle()

    if (!team) return res.status(404).json({ error: 'Equipo no encontrado' })

    const { data: category } = await db
      .from('categories')
      .select('registration_fee')
      .eq('id', team.category_id)
      .maybeSingle()

    if (!category) return res.status(404).json({ error: 'Categoria no encontrada' })

    const { data: customFee } = await db
      .from('team_fees')
      .select('amount')
      .eq('team_id', req.params.teamId)
      .maybeSingle()

    const { data: payments, error: paymentsError } = await db
      .from('payments')
      .select('*')
      .eq('category_id', team.category_id)
      .eq('team_id', req.params.teamId)
      .order('payment_date', { ascending: false })

    if (paymentsError) throw paymentsError

    const registrationFee = Number(category.registration_fee)
    const effectiveFee = customFee ? Number(customFee.amount) : registrationFee
    const totalPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
    const balance = Math.max(0, effectiveFee - totalPaid)
    const isSettled = totalPaid >= effectiveFee && effectiveFee > 0

    return res.json({
      effective_fee: effectiveFee,
      total_paid: totalPaid,
      balance,
      is_settled: isSettled,
      payments: payments || [],
    })
  } catch (err) {
    console.error('Manager payments error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
