<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef, reactive } from 'vue'
import {
  leagueService,
  type Game,
  type Player,
  type PlayerGameStats,
  type SaveStatEntry,
} from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import BoxScoreView from '@/components/games/BoxScoreView.vue'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const error = ref<string | null>(null)
const selectedMatchday = ref<number | null>(null)

const currentStep = ref<null | 'select' | 'stats' | 'summary'>(null)
const activeGame = ref<Game | null>(null)
const cameFromSummary = ref(false)
const forfeitMode = ref(false)
const forfeitTeamId = ref<string | null>(null)
const forfeitRuns = ref(0)

const gamePlayers = reactive<Record<string, { home: Player[]; away: Player[] }>>({})
const gameExistingStats = reactive<Record<string, PlayerGameStats[]>>({})
const selectedPlayers = reactive<Record<string, Set<string>>>({})
const playerStatInputs = reactive<Record<string, Record<string, SaveStatEntry>>>({})
const gameLoadingState = reactive<Record<string, boolean>>({})
const gameSavingState = reactive<Record<string, boolean>>({})
const gameSaveSuccess = reactive<Record<string, boolean>>({})
const gameHasStats = reactive<Record<string, boolean>>({})

const MIN_PLAYERS_PER_TEAM = 9

const STAT_FIELDS = ['at_bats', 'hits', 'doubles', 'triples', 'home_runs', 'walks', 'strikeouts', 'runs', 'rbi'] as const
const STAT_LABELS: Record<string, string> = {
  at_bats: 'AB',
  hits: 'H',
  doubles: '2B',
  triples: '3B',
  home_runs: 'HR',
  walks: 'BB',
  strikeouts: 'K',
  runs: 'R',
  rbi: 'RBI',
}

onMounted(async () => {
  error.value = null
  try {
    await Promise.all([
      store.fetchGamesIfNeeded(categoryId.value),
      store.fetchTeamsIfNeeded(categoryId.value),
    ])
    autoSelectMatchday()
    await checkGamesWithStats()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar datos'
  }
})

async function checkGamesWithStats() {
  try {
    const ids = await leagueService.getStatsSummary(categoryId.value)
    const set = new Set(ids)
    for (const game of store.games) {
      gameHasStats[game.id] = set.has(game.id)
    }
  } catch {
    for (const game of store.games) {
      gameHasStats[game.id] = false
    }
  }
}

const matchdays = computed(() => {
  const map = new Map<number, Game[]>()
  for (const g of store.games) {
    const list = map.get(g.matchday) || []
    list.push(g)
    map.set(g.matchday, list)
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([matchday, games]) => ({ matchday, games }))
})

const displayedMatchdays = computed(() => {
  if (selectedMatchday.value === null) return matchdays.value
  return matchdays.value.filter(md => md.matchday === selectedMatchday.value)
})

const matchdayNumbers = computed(() => matchdays.value.map(md => md.matchday))

const currentMatchdayIndex = computed(() => {
  if (selectedMatchday.value === null) return -1
  return matchdayNumbers.value.indexOf(selectedMatchday.value)
})

const canGoPrev = computed(() => selectedMatchday.value !== null && currentMatchdayIndex.value > 0)
const canGoNext = computed(() => selectedMatchday.value !== null && currentMatchdayIndex.value < matchdayNumbers.value.length - 1)

function autoSelectMatchday() {
  if (matchdays.value.length === 0) {
    selectedMatchday.value = null
    return
  }
  const active = matchdays.value.find(md =>
    md.games.some(g => g.status === 'scheduled' || g.status === 'in_progress')
  )
  if (active) {
    selectedMatchday.value = active.matchday
  } else {
    selectedMatchday.value = matchdays.value[matchdays.value.length - 1].matchday
  }
}

function selectMatchday(n: number | null) {
  selectedMatchday.value = n
}

function prevMatchday() {
  if (!canGoPrev.value) return
  selectedMatchday.value = matchdayNumbers.value[currentMatchdayIndex.value - 1]
}

function nextMatchday() {
  if (!canGoNext.value) return
  selectedMatchday.value = matchdayNumbers.value[currentMatchdayIndex.value + 1]
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: 'Programado',
    in_progress: 'En Juego',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
    forfeit: 'Forfeit',
  }
  return labels[status] || status
}

function statusClasses(status: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-gray-500/10 text-gray-400',
    in_progress: 'bg-gold-400/10 text-gold-400',
    completed: 'bg-green-400/10 text-green-400',
    cancelled: 'bg-red-400/10 text-red-400',
    forfeit: 'bg-orange-400/10 text-orange-400',
  }
  return map[status] || 'bg-gray-500/10 text-gray-400'
}

function emptyStatEntry(playerId: string, teamId: string): SaveStatEntry {
  return {
    player_id: playerId,
    team_id: teamId,
    at_bats: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    home_runs: 0,
    walks: 0,
    strikeouts: 0,
    runs: 0,
    rbi: 0,
  }
}

async function openGame(game: Game) {
  activeGame.value = game
  cameFromSummary.value = false
  forfeitMode.value = false
  forfeitTeamId.value = null
  forfeitRuns.value = 0
  gameSaveSuccess[game.id] = false

  if (gamePlayers[game.id]) {
    currentStep.value = gameHasStats[game.id] ? 'summary' : 'select'
    return
  }

  currentStep.value = 'select'
  gameLoadingState[game.id] = true
  try {
    const [homePlayers, awayPlayers, existingStats] = await Promise.all([
      leagueService.listPlayers(game.home_team_id),
      leagueService.listPlayers(game.away_team_id),
      leagueService.getGameStats(game.id),
    ])

    const activeHome = homePlayers.filter(p => p.is_active)
    const activeAway = awayPlayers.filter(p => p.is_active)

    gamePlayers[game.id] = { home: activeHome, away: activeAway }
    gameExistingStats[game.id] = existingStats

    const selected = new Set<string>()
    const inputs: Record<string, SaveStatEntry> = {}

    for (const s of existingStats) {
      selected.add(s.player_id)
      inputs[s.player_id] = {
        player_id: s.player_id,
        team_id: s.team_id,
        at_bats: s.at_bats,
        hits: s.hits,
        doubles: s.doubles,
        triples: s.triples,
        home_runs: s.home_runs,
        walks: s.walks,
        strikeouts: s.strikeouts,
        runs: s.runs,
        rbi: s.rbi,
      }
    }

    for (const p of activeHome) {
      if (!inputs[p.id]) {
        inputs[p.id] = emptyStatEntry(p.id, game.home_team_id)
      }
    }
    for (const p of activeAway) {
      if (!inputs[p.id]) {
        inputs[p.id] = emptyStatEntry(p.id, game.away_team_id)
      }
    }

    selectedPlayers[game.id] = selected
    playerStatInputs[game.id] = inputs
    gameHasStats[game.id] = existingStats.length > 0

    if (existingStats.length > 0) {
      currentStep.value = 'summary'
    }
  } catch {
    error.value = 'Error al cargar jugadores'
  } finally {
    gameLoadingState[game.id] = false
  }
}

function goBack() {
  if (currentStep.value === 'stats') {
    currentStep.value = 'select'
  } else if (currentStep.value === 'select' && cameFromSummary.value) {
    currentStep.value = 'summary'
    cameFromSummary.value = false
    forfeitMode.value = false
    forfeitTeamId.value = null
    forfeitRuns.value = 0
  } else {
    currentStep.value = null
    activeGame.value = null
    cameFromSummary.value = false
    forfeitMode.value = false
    forfeitTeamId.value = null
    forfeitRuns.value = 0
  }
}

function editFromSummary() {
  cameFromSummary.value = true
  currentStep.value = 'select'
}

function togglePlayer(gameId: string, playerId: string) {
  const set = selectedPlayers[gameId]
  if (!set) return
  if (set.has(playerId)) {
    set.delete(playerId)
  } else {
    set.add(playerId)
  }
}

function isPlayerSelected(gameId: string, playerId: string): boolean {
  return selectedPlayers[gameId]?.has(playerId) ?? false
}

function getStatInput(gameId: string, playerId: string): SaveStatEntry | undefined {
  return playerStatInputs[gameId]?.[playerId]
}

function updateStat(gameId: string, playerId: string, field: string, value: number) {
  const inputs = playerStatInputs[gameId]
  if (!inputs || !inputs[playerId]) return
  ;(inputs[playerId] as unknown as Record<string, unknown>)[field] = Math.max(0, value)
}

function selectAllPlayers(gameId: string, teamPlayers: Player[]) {
  const set = selectedPlayers[gameId]
  if (!set) return
  const allSelected = teamPlayers.every(p => set.has(p.id))
  if (allSelected) {
    teamPlayers.forEach(p => set.delete(p.id))
  } else {
    teamPlayers.forEach(p => set.add(p.id))
  }
}

function isAllSelected(gameId: string, teamPlayers: Player[]): boolean {
  const set = selectedPlayers[gameId]
  if (!set || teamPlayers.length === 0) return false
  return teamPlayers.every(p => set.has(p.id))
}

function toggleForfeit(teamId: string) {
  if (!activeGame.value) return
  const gameId = activeGame.value.id

  if (forfeitTeamId.value === teamId) {
    forfeitMode.value = false
    forfeitTeamId.value = null
    return
  }

  forfeitMode.value = true
  forfeitTeamId.value = teamId

  const winnerSide = teamId === activeGame.value.home_team_id ? 'away' : 'home'
  const players = gamePlayers[gameId]
  if (!players) return

  const set = selectedPlayers[gameId]
  if (!set) return

  const loserSide = winnerSide === 'home' ? 'away' : 'home'
  players[loserSide].forEach(p => set.delete(p.id))
  players[winnerSide].forEach(p => set.add(p.id))
}

const homeSelectedCount = computed(() => {
  if (!activeGame.value) return 0
  const gameId = activeGame.value.id
  const set = selectedPlayers[gameId]
  const players = gamePlayers[gameId]?.home
  if (!set || !players) return 0
  return players.filter(p => set.has(p.id)).length
})

const awaySelectedCount = computed(() => {
  if (!activeGame.value) return 0
  const gameId = activeGame.value.id
  const set = selectedPlayers[gameId]
  const players = gamePlayers[gameId]?.away
  if (!set || !players) return 0
  return players.filter(p => set.has(p.id)).length
})

const canProceedToStats = computed(() => {
  if (!activeGame.value) return false
  if (forfeitMode.value) {
    const winnerCount = forfeitTeamId.value === activeGame.value.home_team_id
      ? awaySelectedCount.value
      : homeSelectedCount.value
    return winnerCount >= 1
  }
  return homeSelectedCount.value >= MIN_PLAYERS_PER_TEAM && awaySelectedCount.value >= MIN_PLAYERS_PER_TEAM
})

function goToStats() {
  if (!canProceedToStats.value) return
  currentStep.value = 'stats'
}

const selectedHomePlayers = computed(() => {
  if (!activeGame.value) return []
  const gameId = activeGame.value.id
  const set = selectedPlayers[gameId]
  const players = gamePlayers[gameId]?.home
  if (!set || !players) return []
  return players.filter(p => set.has(p.id))
})

const selectedAwayPlayers = computed(() => {
  if (!activeGame.value) return []
  const gameId = activeGame.value.id
  const set = selectedPlayers[gameId]
  const players = gamePlayers[gameId]?.away
  if (!set || !players) return []
  return players.filter(p => set.has(p.id))
})

async function saveStats() {
  if (!activeGame.value) return
  const game = activeGame.value
  const set = selectedPlayers[game.id]
  const inputs = playerStatInputs[game.id]
  if (!set || !inputs) return

  gameSavingState[game.id] = true
  gameSaveSuccess[game.id] = false
  error.value = null
  try {
    const entries: SaveStatEntry[] = []
    for (const playerId of set) {
      const input = inputs[playerId]
      if (input) entries.push(input)
    }

    const saved = await leagueService.saveGameStats(game.id, entries)
    gameExistingStats[game.id] = saved
    gameHasStats[game.id] = saved.length > 0
    gameSaveSuccess[game.id] = true
    setTimeout(() => {
      gameSaveSuccess[game.id] = false
      cameFromSummary.value = false
      currentStep.value = 'summary'
    }, 1000)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al guardar estadisticas. Intenta de nuevo.'
  } finally {
    gameSavingState[game.id] = false
  }
}

async function saveForfeit() {
  if (!activeGame.value || !forfeitTeamId.value) return
  const game = activeGame.value

  const winnerSide = forfeitTeamId.value === game.home_team_id ? 'away' : 'home'
  const winnerPlayers = winnerSide === 'home' ? selectedHomePlayers.value : selectedAwayPlayers.value
  const winnerPlayerIds = winnerPlayers.map(p => p.id)

  gameSavingState[game.id] = true
  gameSaveSuccess[game.id] = false
  error.value = null
  try {
    await leagueService.saveGameForfeit(game.id, forfeitTeamId.value, forfeitRuns.value, winnerPlayerIds)
    gameHasStats[game.id] = true

    const updatedIdx = store.games.findIndex(g => g.id === game.id)
    if (updatedIdx !== -1) {
      store.games[updatedIdx].status = 'forfeit'
      store.games[updatedIdx].forfeit_team_id = forfeitTeamId.value
      const winnerTeamId = forfeitTeamId.value === game.home_team_id ? game.away_team_id : game.home_team_id
      store.games[updatedIdx].home_score = winnerTeamId === game.home_team_id ? forfeitRuns.value : 0
      store.games[updatedIdx].away_score = winnerTeamId === game.away_team_id ? forfeitRuns.value : 0
    }

    const refreshedStats = await leagueService.getGameStats(game.id)
    gameExistingStats[game.id] = refreshedStats

    gameSaveSuccess[game.id] = true
    setTimeout(() => {
      gameSaveSuccess[game.id] = false
      cameFromSummary.value = false
      forfeitMode.value = false
      forfeitTeamId.value = null
      forfeitRuns.value = 0
      currentStep.value = 'summary'
    }, 1000)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al guardar forfeit. Intenta de nuevo.'
  } finally {
    gameSavingState[game.id] = false
  }
}

function forfeitWinnerName(): string {
  if (!activeGame.value || !forfeitTeamId.value) return ''
  return forfeitTeamId.value === activeGame.value.home_team_id
    ? activeGame.value.away_team_name
    : activeGame.value.home_team_name
}

function forfeitLoserName(): string {
  if (!activeGame.value || !forfeitTeamId.value) return ''
  return forfeitTeamId.value === activeGame.value.home_team_id
    ? activeGame.value.home_team_name
    : activeGame.value.away_team_name
}
</script>

<template>
  <div class="card p-6">
    <!-- HEADER -->
    <div class="mb-6">
      <div class="flex items-center gap-3">
        <button
          v-if="currentStep !== null"
          @click="goBack"
          class="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-navy-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 class="text-lg font-semibold text-white">Metricas por Jornada</h2>
          <p v-if="currentStep === null && store.games.length > 0" class="text-gray-500 text-xs mt-0.5">
            Selecciona un juego para capturar estadisticas
          </p>
          <p v-else-if="currentStep === 'summary' && activeGame" class="text-gray-500 text-xs mt-0.5">
            Box Score - Jornada {{ activeGame.matchday }}
          </p>
        </div>
      </div>

      <!-- STEPPER (only for select/stats steps) -->
      <div v-if="(currentStep === 'select' || currentStep === 'stats') && activeGame" class="mt-4">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              :class="currentStep === 'select'
                ? 'bg-cardinal-600 text-white'
                : 'bg-green-500 text-white'"
            >
              <svg v-if="currentStep === 'stats'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else>1</span>
            </div>
            <span class="text-xs font-medium" :class="currentStep === 'select' ? 'text-white' : 'text-green-400'">Jugadores</span>
          </div>
          <div class="w-8 h-px" :class="currentStep === 'stats' ? 'bg-green-500' : 'bg-navy-600'"></div>
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
              :class="currentStep === 'stats'
                ? 'bg-cardinal-600 text-white'
                : 'bg-navy-700 text-gray-500'"
            >
              2
            </div>
            <span class="text-xs font-medium" :class="currentStep === 'stats' ? 'text-white' : 'text-gray-500'">
              {{ forfeitMode ? 'Forfeit' : 'Estadisticas' }}
            </span>
          </div>
        </div>

        <!-- Active game header -->
        <div class="mt-3 p-3 bg-navy-900 border border-navy-700 rounded-lg">
          <div class="flex items-center justify-center gap-3">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded bg-blue-400/10 flex items-center justify-center">
                <span class="text-[10px] font-bold text-blue-400">{{ activeGame.home_team_name.charAt(0) }}</span>
              </div>
              <span class="text-sm text-white font-medium">{{ activeGame.home_team_name }}</span>
            </div>
            <span class="text-xs text-gray-500 font-medium px-2">vs</span>
            <div class="flex items-center gap-2">
              <span class="text-sm text-white font-medium">{{ activeGame.away_team_name }}</span>
              <div class="w-6 h-6 rounded bg-cardinal-600/10 flex items-center justify-center">
                <span class="text-[10px] font-bold text-cardinal-400">{{ activeGame.away_team_name.charAt(0) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== LIST VIEW ==================== -->
    <template v-if="currentStep === null">
      <!-- Matchday navigation -->
      <div v-if="!store.gamesLoading && !error && store.games.length > 0" class="mb-5">
        <div class="flex items-center gap-2">
          <button
            :disabled="!canGoPrev"
            @click="prevMatchday"
            class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div class="flex overflow-x-auto gap-1.5 scrollbar-hide flex-1">
            <button
              @click="selectMatchday(null)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0"
              :class="selectedMatchday === null
                ? 'bg-cardinal-600 text-white'
                : 'bg-navy-700 text-gray-400 hover:text-white hover:bg-navy-600'"
            >
              Todas
            </button>
            <button
              v-for="md in matchdays"
              :key="md.matchday"
              @click="selectMatchday(md.matchday)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 text-center"
              :class="selectedMatchday === md.matchday
                ? 'bg-cardinal-600 text-white'
                : 'bg-navy-700 text-gray-400 hover:text-white hover:bg-navy-600'"
            >
              J{{ md.matchday }}
            </button>
          </div>

          <button
            :disabled="!canGoNext"
            @click="nextMatchday"
            class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="store.gamesLoading" class="space-y-4">
        <div v-for="i in 3" :key="i" class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse">
          <div class="h-4 bg-navy-700 rounded w-2/3 mb-2"></div>
          <div class="h-3 bg-navy-700 rounded w-1/3"></div>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-center py-8">
        <p class="text-red-400 text-sm">{{ error }}</p>
      </div>

      <!-- Empty -->
      <div v-else-if="store.games.length === 0" class="text-center py-12">
        <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 class="text-white font-semibold mb-2">No hay juegos programados</h3>
        <p class="text-gray-500 text-sm max-w-sm mx-auto">
          Primero debes crear juegos en la seccion de Juegos para poder registrar estadisticas.
        </p>
      </div>

      <!-- Game cards by matchday -->
      <div v-else class="space-y-6">
        <div v-for="md in displayedMatchdays" :key="md.matchday">
          <div class="flex items-center gap-3 mb-3">
            <h3 class="text-sm font-semibold text-white">Jornada {{ md.matchday }}</h3>
            <span class="text-xs text-gray-500 bg-navy-700 px-2 py-0.5 rounded-full">
              {{ md.games.length }} partido{{ md.games.length === 1 ? '' : 's' }}
            </span>
          </div>

          <div class="space-y-2">
            <button
              v-for="game in md.games"
              :key="game.id"
              @click="openGame(game)"
              class="w-full bg-navy-900 border border-navy-700 hover:border-navy-500 rounded-lg px-4 py-3 text-left transition-all duration-200 group"
            >
              <div class="flex items-center gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <div class="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                        <span class="text-xs font-bold text-blue-400">{{ game.home_team_name.charAt(0) }}</span>
                      </div>
                      <span class="text-sm text-white truncate">{{ game.home_team_name }}</span>
                    </div>

                    <div class="flex items-center gap-1.5 flex-shrink-0 px-2">
                      <template v-if="game.home_score !== null && game.away_score !== null">
                        <span class="text-lg font-bold text-white w-6 text-center">{{ game.home_score }}</span>
                        <span class="text-xs text-gray-500">-</span>
                        <span class="text-lg font-bold text-white w-6 text-center">{{ game.away_score }}</span>
                      </template>
                      <template v-else>
                        <span class="text-sm text-gray-500 font-medium">vs</span>
                      </template>
                    </div>

                    <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span class="text-sm text-white truncate text-right">{{ game.away_team_name }}</span>
                      <div class="w-7 h-7 rounded-lg bg-cardinal-600/10 flex items-center justify-center flex-shrink-0">
                        <span class="text-xs font-bold text-cardinal-400">{{ game.away_team_name.charAt(0) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 mt-2">
                    <span
                      class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                      :class="statusClasses(game.status)"
                    >
                      {{ statusLabel(game.status) }}
                    </span>
                    <span
                      v-if="gameHasStats[game.id]"
                      class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-teal-400/10 text-teal-400"
                    >
                      Stats capturados
                    </span>
                    <span
                      v-else
                      class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-400/10 text-orange-400"
                    >
                      Sin stats
                    </span>
                  </div>
                </div>

                <div class="flex-shrink-0 text-gray-600 group-hover:text-gray-400 transition-colors">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== BOX SCORE SUMMARY ==================== -->
    <template v-else-if="currentStep === 'summary' && activeGame">
      <div v-if="gameLoadingState[activeGame.id]" class="py-8 text-center">
        <div class="w-6 h-6 border-2 border-cardinal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-gray-500 text-xs">Cargando estadisticas...</p>
      </div>
      <BoxScoreView
        v-else
        :game="activeGame"
        :stats="gameExistingStats[activeGame.id] || []"
        @edit="editFromSummary"
      />
    </template>

    <!-- ==================== STEP 1: SELECT PLAYERS ==================== -->
    <template v-else-if="currentStep === 'select' && activeGame">
      <div v-if="gameLoadingState[activeGame.id]" class="py-8 text-center">
        <div class="w-6 h-6 border-2 border-cardinal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p class="text-gray-500 text-xs">Cargando jugadores...</p>
      </div>

      <div v-else-if="gamePlayers[activeGame.id]" class="space-y-5">
        <!-- Forfeit toggle -->
        <div class="bg-navy-900 border border-navy-700 rounded-lg p-4">
          <p class="text-xs font-medium text-gray-400 mb-3">Marcar como Forfeit (equipo que NO se presento)</p>
          <div class="flex gap-2">
            <button
              @click="toggleForfeit(activeGame.home_team_id)"
              class="flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200"
              :class="forfeitTeamId === activeGame.home_team_id
                ? 'bg-orange-400/10 border-orange-400/50 text-orange-400'
                : 'border-navy-600 text-gray-400 hover:text-white hover:border-navy-500'"
            >
              {{ activeGame.home_team_name }}
            </button>
            <button
              @click="toggleForfeit(activeGame.away_team_id)"
              class="flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200"
              :class="forfeitTeamId === activeGame.away_team_id
                ? 'bg-orange-400/10 border-orange-400/50 text-orange-400'
                : 'border-navy-600 text-gray-400 hover:text-white hover:border-navy-500'"
            >
              {{ activeGame.away_team_name }}
            </button>
          </div>
        </div>

        <!-- Forfeit active notice -->
        <div v-if="forfeitMode && forfeitTeamId" class="bg-orange-400/5 border border-orange-400/20 rounded-lg p-3">
          <p class="text-xs text-orange-400">
            <span class="font-semibold">{{ forfeitLoserName() }}</span> no se presento.
            <span class="font-semibold">{{ forfeitWinnerName() }}</span> gana por forfeit.
            Los jugadores seleccionados del equipo ganador recibiran credito por juego jugado.
          </p>
        </div>

        <!-- Team player lists -->
        <div
          v-for="side in (['home', 'away'] as const)"
          :key="side"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div
                class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                :class="side === 'home' ? 'bg-blue-400/10' : 'bg-cardinal-600/10'"
              >
                <span
                  class="text-[10px] font-bold"
                  :class="side === 'home' ? 'text-blue-400' : 'text-cardinal-400'"
                >
                  {{ side === 'home' ? activeGame.home_team_name.charAt(0) : activeGame.away_team_name.charAt(0) }}
                </span>
              </div>
              <h4 class="text-sm font-semibold text-white">
                {{ side === 'home' ? activeGame.home_team_name : activeGame.away_team_name }}
              </h4>
              <span class="text-[10px] text-gray-500">({{ side === 'home' ? 'Local' : 'Visitante' }})</span>
              <span class="text-[10px] font-medium ml-1" :class="(side === 'home' ? homeSelectedCount : awaySelectedCount) >= MIN_PLAYERS_PER_TEAM ? 'text-green-400' : 'text-gray-500'">
                {{ side === 'home' ? homeSelectedCount : awaySelectedCount }} sel.
              </span>
            </div>
            <button
              v-if="gamePlayers[activeGame.id][side].length > 0 && !(forfeitMode && (
                (side === 'home' && forfeitTeamId === activeGame.home_team_id) ||
                (side === 'away' && forfeitTeamId === activeGame.away_team_id)
              ))"
              @click="selectAllPlayers(activeGame.id, gamePlayers[activeGame.id][side])"
              class="text-[10px] text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-navy-700"
            >
              {{ isAllSelected(activeGame.id, gamePlayers[activeGame.id][side]) ? 'Deseleccionar todos' : 'Seleccionar todos' }}
            </button>
          </div>

          <!-- Forfeit: team didn't show up -->
          <div
            v-if="forfeitMode && (
              (side === 'home' && forfeitTeamId === activeGame.home_team_id) ||
              (side === 'away' && forfeitTeamId === activeGame.away_team_id)
            )"
            class="text-xs text-orange-400/70 pl-8 py-2"
          >
            Este equipo no se presento (Forfeit)
          </div>

          <template v-else>
            <div v-if="gamePlayers[activeGame.id][side].length === 0" class="text-xs text-gray-500 pl-8">
              No hay jugadores activos en este equipo
            </div>

            <div v-else class="space-y-0.5">
              <div v-for="player in gamePlayers[activeGame.id][side]" :key="player.id">
                <label class="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-navy-800 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    :checked="isPlayerSelected(activeGame.id, player.id)"
                    @change="togglePlayer(activeGame.id, player.id)"
                    class="w-4 h-4 rounded border-navy-600 bg-navy-700 text-cardinal-600 focus:ring-cardinal-600 focus:ring-offset-0 cursor-pointer"
                  />
                  <span class="text-sm text-white select-none">{{ player.full_name }}</span>
                </label>
              </div>
            </div>
          </template>
        </div>

        <!-- Validation message and next button -->
        <div class="pt-3 border-t border-navy-700">
          <p v-if="!forfeitMode && (homeSelectedCount < MIN_PLAYERS_PER_TEAM || awaySelectedCount < MIN_PLAYERS_PER_TEAM)" class="text-xs text-gray-500 mb-3">
            Se requieren al menos {{ MIN_PLAYERS_PER_TEAM }} jugadores por equipo para continuar
          </p>
          <div class="flex justify-end">
            <button
              @click="goToStats"
              :disabled="!canProceedToStats"
              class="btn-primary text-sm px-5 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== STEP 2: STATS (normal) ==================== -->
    <template v-else-if="currentStep === 'stats' && activeGame && !forfeitMode">
      <div class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            v-for="(players, idx) in [selectedHomePlayers, selectedAwayPlayers]"
            :key="idx"
            class="space-y-3"
          >
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                :class="idx === 0 ? 'bg-blue-400/10' : 'bg-cardinal-600/10'"
              >
                <span
                  class="text-[10px] font-bold"
                  :class="idx === 0 ? 'text-blue-400' : 'text-cardinal-400'"
                >
                  {{ idx === 0 ? activeGame.home_team_name.charAt(0) : activeGame.away_team_name.charAt(0) }}
                </span>
              </div>
              <h4 class="text-sm font-semibold text-white">
                {{ idx === 0 ? activeGame.home_team_name : activeGame.away_team_name }}
              </h4>
            </div>

            <div class="space-y-3">
              <div
                v-for="player in players"
                :key="player.id"
                class="bg-navy-900 border border-navy-700 rounded-lg p-3"
              >
                <p class="text-xs font-medium text-white mb-2">{{ player.full_name }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <div
                    v-for="field in STAT_FIELDS"
                    :key="field"
                    class="flex flex-col items-center"
                  >
                    <label class="text-[10px] font-medium text-gray-500 mb-0.5">{{ STAT_LABELS[field] }}</label>
                    <input
                      type="number"
                      min="0"
                      :value="getStatInput(activeGame.id, player.id)?.[field as keyof SaveStatEntry]"
                      @input="updateStat(activeGame.id, player.id, field, parseInt(($event.target as HTMLInputElement).value) || 0)"
                      class="w-11 h-8 text-center text-xs font-medium bg-navy-700 border border-navy-600 rounded text-white focus:border-cardinal-600 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="error && currentStep === 'stats' && !forfeitMode" class="bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-3">
          <div class="flex items-center justify-between">
            <p class="text-xs text-red-400">{{ error }}</p>
            <button @click="error = null" class="text-xs text-red-400 hover:text-red-300 ml-3 flex-shrink-0">Cerrar</button>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-navy-700">
          <p class="text-xs text-gray-500">
            {{ selectedHomePlayers.length + selectedAwayPlayers.length }} jugadores
          </p>
          <div class="flex items-center gap-3">
            <span
              v-if="gameSaveSuccess[activeGame.id]"
              class="text-xs text-green-400 font-medium"
            >
              Guardado correctamente
            </span>
            <button
              @click="saveStats"
              :disabled="gameSavingState[activeGame.id]"
              class="btn-primary text-sm px-5 py-2"
            >
              {{ gameSavingState[activeGame.id] ? 'Guardando...' : 'Guardar Estadisticas' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== STEP 2: FORFEIT ==================== -->
    <template v-else-if="currentStep === 'stats' && activeGame && forfeitMode && forfeitTeamId">
      <div class="space-y-5">
        <div class="bg-orange-400/5 border border-orange-400/20 rounded-lg p-4">
          <div class="flex items-center gap-2 mb-1">
            <svg class="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p class="text-sm font-semibold text-orange-400">Forfeit</p>
          </div>
          <p class="text-xs text-orange-300/80">
            <span class="font-semibold">{{ forfeitLoserName() }}</span> no se presento.
            <span class="font-semibold">{{ forfeitWinnerName() }}</span> gana automaticamente.
          </p>
        </div>

        <div>
          <h4 class="text-sm font-medium text-white mb-3">
            Jugadores de {{ forfeitWinnerName() }} (juego jugado)
          </h4>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div
              v-for="player in (forfeitTeamId === activeGame.home_team_id ? selectedAwayPlayers : selectedHomePlayers)"
              :key="player.id"
              class="bg-navy-900 border border-navy-700 rounded-lg px-3 py-2"
            >
              <span class="text-xs text-white">{{ player.full_name }}</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-white mb-2">
            Carreras a favor de {{ forfeitWinnerName() }}
          </label>
          <input
            type="number"
            min="0"
            v-model.number="forfeitRuns"
            class="w-24 h-10 text-center text-sm font-medium bg-navy-700 border border-navy-600 rounded-lg text-white focus:border-cardinal-600 focus:outline-none transition-colors"
          />
        </div>

        <div v-if="error && currentStep === 'stats' && forfeitMode" class="bg-red-400/10 border border-red-400/20 rounded-lg p-3 mb-3">
          <div class="flex items-center justify-between">
            <p class="text-xs text-red-400">{{ error }}</p>
            <button @click="error = null" class="text-xs text-red-400 hover:text-red-300 ml-3 flex-shrink-0">Cerrar</button>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-navy-700">
          <p class="text-xs text-gray-500">
            {{ (forfeitTeamId === activeGame.home_team_id ? selectedAwayPlayers : selectedHomePlayers).length }} jugadores registrados
          </p>
          <div class="flex items-center gap-3">
            <span
              v-if="gameSaveSuccess[activeGame.id]"
              class="text-xs text-green-400 font-medium"
            >
              Forfeit registrado
            </span>
            <button
              @click="saveForfeit"
              :disabled="gameSavingState[activeGame.id]"
              class="btn-primary text-sm px-5 py-2"
            >
              {{ gameSavingState[activeGame.id] ? 'Guardando...' : 'Guardar Forfeit' }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}
</style>
