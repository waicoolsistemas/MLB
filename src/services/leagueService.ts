import api from './api'

export interface League {
  id: string
  name: string
  description: string
  logo_url: string
  sport_type: 'baseball' | 'softball'
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
  admin?: { id: string; email: string; full_name: string } | null
  active_seasons_count?: number
}

export interface PlayerParent {
  id: string
  player_id: string
  full_name: string
  phone: string
  address: string
  created_at: string
  updated_at: string
}

export type ScheduleType = 'dominical' | 'semanal' | 'custom'

export interface Season {
  id: string
  league_id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  schedule_type: ScheduleType
  schedule_days: number[]
  games_per_day: number
  default_time_slots: string[]
  created_by: string
  created_at: string
  updated_at: string
  categories_count?: number
  categories?: Category[]
}

export interface Category {
  id: string
  season_id: string
  name: string
  description: string
  registration_fee: number
  is_active: boolean
  fixture_generated: boolean
  created_at: string
  updated_at: string
  teams_count?: number
}

export interface Payment {
  id: string
  team_id: string
  category_id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamPaymentSummary {
  team: Team
  custom_fee: number | null
  effective_fee: number
  payments: Payment[]
  total_paid: number
  balance: number
  is_settled: boolean
}

export interface PaymentsSummaryResponse {
  registration_fee: number
  summary: TeamPaymentSummary[]
}

export interface Team {
  id: string
  category_id: string
  name: string
  logo_url: string
  manager_name: string
  manager_phone: string
  manager_email: string
  manager_user_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  players_count?: number
}

export interface ManagerCredentials {
  email: string
  password: string
}

export interface CreateTeamResponse {
  team: Team
  manager_credentials: ManagerCredentials | null
}

export interface Player {
  id: string
  team_id: string
  full_name: string
  curp: string
  birth_date: string | null
  phone: string
  photo_url: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Matchday {
  id: string
  category_id: string
  number: number
  name: string | null
  game_date: string | null
  game_time: string | null
  location: string
  games_count: number
  created_at: string
  updated_at: string
}

export interface Game {
  id: string
  category_id: string
  home_team_id: string
  away_team_id: string
  matchday: number
  matchday_id: string | null
  matchday_name: string | null
  game_date: string | null
  game_time: string | null
  location: string
  home_score: number | null
  away_score: number | null
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'forfeit'
  forfeit_team_id: string | null
  notes: string
  umpire_1: string | null
  umpire_2: string | null
  umpire_3: string | null
  scorer: string | null
  created_at: string
  updated_at: string
  home_team_name: string
  away_team_name: string
}

export interface PlayerGameStats {
  id: string
  game_id: string
  player_id: string
  team_id: string
  at_bats: number
  hits: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  strikeouts: number
  runs: number
  rbi: number
  player_name: string
  created_at: string
  updated_at: string
}

export interface SaveStatEntry {
  player_id: string
  team_id: string
  at_bats: number
  hits: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  strikeouts: number
  runs: number
  rbi: number
}

export interface PlayerSeasonStats {
  player_id: string
  player_name: string
  games_played: number
  at_bats: number
  hits: number
  doubles: number
  triples: number
  home_runs: number
  walks: number
  strikeouts: number
  runs: number
  rbi: number
  batting_average: number
}

export interface StandingRow {
  team_id: string
  team_name: string
  logo_url: string
  games_played: number
  wins: number
  losses: number
  draws: number
  runs_for: number
  runs_against: number
  run_diff: number
}

export interface PlayoffConfig {
  id: string
  category_id: string
  teams_count: number
  series_format: 'single_game' | 'best_of_3' | 'best_of_5'
  status: 'setup' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface PlayoffSeries {
  id: string
  playoff_config_id: string
  round: number
  round_name: string
  seed_home: number | null
  seed_away: number | null
  home_team_id: string | null
  away_team_id: string | null
  home_team_name: string | null
  away_team_name: string | null
  home_wins: number
  away_wins: number
  winner_team_id: string | null
  winner_team_name: string | null
  series_order: number
  next_series_id: string | null
  next_series_slot: string | null
  status: 'pending' | 'in_progress' | 'completed'
  games: PlayoffGame[]
}

export interface PlayoffGame extends Game {
  playoff_series_id: string
}

export interface PlayoffRound {
  round: number
  round_name: string
  series: PlayoffSeries[]
}

export interface PlayoffBracketResponse {
  config: PlayoffConfig | null
  rounds: PlayoffRound[]
}

export interface LeagueDetail extends League {
  seasons: Season[]
}

export interface CreateLeaguePayload {
  name: string
  description?: string
  logo_url?: string
  sport_type: 'baseball' | 'softball'
}

export interface UpdateLeaguePayload {
  name?: string
  description?: string
  logo_url?: string
  is_active?: boolean
}

export interface AssignAdminPayload {
  email: string
  password: string
  full_name: string
}

export const leagueService = {
  async getMyLeague(): Promise<LeagueDetail> {
    const { data } = await api.get<{ league: LeagueDetail }>('/api/leagues/my-league')
    return data.league
  },

  async list(): Promise<League[]> {
    const { data } = await api.get<{ leagues: League[] }>('/api/leagues')
    return data.leagues
  },

  async get(id: string): Promise<LeagueDetail> {
    const { data } = await api.get<{ league: LeagueDetail }>(`/api/leagues/${id}`)
    return data.league
  },

  async create(payload: CreateLeaguePayload): Promise<League> {
    const { data } = await api.post<{ league: League }>('/api/leagues', payload)
    return data.league
  },

  async update(id: string, payload: UpdateLeaguePayload): Promise<League> {
    const { data } = await api.put<{ league: League }>(`/api/leagues/${id}`, payload)
    return data.league
  },

  async assignAdmin(leagueId: string, payload: AssignAdminPayload) {
    const { data } = await api.post<{ admin: { id: string; email: string; full_name: string; role: string } }>(
      `/api/leagues/${leagueId}/admin`,
      payload
    )
    return data.admin
  },

  async removeAdmin(leagueId: string) {
    await api.delete(`/api/leagues/${leagueId}/admin`)
  },

  async listSeasons(leagueId: string): Promise<Season[]> {
    const { data } = await api.get<{ seasons: Season[] }>(`/api/leagues/${leagueId}/seasons`)
    return data.seasons
  },

  async createSeason(leagueId: string, payload: {
    name: string
    start_date?: string | null
    end_date?: string | null
    schedule_type?: ScheduleType
    schedule_days?: number[]
    games_per_day?: number
    default_time_slots?: string[]
  }) {
    const { data } = await api.post<{ season: Season }>(`/api/leagues/${leagueId}/seasons`, payload)
    return data.season
  },

  async updateSeason(seasonId: string, payload: Partial<{
    name: string
    start_date: string | null
    end_date: string | null
    is_active: boolean
    schedule_type: ScheduleType
    schedule_days: number[]
    games_per_day: number
    default_time_slots: string[]
  }>) {
    const { data } = await api.put<{ season: Season }>(`/api/seasons/${seasonId}`, payload)
    return data.season
  },

  async listCategories(seasonId: string): Promise<Category[]> {
    const { data } = await api.get<{ categories: Category[] }>(`/api/seasons/${seasonId}/categories`)
    return data.categories
  },

  async createCategory(seasonId: string, payload: { name: string; description?: string; registration_fee?: number }) {
    const { data } = await api.post<{ category: Category }>(`/api/seasons/${seasonId}/categories`, payload)
    return data.category
  },

  async updateCategory(categoryId: string, payload: Partial<{ name: string; description: string; registration_fee: number; is_active: boolean }>) {
    const { data } = await api.put<{ category: Category }>(`/api/categories/${categoryId}`, payload)
    return data.category
  },

  async listTeams(categoryId: string): Promise<Team[]> {
    const { data } = await api.get<{ teams: Team[] }>(`/api/categories/${categoryId}/teams`)
    return data.teams
  },

  async createTeam(categoryId: string, payload: { name: string; logo_url?: string; manager_name?: string; manager_phone?: string; manager_email?: string }): Promise<CreateTeamResponse> {
    const { data } = await api.post<CreateTeamResponse>(`/api/categories/${categoryId}/teams`, payload)
    return data
  },

  async updateTeam(teamId: string, payload: Partial<{ name: string; logo_url: string; manager_name: string; manager_phone: string; is_active: boolean }>) {
    const { data } = await api.put<{ team: Team }>(`/api/teams/${teamId}`, payload)
    return data.team
  },

  async resetManagerPassword(teamId: string): Promise<ManagerCredentials> {
    const { data } = await api.post<{ credentials: ManagerCredentials }>(`/api/teams/${teamId}/reset-manager-password`)
    return data.credentials
  },

  async getPaymentsSummary(categoryId: string): Promise<PaymentsSummaryResponse> {
    const { data } = await api.get<PaymentsSummaryResponse>(`/api/categories/${categoryId}/payments`)
    return data
  },

  async createPayment(categoryId: string, payload: { team_id: string; amount: number; payment_date?: string; payment_method?: string; notes?: string }) {
    const { data } = await api.post<{ payment: Payment }>(`/api/categories/${categoryId}/payments`, payload)
    return data.payment
  },

  async updatePayment(paymentId: string, payload: Partial<{ amount: number; payment_date: string; payment_method: string; notes: string }>) {
    const { data } = await api.put<{ payment: Payment }>(`/api/payments/${paymentId}`, payload)
    return data.payment
  },

  async deletePayment(paymentId: string) {
    await api.delete(`/api/payments/${paymentId}`)
  },

  async setTeamFee(teamId: string, amount: number) {
    const { data } = await api.put<{ fee: { id: string; team_id: string; amount: number } }>(`/api/teams/${teamId}/fee`, { amount })
    return data.fee
  },

  async removeTeamFee(teamId: string) {
    await api.delete(`/api/teams/${teamId}/fee`)
  },

  async listPlayers(teamId: string): Promise<Player[]> {
    const { data } = await api.get<{ players: Player[] }>(`/api/teams/${teamId}/players`)
    return data.players
  },

  async createPlayer(teamId: string, payload: { full_name: string; curp?: string; birth_date?: string | null; phone?: string }) {
    const { data } = await api.post<{ player: Player }>(`/api/teams/${teamId}/players`, payload)
    return data.player
  },

  async updatePlayer(playerId: string, payload: Partial<{ full_name: string; curp: string; birth_date: string | null; is_active: boolean; phone: string; photo_url: string }>) {
    const { data } = await api.put<{ player: Player }>(`/api/players/${playerId}`, payload)
    return data.player
  },

  async uploadLeagueLogo(leagueId: string, file: File): Promise<League> {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const { data } = await api.post<{ league: League }>(`/api/leagues/${leagueId}/logo`, {
      base64,
      content_type: file.type,
    })
    return data.league
  },

  async removeLeagueLogo(leagueId: string): Promise<League> {
    const { data } = await api.delete<{ league: League }>(`/api/leagues/${leagueId}/logo`)
    return data.league
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

  async deletePlayer(playerId: string) {
    await api.delete(`/api/players/${playerId}`)
  },

  async listMatchdays(categoryId: string): Promise<Matchday[]> {
    const { data } = await api.get<{ matchdays: Matchday[] }>(`/api/categories/${categoryId}/matchdays`)
    return data.matchdays
  },

  async createMatchday(categoryId: string, payload: {
    number?: number
    name?: string | null
    game_date?: string | null
    game_time?: string | null
    location?: string
    games?: { home_team_id: string; away_team_id: string; game_date?: string | null; game_time?: string | null; location?: string; notes?: string }[]
  }): Promise<Matchday> {
    const { data } = await api.post<{ matchday: Matchday }>(`/api/categories/${categoryId}/matchdays`, payload)
    return data.matchday
  },

  async updateMatchday(matchdayId: string, payload: Partial<{
    number: number
    name: string | null
    game_date: string | null
    game_time: string | null
    location: string
  }>): Promise<Matchday> {
    const { data } = await api.put<{ matchday: Matchday }>(`/api/matchdays/${matchdayId}`, payload)
    return data.matchday
  },

  async deleteMatchday(matchdayId: string): Promise<{ deleted_games_count: number }> {
    const { data } = await api.delete<{ deleted_games_count: number }>(`/api/matchdays/${matchdayId}?confirm=true`)
    return data
  },

  async listGames(categoryId: string): Promise<Game[]> {
    const { data } = await api.get<{ games: Game[] }>(`/api/categories/${categoryId}/games`)
    return data.games
  },

  async createGame(categoryId: string, payload: {
    home_team_id: string
    away_team_id: string
    matchday: number
    matchday_id?: string | null
    game_date?: string | null
    game_time?: string | null
    location?: string
    notes?: string
  }) {
    const { data } = await api.post<{ game: Game }>(`/api/categories/${categoryId}/games`, payload)
    return data.game
  },

  async generateGames(categoryId: string, options: { include_return?: boolean; start_date?: string | null }) {
    const { data } = await api.post<{ message: string; count: number; matchdays: number }>(
      `/api/categories/${categoryId}/games/generate`,
      options
    )
    return data
  },

  async updateGame(gameId: string, payload: Partial<{
    home_team_id: string
    away_team_id: string
    matchday: number
    game_date: string | null
    game_time: string | null
    location: string
    home_score: number | null
    away_score: number | null
    status: string
    notes: string
    umpire_1: string | null
    umpire_2: string | null
    umpire_3: string | null
    scorer: string | null
  }>) {
    const { data } = await api.put<{ game: Game }>(`/api/games/${gameId}`, payload)
    return data.game
  },

  async deleteGame(gameId: string) {
    await api.delete(`/api/games/${gameId}`)
  },

  async deleteAllGames(categoryId: string) {
    await api.delete(`/api/categories/${categoryId}/games?confirm=true`)
  },

  async getStandings(categoryId: string): Promise<StandingRow[]> {
    const { data } = await api.get<{ standings: StandingRow[] }>(`/api/categories/${categoryId}/standings`)
    return data.standings
  },

  async getGameStats(gameId: string): Promise<PlayerGameStats[]> {
    const { data } = await api.get<{ stats: PlayerGameStats[] }>(`/api/games/${gameId}/stats`)
    return data.stats
  },

  async saveGameStats(gameId: string, stats: SaveStatEntry[]): Promise<PlayerGameStats[]> {
    const { data } = await api.post<{ stats: PlayerGameStats[] }>(`/api/games/${gameId}/stats`, { stats })
    return data.stats
  },

  async getPlayerStatsByTeam(categoryId: string, teamId: string): Promise<PlayerSeasonStats[]> {
    const { data } = await api.get<{ stats: PlayerSeasonStats[] }>(`/api/categories/${categoryId}/teams/${teamId}/player-stats`)
    return data.stats
  },

  async getStatsSummary(categoryId: string): Promise<string[]> {
    const { data } = await api.get<{ gamesWithStats: string[] }>(`/api/categories/${categoryId}/stats/summary`)
    return data.gamesWithStats
  },

  async saveGameForfeit(gameId: string, forfeitTeamId: string, winnerRuns: number, winnerPlayerIds: string[]) {
    const { data } = await api.post<{ message: string }>(`/api/games/${gameId}/forfeit`, {
      forfeit_team_id: forfeitTeamId,
      winner_runs: winnerRuns,
      winner_player_ids: winnerPlayerIds,
    })
    return data
  },

  async getPlayoffConfig(categoryId: string): Promise<PlayoffConfig | null> {
    const { data } = await api.get<{ config: PlayoffConfig | null }>(`/api/categories/${categoryId}/playoffs/config`)
    return data.config
  },

  async savePlayoffConfig(categoryId: string, payload: { teams_count: number; series_format: string }): Promise<PlayoffConfig> {
    const { data } = await api.post<{ config: PlayoffConfig }>(`/api/categories/${categoryId}/playoffs/config`, payload)
    return data.config
  },

  async generatePlayoffBracket(categoryId: string, teamIds: string[]) {
    const { data } = await api.post<{ message: string; series_count: number; games_count: number }>(
      `/api/categories/${categoryId}/playoffs/generate`,
      { team_ids: teamIds }
    )
    return data
  },

  async deletePlayoffBracket(categoryId: string) {
    await api.delete(`/api/categories/${categoryId}/playoffs`)
  },

  async getPlayoffBracket(categoryId: string): Promise<PlayoffBracketResponse> {
    const { data } = await api.get<PlayoffBracketResponse>(`/api/categories/${categoryId}/playoffs/bracket`)
    return data
  },

  async advancePlayoffSeries(seriesId: string) {
    const { data } = await api.put<{ message: string; winner_team_id?: string; home_wins: number; away_wins: number }>(
      `/api/playoff-series/${seriesId}/advance`,
      {}
    )
    return data
  },

  async getPlayoffStandings(categoryId: string): Promise<StandingRow[]> {
    const { data } = await api.get<{ standings: StandingRow[] }>(`/api/categories/${categoryId}/playoffs/standings`)
    return data.standings
  },

  async getPlayoffPlayerStats(categoryId: string, teamId: string): Promise<PlayerSeasonStats[]> {
    const { data } = await api.get<{ stats: PlayerSeasonStats[] }>(`/api/categories/${categoryId}/playoffs/player-stats/${teamId}`)
    return data.stats
  },

  async listPlayerParents(playerId: string): Promise<PlayerParent[]> {
    const { data } = await api.get<{ parents: PlayerParent[] }>(`/api/players/${playerId}/parents`)
    return data.parents
  },

  async createPlayerParent(playerId: string, payload: { full_name: string; phone?: string; address?: string }): Promise<PlayerParent> {
    const { data } = await api.post<{ parent: PlayerParent }>(`/api/players/${playerId}/parents`, payload)
    return data.parent
  },

  async updatePlayerParent(parentId: string, payload: Partial<{ full_name: string; phone: string; address: string }>): Promise<PlayerParent> {
    const { data } = await api.put<{ parent: PlayerParent }>(`/api/parents/${parentId}`, payload)
    return data.parent
  },

  async deletePlayerParent(parentId: string) {
    await api.delete(`/api/parents/${parentId}`)
  },
}
