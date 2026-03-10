import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  leagueService,
  type LeagueDetail,
  type Season,
  type Category,
  type Team,
  type Player,
  type Game,
  type Matchday,
  type TeamPaymentSummary,
  type StandingRow,
  type PlayoffConfig,
  type PlayoffBracketResponse,
} from '@/services/leagueService'

export const useMyLeagueStore = defineStore('myLeague', () => {
  const league = ref<LeagueDetail | null>(null)
  const isLoaded = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const seasons = computed(() => league.value?.seasons ?? [])

  // --- Teams cache (one category at a time) ---
  const _teamsCategoryId = ref<string | null>(null)
  const teams = ref<Team[]>([])
  const teamsLoaded = ref(false)
  const teamsLoading = ref(false)

  // --- Players cache (one team at a time) ---
  const _playersTeamId = ref<string | null>(null)
  const players = ref<Player[]>([])
  const playersLoaded = ref(false)
  const playersLoading = ref(false)

  // --- Matchdays cache (one category at a time) ---
  const _matchdaysCategoryId = ref<string | null>(null)
  const matchdays = ref<Matchday[]>([])
  const matchdaysLoaded = ref(false)
  const matchdaysLoading = ref(false)

  // --- Games cache (one category at a time) ---
  const _gamesCategoryId = ref<string | null>(null)
  const games = ref<Game[]>([])
  const gamesLoaded = ref(false)
  const gamesLoading = ref(false)

  // --- Standings cache (one category at a time) ---
  const _standingsCategoryId = ref<string | null>(null)
  const standings = ref<StandingRow[]>([])
  const standingsLoaded = ref(false)
  const standingsLoading = ref(false)

  // --- Payments cache (one category at a time) ---
  const _paymentsCategoryId = ref<string | null>(null)
  const paymentsSummary = ref<TeamPaymentSummary[]>([])
  const registrationFee = ref(0)
  const paymentsLoaded = ref(false)
  const paymentsLoading = ref(false)

  // --- Stats summary cache (one category at a time) ---
  const _statsSummaryCategoryId = ref<string | null>(null)
  const statsSummary = ref<string[]>([])
  const statsSummaryLoaded = ref(false)
  const statsSummaryLoading = ref(false)

  // --- Playoff cache (one category at a time) ---
  const _playoffCategoryId = ref<string | null>(null)
  const playoffConfig = ref<PlayoffConfig | null>(null)
  const playoffBracket = ref<PlayoffBracketResponse | null>(null)
  const playoffStandings = ref<StandingRow[]>([])
  const playoffConfigLoaded = ref(false)
  const playoffConfigLoading = ref(false)
  const playoffBracketLoaded = ref(false)
  const playoffBracketLoading = ref(false)
  const playoffStandingsLoaded = ref(false)
  const playoffStandingsLoading = ref(false)

  // ========== League ==========

  function findSeason(seasonId: string): Season | undefined {
    return seasons.value.find(s => s.id === seasonId)
  }

  function findCategory(seasonId: string, categoryId: string): Category | undefined {
    const season = findSeason(seasonId)
    return season?.categories?.find(c => c.id === categoryId)
  }

  async function fetchIfNeeded(): Promise<LeagueDetail | null> {
    if (isLoaded.value && league.value) return league.value
    return await refresh()
  }

  async function refresh(): Promise<LeagueDetail | null> {
    isLoading.value = true
    error.value = null
    try {
      league.value = await leagueService.getMyLeague()
      isLoaded.value = true
      return league.value
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      error.value = e.response?.data?.error || 'Error al cargar la liga'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ========== Teams ==========

  function findTeam(teamId: string): Team | undefined {
    return teams.value.find(t => t.id === teamId)
  }

  async function fetchTeamsIfNeeded(categoryId: string): Promise<Team[]> {
    if (teamsLoaded.value && _teamsCategoryId.value === categoryId) return teams.value
    return await refreshTeams(categoryId)
  }

  async function refreshTeams(categoryId: string): Promise<Team[]> {
    teamsLoading.value = true
    try {
      teams.value = await leagueService.listTeams(categoryId)
      _teamsCategoryId.value = categoryId
      teamsLoaded.value = true
      return teams.value
    } catch (err) {
      throw err
    } finally {
      teamsLoading.value = false
    }
  }

  // ========== Players ==========

  async function fetchPlayersIfNeeded(teamId: string): Promise<Player[]> {
    if (playersLoaded.value && _playersTeamId.value === teamId) return players.value
    return await refreshPlayers(teamId)
  }

  async function refreshPlayers(teamId: string): Promise<Player[]> {
    playersLoading.value = true
    try {
      players.value = await leagueService.listPlayers(teamId)
      _playersTeamId.value = teamId
      playersLoaded.value = true
      return players.value
    } catch (err) {
      throw err
    } finally {
      playersLoading.value = false
    }
  }

  // ========== Matchdays ==========

  async function fetchMatchdaysIfNeeded(categoryId: string): Promise<Matchday[]> {
    if (matchdaysLoaded.value && _matchdaysCategoryId.value === categoryId) return matchdays.value
    return await refreshMatchdays(categoryId)
  }

  async function refreshMatchdays(categoryId: string): Promise<Matchday[]> {
    matchdaysLoading.value = true
    try {
      matchdays.value = await leagueService.listMatchdays(categoryId)
      _matchdaysCategoryId.value = categoryId
      matchdaysLoaded.value = true
      return matchdays.value
    } catch (err) {
      throw err
    } finally {
      matchdaysLoading.value = false
    }
  }

  // ========== Games ==========

  async function fetchGamesIfNeeded(categoryId: string): Promise<Game[]> {
    if (gamesLoaded.value && _gamesCategoryId.value === categoryId) return games.value
    return await refreshGames(categoryId)
  }

  async function refreshGames(categoryId: string): Promise<Game[]> {
    gamesLoading.value = true
    try {
      games.value = await leagueService.listGames(categoryId)
      _gamesCategoryId.value = categoryId
      gamesLoaded.value = true
      return games.value
    } catch (err) {
      throw err
    } finally {
      gamesLoading.value = false
    }
  }

  // ========== Standings ==========

  async function fetchStandingsIfNeeded(categoryId: string): Promise<StandingRow[]> {
    if (standingsLoaded.value && _standingsCategoryId.value === categoryId) return standings.value
    return await refreshStandings(categoryId)
  }

  async function refreshStandings(categoryId: string): Promise<StandingRow[]> {
    standingsLoading.value = true
    try {
      standings.value = await leagueService.getStandings(categoryId)
      _standingsCategoryId.value = categoryId
      standingsLoaded.value = true
      return standings.value
    } catch (err) {
      throw err
    } finally {
      standingsLoading.value = false
    }
  }

  // ========== Payments ==========

  async function fetchPaymentsIfNeeded(categoryId: string) {
    if (paymentsLoaded.value && _paymentsCategoryId.value === categoryId) return
    return await refreshPayments(categoryId)
  }

  async function refreshPayments(categoryId: string) {
    paymentsLoading.value = true
    try {
      const data = await leagueService.getPaymentsSummary(categoryId)
      paymentsSummary.value = data.summary
      registrationFee.value = data.registration_fee
      _paymentsCategoryId.value = categoryId
      paymentsLoaded.value = true
    } catch (err) {
      throw err
    } finally {
      paymentsLoading.value = false
    }
  }

  // ========== Stats Summary ==========

  async function fetchStatsSummaryIfNeeded(categoryId: string): Promise<string[]> {
    if (statsSummaryLoaded.value && _statsSummaryCategoryId.value === categoryId) return statsSummary.value
    return await refreshStatsSummary(categoryId)
  }

  async function refreshStatsSummary(categoryId: string): Promise<string[]> {
    statsSummaryLoading.value = true
    try {
      statsSummary.value = await leagueService.getStatsSummary(categoryId)
      _statsSummaryCategoryId.value = categoryId
      statsSummaryLoaded.value = true
      return statsSummary.value
    } catch (err) {
      throw err
    } finally {
      statsSummaryLoading.value = false
    }
  }

  // ========== Playoffs ==========

  async function fetchPlayoffConfigIfNeeded(categoryId: string): Promise<PlayoffConfig | null> {
    if (playoffConfigLoaded.value && _playoffCategoryId.value === categoryId) return playoffConfig.value
    return await refreshPlayoffConfig(categoryId)
  }

  async function refreshPlayoffConfig(categoryId: string): Promise<PlayoffConfig | null> {
    playoffConfigLoading.value = true
    try {
      playoffConfig.value = await leagueService.getPlayoffConfig(categoryId)
      _playoffCategoryId.value = categoryId
      playoffConfigLoaded.value = true
      return playoffConfig.value
    } catch (err) {
      throw err
    } finally {
      playoffConfigLoading.value = false
    }
  }

  async function fetchPlayoffBracketIfNeeded(categoryId: string): Promise<PlayoffBracketResponse | null> {
    if (playoffBracketLoaded.value && _playoffCategoryId.value === categoryId) return playoffBracket.value
    return await refreshPlayoffBracket(categoryId)
  }

  async function refreshPlayoffBracket(categoryId: string): Promise<PlayoffBracketResponse | null> {
    playoffBracketLoading.value = true
    try {
      playoffBracket.value = await leagueService.getPlayoffBracket(categoryId)
      playoffConfig.value = playoffBracket.value?.config ?? null
      _playoffCategoryId.value = categoryId
      playoffBracketLoaded.value = true
      playoffConfigLoaded.value = true
      return playoffBracket.value
    } catch (err) {
      throw err
    } finally {
      playoffBracketLoading.value = false
    }
  }

  async function fetchPlayoffStandingsIfNeeded(categoryId: string): Promise<StandingRow[]> {
    if (playoffStandingsLoaded.value && _playoffCategoryId.value === categoryId) return playoffStandings.value
    return await refreshPlayoffStandings(categoryId)
  }

  async function refreshPlayoffStandings(categoryId: string): Promise<StandingRow[]> {
    playoffStandingsLoading.value = true
    try {
      playoffStandings.value = await leagueService.getPlayoffStandings(categoryId)
      _playoffCategoryId.value = categoryId
      playoffStandingsLoaded.value = true
      return playoffStandings.value
    } catch (err) {
      throw err
    } finally {
      playoffStandingsLoading.value = false
    }
  }

  function invalidatePlayoffs() {
    playoffConfigLoaded.value = false
    playoffBracketLoaded.value = false
    playoffStandingsLoaded.value = false
  }

  // ========== Invalidation ==========

  function invalidateTeams() {
    teamsLoaded.value = false
  }

  function invalidatePlayers() {
    playersLoaded.value = false
  }

  function invalidateMatchdays() {
    matchdaysLoaded.value = false
  }

  function invalidateGames() {
    gamesLoaded.value = false
    invalidateMatchdays()
    invalidateStandings()
  }

  function invalidateStandings() {
    standingsLoaded.value = false
  }

  function invalidatePayments() {
    paymentsLoaded.value = false
  }

  function invalidateStatsSummary() {
    statsSummaryLoaded.value = false
  }

  function invalidateCategoryData() {
    invalidateTeams()
    invalidateMatchdays()
    invalidateGames()
    invalidatePayments()
    invalidateStandings()
    invalidateStatsSummary()
    invalidatePlayoffs()
  }

  // ========== Clear ==========

  function clear() {
    league.value = null
    isLoaded.value = false
    error.value = null

    _teamsCategoryId.value = null
    teams.value = []
    teamsLoaded.value = false

    _playersTeamId.value = null
    players.value = []
    playersLoaded.value = false

    _matchdaysCategoryId.value = null
    matchdays.value = []
    matchdaysLoaded.value = false

    _gamesCategoryId.value = null
    games.value = []
    gamesLoaded.value = false

    _standingsCategoryId.value = null
    standings.value = []
    standingsLoaded.value = false

    _paymentsCategoryId.value = null
    paymentsSummary.value = []
    registrationFee.value = 0
    paymentsLoaded.value = false

    _statsSummaryCategoryId.value = null
    statsSummary.value = []
    statsSummaryLoaded.value = false

    _playoffCategoryId.value = null
    playoffConfig.value = null
    playoffBracket.value = null
    playoffStandings.value = []
    playoffConfigLoaded.value = false
    playoffBracketLoaded.value = false
    playoffStandingsLoaded.value = false
  }

  return {
    league,
    isLoaded,
    isLoading,
    error,
    seasons,
    findSeason,
    findCategory,
    fetchIfNeeded,
    refresh,

    teams,
    teamsLoaded,
    teamsLoading,
    findTeam,
    fetchTeamsIfNeeded,
    refreshTeams,

    players,
    playersLoaded,
    playersLoading,
    fetchPlayersIfNeeded,
    refreshPlayers,

    matchdays,
    matchdaysLoaded,
    matchdaysLoading,
    fetchMatchdaysIfNeeded,
    refreshMatchdays,

    games,
    gamesLoaded,
    gamesLoading,
    fetchGamesIfNeeded,
    refreshGames,

    standings,
    standingsLoaded,
    standingsLoading,
    fetchStandingsIfNeeded,
    refreshStandings,

    paymentsSummary,
    registrationFee,
    paymentsLoaded,
    paymentsLoading,
    fetchPaymentsIfNeeded,
    refreshPayments,

    statsSummary,
    statsSummaryLoaded,
    statsSummaryLoading,
    fetchStatsSummaryIfNeeded,
    refreshStatsSummary,

    playoffConfig,
    playoffBracket,
    playoffStandings,
    playoffConfigLoaded,
    playoffConfigLoading,
    playoffBracketLoaded,
    playoffBracketLoading,
    playoffStandingsLoaded,
    playoffStandingsLoading,
    fetchPlayoffConfigIfNeeded,
    refreshPlayoffConfig,
    fetchPlayoffBracketIfNeeded,
    refreshPlayoffBracket,
    fetchPlayoffStandingsIfNeeded,
    refreshPlayoffStandings,

    invalidateTeams,
    invalidateMatchdays,
    invalidateGames,
    invalidatePlayers,
    invalidatePayments,
    invalidateStandings,
    invalidateStatsSummary,
    invalidatePlayoffs,
    invalidateCategoryData,

    clear,
  }
})
