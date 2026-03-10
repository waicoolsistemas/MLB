import api from './api'
import type { StandingRow, PlayerSeasonStats, Game, Player, Payment } from './leagueService'

export interface ManagerTeam {
  id: string
  name: string
  logo_url: string
  manager_name: string
  is_active: boolean
  category_id: string
  players_count: number
  category_name: string
  category_is_active: boolean
  season_id: string
  season_name: string
  season_is_active: boolean
  league_id: string
  league_name: string
  league_logo_url: string
  league_sport_type: 'baseball' | 'softball'
}

export interface ManagerTeamDetail extends ManagerTeam {
  manager_phone: string
  league_logo_url: string
}

export interface ManagerPaymentInfo {
  effective_fee: number
  total_paid: number
  balance: number
  is_settled: boolean
  payments: Payment[]
}

export const managerService = {
  async getMyTeams(): Promise<ManagerTeam[]> {
    const { data } = await api.get<{ teams: ManagerTeam[] }>('/api/manager/my-teams')
    return data.teams
  },

  async getTeamDetail(teamId: string): Promise<ManagerTeamDetail> {
    const { data } = await api.get<{ team: ManagerTeamDetail }>(`/api/manager/my-teams/${teamId}`)
    return data.team
  },

  async getTeamRoster(teamId: string): Promise<Player[]> {
    const { data } = await api.get<{ players: Player[] }>(`/api/manager/my-teams/${teamId}/roster`)
    return data.players
  },

  async getTeamGames(teamId: string): Promise<Game[]> {
    const { data } = await api.get<{ games: Game[] }>(`/api/manager/my-teams/${teamId}/games`)
    return data.games
  },

  async getTeamStandings(teamId: string): Promise<StandingRow[]> {
    const { data } = await api.get<{ standings: StandingRow[] }>(`/api/manager/my-teams/${teamId}/standings`)
    return data.standings
  },

  async getTeamStats(teamId: string): Promise<PlayerSeasonStats[]> {
    const { data } = await api.get<{ stats: PlayerSeasonStats[] }>(`/api/manager/my-teams/${teamId}/stats`)
    return data.stats
  },

  async getTeamPayments(teamId: string): Promise<ManagerPaymentInfo> {
    const { data } = await api.get<ManagerPaymentInfo>(`/api/manager/my-teams/${teamId}/payments`)
    return data
  },

  async createPlayer(teamId: string, payload: { full_name: string; curp?: string; birth_date?: string | null; phone?: string }): Promise<Player> {
    const { data } = await api.post<{ player: Player }>(`/api/teams/${teamId}/players`, payload)
    return data.player
  },

  async updatePlayer(playerId: string, payload: Partial<{ full_name: string; curp: string; birth_date: string | null; is_active: boolean; phone: string }>): Promise<Player> {
    const { data } = await api.put<{ player: Player }>(`/api/players/${playerId}`, payload)
    return data.player
  },

  async uploadPlayerPhoto(playerId: string, file: File): Promise<Player> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const { data } = await api.post<{ player: Player }>(`/api/players/${playerId}/photo`, {
      base64,
      content_type: file.type,
    })
    return data.player
  },
}
