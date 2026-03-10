import { Router } from 'express'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

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

router.get('/categories/:categoryId/standings', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: teams, error: teamsError } = await db
      .from('teams')
      .select('id, name, logo_url')
      .eq('category_id', req.params.categoryId)
      .eq('is_active', true)
      .order('name')

    if (teamsError) throw teamsError

    const { data: completedGames, error: completedError } = await db
      .from('games')
      .select('home_team_id, away_team_id, home_score, away_score')
      .eq('category_id', req.params.categoryId)
      .eq('status', 'completed')
      .is('playoff_series_id', null)
      .is('deleted_at', null)

    if (completedError) throw completedError

    const { data: forfeitGames, error: forfeitError } = await db
      .from('games')
      .select('home_team_id, away_team_id, home_score, away_score, forfeit_team_id')
      .eq('category_id', req.params.categoryId)
      .eq('status', 'forfeit')
      .is('playoff_series_id', null)
      .is('deleted_at', null)

    if (forfeitError) throw forfeitError

    const statsMap = new Map<string, {
      games_played: number
      wins: number
      losses: number
      draws: number
      runs_for: number
      runs_against: number
    }>()

    for (const t of teams || []) {
      statsMap.set(t.id, {
        games_played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        runs_for: 0,
        runs_against: 0,
      })
    }

    for (const g of completedGames || []) {
      const homeScore = g.home_score ?? 0
      const awayScore = g.away_score ?? 0

      const home = statsMap.get(g.home_team_id)
      if (home) {
        home.games_played++
        home.runs_for += homeScore
        home.runs_against += awayScore
        if (homeScore > awayScore) home.wins++
        else if (homeScore < awayScore) home.losses++
        else home.draws++
      }

      const away = statsMap.get(g.away_team_id)
      if (away) {
        away.games_played++
        away.runs_for += awayScore
        away.runs_against += homeScore
        if (awayScore > homeScore) away.wins++
        else if (awayScore < homeScore) away.losses++
        else away.draws++
      }
    }

    for (const g of forfeitGames || []) {
      const winnerId = g.forfeit_team_id === g.home_team_id ? g.away_team_id : g.home_team_id
      const loserId = g.forfeit_team_id
      const winnerRuns = winnerId === g.home_team_id ? (g.home_score ?? 0) : (g.away_score ?? 0)

      const winner = statsMap.get(winnerId)
      if (winner) {
        winner.games_played++
        winner.wins++
        winner.runs_for += winnerRuns
      }

      if (loserId) {
        const loser = statsMap.get(loserId)
        if (loser) {
          loser.games_played++
          loser.losses++
          loser.runs_against += winnerRuns
        }
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
    console.error('Standings error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
