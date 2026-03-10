import { defineStore } from 'pinia'
import { ref } from 'vue'
import { managerService, type ManagerTeam, type ManagerTeamDetail, type ManagerPaymentInfo } from '@/services/managerService'
import type { Game, Player, StandingRow, PlayerSeasonStats } from '@/services/leagueService'

export const useManagerStore = defineStore('manager', () => {
  const teams = ref<ManagerTeam[]>([])
  const teamsLoaded = ref(false)
  const teamsLoading = ref(false)

  const currentTeam = ref<ManagerTeamDetail | null>(null)
  const currentTeamLoading = ref(false)

  const _rosterTeamId = ref<string | null>(null)
  const roster = ref<Player[]>([])
  const rosterLoaded = ref(false)
  const rosterLoading = ref(false)

  const _gamesTeamId = ref<string | null>(null)
  const games = ref<Game[]>([])
  const gamesLoaded = ref(false)
  const gamesLoading = ref(false)

  const _standingsTeamId = ref<string | null>(null)
  const standings = ref<StandingRow[]>([])
  const standingsLoaded = ref(false)
  const standingsLoading = ref(false)

  const _statsTeamId = ref<string | null>(null)
  const stats = ref<PlayerSeasonStats[]>([])
  const statsLoaded = ref(false)
  const statsLoading = ref(false)

  const _paymentInfoTeamId = ref<string | null>(null)
  const paymentInfo = ref<ManagerPaymentInfo | null>(null)
  const paymentInfoLoaded = ref(false)
  const paymentInfoLoading = ref(false)

  async function fetchTeams(): Promise<ManagerTeam[]> {
    if (teamsLoaded.value) return teams.value
    return await refreshTeams()
  }

  async function refreshTeams(): Promise<ManagerTeam[]> {
    teamsLoading.value = true
    try {
      teams.value = await managerService.getMyTeams()
      teamsLoaded.value = true
      return teams.value
    } finally {
      teamsLoading.value = false
    }
  }

  async function fetchTeamDetail(teamId: string): Promise<ManagerTeamDetail> {
    if (currentTeam.value?.id === teamId) return currentTeam.value
    currentTeamLoading.value = true
    try {
      currentTeam.value = await managerService.getTeamDetail(teamId)
      return currentTeam.value
    } finally {
      currentTeamLoading.value = false
    }
  }

  async function fetchRosterIfNeeded(teamId: string): Promise<Player[]> {
    if (rosterLoaded.value && _rosterTeamId.value === teamId) return roster.value
    return await refreshRoster(teamId)
  }

  async function refreshRoster(teamId: string): Promise<Player[]> {
    rosterLoading.value = true
    try {
      roster.value = await managerService.getTeamRoster(teamId)
      _rosterTeamId.value = teamId
      rosterLoaded.value = true
      return roster.value
    } finally {
      rosterLoading.value = false
    }
  }

  async function fetchGamesIfNeeded(teamId: string): Promise<Game[]> {
    if (gamesLoaded.value && _gamesTeamId.value === teamId) return games.value
    return await refreshGames(teamId)
  }

  async function refreshGames(teamId: string): Promise<Game[]> {
    gamesLoading.value = true
    try {
      games.value = await managerService.getTeamGames(teamId)
      _gamesTeamId.value = teamId
      gamesLoaded.value = true
      return games.value
    } finally {
      gamesLoading.value = false
    }
  }

  async function fetchStandingsIfNeeded(teamId: string): Promise<StandingRow[]> {
    if (standingsLoaded.value && _standingsTeamId.value === teamId) return standings.value
    return await refreshStandings(teamId)
  }

  async function refreshStandings(teamId: string): Promise<StandingRow[]> {
    standingsLoading.value = true
    try {
      standings.value = await managerService.getTeamStandings(teamId)
      _standingsTeamId.value = teamId
      standingsLoaded.value = true
      return standings.value
    } finally {
      standingsLoading.value = false
    }
  }

  async function fetchStatsIfNeeded(teamId: string): Promise<PlayerSeasonStats[]> {
    if (statsLoaded.value && _statsTeamId.value === teamId) return stats.value
    return await refreshStats(teamId)
  }

  async function refreshStats(teamId: string): Promise<PlayerSeasonStats[]> {
    statsLoading.value = true
    try {
      stats.value = await managerService.getTeamStats(teamId)
      _statsTeamId.value = teamId
      statsLoaded.value = true
      return stats.value
    } finally {
      statsLoading.value = false
    }
  }

  async function fetchPaymentInfoIfNeeded(teamId: string): Promise<ManagerPaymentInfo | null> {
    if (paymentInfoLoaded.value && _paymentInfoTeamId.value === teamId) return paymentInfo.value
    return await refreshPaymentInfo(teamId)
  }

  async function refreshPaymentInfo(teamId: string): Promise<ManagerPaymentInfo> {
    paymentInfoLoading.value = true
    try {
      paymentInfo.value = await managerService.getTeamPayments(teamId)
      _paymentInfoTeamId.value = teamId
      paymentInfoLoaded.value = true
      return paymentInfo.value
    } finally {
      paymentInfoLoading.value = false
    }
  }

  async function createPlayer(teamId: string, payload: { full_name: string; curp?: string; birth_date?: string | null; phone?: string }, photoFile?: File | null) {
    const player = await managerService.createPlayer(teamId, payload)
    if (photoFile) {
      await managerService.uploadPlayerPhoto(player.id, photoFile)
    }
    await refreshRoster(teamId)
  }

  async function updatePlayer(teamId: string, playerId: string, payload: Partial<{ full_name: string; curp: string; birth_date: string | null; is_active: boolean; phone: string }>, photoFile?: File | null) {
    await managerService.updatePlayer(playerId, payload)
    if (photoFile) {
      await managerService.uploadPlayerPhoto(playerId, photoFile)
    }
    await refreshRoster(teamId)
  }

  function clear() {
    teams.value = []
    teamsLoaded.value = false
    currentTeam.value = null
    roster.value = []
    rosterLoaded.value = false
    _rosterTeamId.value = null
    games.value = []
    gamesLoaded.value = false
    _gamesTeamId.value = null
    standings.value = []
    standingsLoaded.value = false
    _standingsTeamId.value = null
    stats.value = []
    statsLoaded.value = false
    _statsTeamId.value = null
    paymentInfo.value = null
    paymentInfoLoaded.value = false
    _paymentInfoTeamId.value = null
  }

  return {
    teams, teamsLoaded, teamsLoading,
    currentTeam, currentTeamLoading,
    roster, rosterLoaded, rosterLoading,
    games, gamesLoaded, gamesLoading,
    standings, standingsLoaded, standingsLoading,
    stats, statsLoaded, statsLoading,
    paymentInfo, paymentInfoLoaded, paymentInfoLoading,
    fetchTeams, refreshTeams,
    fetchTeamDetail,
    fetchRosterIfNeeded, refreshRoster,
    fetchGamesIfNeeded, refreshGames,
    fetchStandingsIfNeeded, refreshStandings,
    fetchStatsIfNeeded, refreshStats,
    fetchPaymentInfoIfNeeded, refreshPaymentInfo,
    createPlayer, updatePlayer,
    clear,
  }
})
