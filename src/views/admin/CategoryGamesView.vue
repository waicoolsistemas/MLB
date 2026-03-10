<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef, type Ref } from 'vue'
import { leagueService, type Game, type Matchday, type Category } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import GameFormModal from '@/components/games/GameFormModal.vue'
import ScoreModal from '@/components/games/ScoreModal.vue'
import GenerateFixtureModal from '@/components/games/GenerateFixtureModal.vue'
import MatchdayFormModal from '@/components/games/MatchdayFormModal.vue'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!
const seasonId = inject<ComputedRef<string>>('seasonId')!
const category = inject<Ref<Category | null>>('category')!
const refreshCategory = inject<() => Promise<void>>('refreshCategory')!

const currentSeason = computed(() => store.findSeason(seasonId.value) ?? null)

const fixtureAlreadyGenerated = computed(() => category.value?.fixture_generated === true)

const error = ref<string | null>(null)

const showGameModal = ref(false)
const editingGame = ref<Game | null>(null)
const gameLoading = ref(false)
const gameError = ref<string | null>(null)

const showScoreModal = ref(false)
const scoringGame = ref<Game | null>(null)
const scoreLoading = ref(false)
const scoreError = ref<string | null>(null)

const showGenerateModal = ref(false)
const generateLoading = ref(false)
const generateError = ref<string | null>(null)

const showMatchdayModal = ref(false)
const editingMatchday = ref<Matchday | null>(null)
const matchdayLoading = ref(false)
const matchdayError = ref<string | null>(null)
const matchdayDeleteLoading = ref(false)

const deletingGameId = ref<string | null>(null)
const deleteLoading = ref(false)

const selectedMatchday = ref<number | null>(null)
const initialLoading = ref(true)

onMounted(async () => {
  error.value = null
  try {
    await Promise.all([
      store.fetchGamesIfNeeded(categoryId.value),
      store.fetchTeamsIfNeeded(categoryId.value),
      store.fetchMatchdaysIfNeeded(categoryId.value),
    ])
    autoSelectMatchday()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar juegos'
  } finally {
    initialLoading.value = false
  }
})

const matchdayTabs = computed(() => {
  const mdMap = new Map<number, { matchday: Matchday | null; games: Game[] }>()

  for (const md of store.matchdays) {
    mdMap.set(md.number, { matchday: md, games: [] })
  }

  for (const g of store.games) {
    const existing = mdMap.get(g.matchday)
    if (existing) {
      existing.games.push(g)
    } else {
      mdMap.set(g.matchday, { matchday: null, games: [g] })
    }
  }

  return Array.from(mdMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([num, data]) => ({
      number: num,
      matchday: data.matchday,
      games: data.games,
      name: data.matchday?.name || null,
    }))
})

const completedCount = computed(() => store.games.filter(g => g.status === 'completed').length)
const scheduledCount = computed(() => store.games.filter(g => g.status === 'scheduled').length)

const displayedMatchdays = computed(() => {
  if (selectedMatchday.value === null) return matchdayTabs.value
  return matchdayTabs.value.filter(md => md.number === selectedMatchday.value)
})

const matchdayNumbers = computed(() => matchdayTabs.value.map(md => md.number))

const currentMatchdayIndex = computed(() => {
  if (selectedMatchday.value === null) return -1
  return matchdayNumbers.value.indexOf(selectedMatchday.value)
})

const canGoPrev = computed(() => selectedMatchday.value !== null && currentMatchdayIndex.value > 0)
const canGoNext = computed(() => selectedMatchday.value !== null && currentMatchdayIndex.value < matchdayNumbers.value.length - 1)

const nextMatchdayNumber = computed(() => {
  if (matchdayTabs.value.length === 0) return 1
  return Math.max(...matchdayTabs.value.map(m => m.number)) + 1
})

function matchdayDisplayName(md: { number: number; name: string | null }): string {
  return md.name ? `J${md.number} - ${md.name}` : `J${md.number}`
}

function matchdayFullName(md: { number: number; name: string | null }): string {
  return md.name ? `Jornada ${md.number} -- ${md.name}` : `Jornada ${md.number}`
}

function matchdayDateRange(md: { games: Game[] }): string {
  const dates = md.games
    .filter(g => g.game_date)
    .map(g => g.game_date!)
    .sort()
  if (dates.length === 0) return ''
  const fmt = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  }
  const first = dates[0]
  const last = dates[dates.length - 1]
  if (first === last) return fmt(first)
  return `${fmt(first)} - ${fmt(last)}`
}

function selectedMatchdaySummary(): string {
  const mds = displayedMatchdays.value
  if (mds.length === 0) return ''
  const allGames = mds.flatMap(md => md.games)
  const total = allGames.length
  const done = allGames.filter(g => g.status === 'completed').length
  const pending = allGames.filter(g => g.status === 'scheduled').length
  const parts: string[] = [`${total} partido${total === 1 ? '' : 's'}`]
  if (done > 0) parts.push(`${done} finalizado${done === 1 ? '' : 's'}`)
  if (pending > 0) parts.push(`${pending} pendiente${pending === 1 ? '' : 's'}`)
  return parts.join(' · ')
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

function autoSelectMatchday() {
  if (matchdayTabs.value.length === 0) {
    selectedMatchday.value = null
    return
  }
  const active = matchdayTabs.value.find(md =>
    md.games.some(g => g.status === 'scheduled' || g.status === 'in_progress')
  )
  if (active) {
    selectedMatchday.value = active.number
  } else {
    selectedMatchday.value = matchdayTabs.value[matchdayTabs.value.length - 1].number
  }
}

function ensureValidSelection() {
  if (selectedMatchday.value === null) return
  const exists = matchdayTabs.value.some(md => md.number === selectedMatchday.value)
  if (!exists) autoSelectMatchday()
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

function formatDate(date: string | null) {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function formatTime(time: string | null) {
  if (!time) return ''
  return time.slice(0, 5)
}

function openCreateGame() {
  editingGame.value = null
  gameError.value = null
  showGameModal.value = true
}

function openEditGame(game: Game) {
  editingGame.value = game
  gameError.value = null
  showGameModal.value = true
}

function openScoreModal(game: Game) {
  scoringGame.value = game
  scoreError.value = null
  showScoreModal.value = true
}

function openGenerateModal() {
  generateError.value = null
  showGenerateModal.value = true
}

function openCreateMatchday() {
  editingMatchday.value = null
  matchdayError.value = null
  showMatchdayModal.value = true
}

function openEditMatchday(md: Matchday) {
  editingMatchday.value = md
  matchdayError.value = null
  showMatchdayModal.value = true
}

function confirmDelete(gameId: string) {
  deletingGameId.value = gameId
}

async function handleSaveGame(payload: Record<string, unknown>) {
  gameLoading.value = true
  gameError.value = null
  try {
    if (editingGame.value) {
      await leagueService.updateGame(editingGame.value.id, payload as Parameters<typeof leagueService.updateGame>[1])
    } else {
      await leagueService.createGame(categoryId.value, payload as Parameters<typeof leagueService.createGame>[1])
    }
    showGameModal.value = false
    editingGame.value = null
    await Promise.all([
      store.refreshGames(categoryId.value),
      store.refreshMatchdays(categoryId.value),
    ])
    ensureValidSelection()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    gameError.value = e.response?.data?.error || 'Error al guardar juego'
  } finally {
    gameLoading.value = false
  }
}

async function handleSaveScore(payload: { home_score: number | null; away_score: number | null; status: string; umpire_1: string | null; umpire_2: string | null; umpire_3: string | null; scorer: string | null }) {
  if (!scoringGame.value) return
  scoreLoading.value = true
  scoreError.value = null
  try {
    await leagueService.updateGame(scoringGame.value.id, payload)
    showScoreModal.value = false
    scoringGame.value = null
    await store.refreshGames(categoryId.value)
    ensureValidSelection()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    scoreError.value = e.response?.data?.error || 'Error al guardar marcador'
  } finally {
    scoreLoading.value = false
  }
}

async function handleGenerate(data: { include_return: boolean; start_date: string | null }) {
  generateLoading.value = true
  generateError.value = null
  try {
    await leagueService.generateGames(categoryId.value, data)
    showGenerateModal.value = false
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    generateError.value = e.response?.data?.error || 'Error al generar jornadas'
  } finally {
    await Promise.all([
      store.refreshGames(categoryId.value),
      store.refreshMatchdays(categoryId.value),
      refreshCategory(),
    ])
    autoSelectMatchday()
    generateLoading.value = false
  }
}

async function handleSaveMatchday(payload: Record<string, unknown>) {
  matchdayLoading.value = true
  matchdayError.value = null
  try {
    if (editingMatchday.value) {
      await leagueService.updateMatchday(editingMatchday.value.id, payload as Parameters<typeof leagueService.updateMatchday>[1])
    } else {
      await leagueService.createMatchday(categoryId.value, payload as Parameters<typeof leagueService.createMatchday>[1])
    }
    showMatchdayModal.value = false
    const newNumber = payload.number as number | undefined
    await Promise.all([
      store.refreshGames(categoryId.value),
      store.refreshMatchdays(categoryId.value),
    ])
    if (!editingMatchday.value && newNumber) {
      selectedMatchday.value = newNumber
    }
    editingMatchday.value = null
    ensureValidSelection()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    matchdayError.value = e.response?.data?.error || 'Error al guardar jornada'
  } finally {
    matchdayLoading.value = false
  }
}

async function handleDeleteMatchday() {
  if (!editingMatchday.value) return
  matchdayDeleteLoading.value = true
  try {
    await leagueService.deleteMatchday(editingMatchday.value.id)
    showMatchdayModal.value = false
    editingMatchday.value = null
    await Promise.all([
      store.refreshGames(categoryId.value),
      store.refreshMatchdays(categoryId.value),
    ])
    autoSelectMatchday()
  } catch (err: unknown) {
    console.error(err)
  } finally {
    matchdayDeleteLoading.value = false
  }
}

async function handleDeleteGame() {
  if (!deletingGameId.value) return
  deleteLoading.value = true
  try {
    await leagueService.deleteGame(deletingGameId.value)
  } catch (err: unknown) {
    console.error(err)
  } finally {
    deletingGameId.value = null
    await Promise.all([
      store.refreshGames(categoryId.value),
      store.refreshMatchdays(categoryId.value),
    ])
    ensureValidSelection()
    deleteLoading.value = false
  }
}

</script>

<template>
  <div class="card p-6">
    <div v-if="initialLoading" class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="h-6 bg-navy-700 rounded w-20 animate-pulse"></div>
          <div class="h-3 bg-navy-700 rounded w-48 mt-2 animate-pulse"></div>
        </div>
        <div class="flex items-center gap-2">
          <div class="h-9 bg-navy-700 rounded-lg w-48 animate-pulse"></div>
          <div class="h-9 bg-navy-700 rounded-lg w-28 animate-pulse"></div>
        </div>
      </div>
      <div class="flex gap-1.5">
        <div v-for="i in 6" :key="i" class="h-8 bg-navy-700 rounded-lg animate-pulse" :style="{ width: `${50 + i * 8}px` }"></div>
      </div>
      <div class="space-y-3">
        <div class="h-5 bg-navy-700 rounded w-28 animate-pulse"></div>
        <div v-for="j in 3" :key="j" class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-7 h-7 rounded-lg bg-navy-700"></div>
            <div class="flex-1">
              <div class="h-4 bg-navy-700 rounded w-1/3 mb-2"></div>
              <div class="h-3 bg-navy-700 rounded w-1/4"></div>
            </div>
            <div class="h-5 bg-navy-700 rounded w-10"></div>
            <div class="flex-1 flex justify-end">
              <div class="h-4 bg-navy-700 rounded w-1/3 mb-2"></div>
            </div>
            <div class="w-7 h-7 rounded-lg bg-navy-700"></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">Juegos</h2>
        <p v-if="store.games.length > 0" class="text-gray-500 text-xs mt-0.5">
          {{ store.games.length }} juego{{ store.games.length === 1 ? '' : 's' }}
          <span class="mx-1">-</span>
          {{ completedCount }} finalizado{{ completedCount === 1 ? '' : 's' }},
          {{ scheduledCount }} pendiente{{ scheduledCount === 1 ? '' : 's' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="openGenerateModal"
          :disabled="fixtureAlreadyGenerated"
          :title="fixtureAlreadyGenerated ? 'Las jornadas ya fueron generadas' : 'Generar Jornadas Automatico'"
          class="btn-secondary flex items-center gap-2 text-sm"
          :class="{ 'opacity-40 cursor-not-allowed': fixtureAlreadyGenerated }"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Generar Jornadas Automatico
        </button>
        <button
          @click="openCreateGame"
          class="btn-primary flex items-center gap-2 text-sm"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Juego
        </button>
      </div>
    </div>

    <div v-if="!store.gamesLoading && !error && (matchdayTabs.length > 0 || store.matchdays.length > 0)" class="mb-5">
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
            v-for="md in matchdayTabs"
            :key="md.number"
            @click="selectMatchday(md.number)"
            class="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 text-center"
            :class="selectedMatchday === md.number
              ? 'bg-cardinal-600 text-white'
              : 'bg-navy-700 text-gray-400 hover:text-white hover:bg-navy-600'"
          >
            <span class="block leading-tight">{{ matchdayDisplayName(md) }}</span>
            <span
              v-if="matchdayDateRange(md)"
              class="block text-[10px] leading-tight mt-0.5"
              :class="selectedMatchday === md.number ? 'text-white/70' : 'text-gray-500'"
            >
              {{ matchdayDateRange(md) }}
            </span>
          </button>

          <button
            @click="openCreateMatchday"
            class="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 bg-navy-700 text-gray-500 hover:text-white hover:bg-navy-600"
            title="Nueva Jornada"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
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
      <p class="text-xs text-gray-500 mt-2">{{ selectedMatchdaySummary() }}</p>
    </div>

    <div v-if="store.gamesLoading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="space-y-3">
        <div class="h-5 bg-navy-700 rounded w-24 animate-pulse"></div>
        <div v-for="j in 3" :key="j" class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-navy-700"></div>
            <div class="flex-1">
              <div class="h-4 bg-navy-700 rounded w-2/3 mb-2"></div>
              <div class="h-3 bg-navy-700 rounded w-1/3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="matchdayTabs.length === 0 && store.games.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">No hay juegos programados</h3>
      <p class="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
        Crea una jornada, agrega juegos manualmente o genera las jornadas automaticamente con todos los equipos.
      </p>
      <div class="flex items-center justify-center gap-3">
        <button @click="openCreateMatchday" class="btn-secondary text-sm">Nueva Jornada</button>
        <button @click="openCreateGame" class="btn-primary text-sm">Crear Juego</button>
        <button
          @click="openGenerateModal"
          :disabled="fixtureAlreadyGenerated"
          :title="fixtureAlreadyGenerated ? 'Las jornadas ya fueron generadas' : 'Generar Jornadas Automatico'"
          class="btn-secondary text-sm"
          :class="{ 'opacity-40 cursor-not-allowed': fixtureAlreadyGenerated }"
        >Generar Jornadas Automatico</button>
      </div>
    </div>

    <div v-else class="space-y-6">
      <div v-for="md in displayedMatchdays" :key="md.number">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="text-sm font-semibold text-white">{{ matchdayFullName(md) }}</h3>
          <span class="text-xs text-gray-500 bg-navy-700 px-2 py-0.5 rounded-full">
            {{ md.games.length }} partido{{ md.games.length === 1 ? '' : 's' }}
          </span>
          <button
            v-if="md.matchday"
            @click="openEditMatchday(md.matchday)"
            class="p-1 rounded text-gray-600 hover:text-white hover:bg-navy-700 transition-colors"
            title="Editar jornada"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>

        <div v-if="md.games.length === 0" class="bg-navy-900 border border-navy-700 border-dashed rounded-lg px-4 py-6 text-center">
          <p class="text-gray-500 text-sm">Jornada vacia -- sin juegos programados</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="game in md.games"
            :key="game.id"
            class="bg-navy-900 border border-navy-700 rounded-lg px-4 py-3 hover:border-navy-500 transition-all duration-200 group"
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
                  <span v-if="game.game_date" class="text-xs text-gray-500 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ formatDate(game.game_date) }}
                  </span>
                  <span v-if="game.game_time" class="text-xs text-gray-500 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {{ formatTime(game.game_time) }}
                  </span>
                  <span v-if="game.location" class="text-xs text-gray-500 flex items-center gap-1">
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {{ game.location }}
                  </span>
                </div>
                <div v-if="game.umpire_1" class="flex items-center gap-3 mt-1.5">
                  <span class="text-[10px] text-gray-500">
                    Ump: {{ [game.umpire_1, game.umpire_2, game.umpire_3].filter(Boolean).join(', ') }}
                  </span>
                  <span v-if="game.scorer" class="text-[10px] text-gray-500">
                    Anot: {{ game.scorer }}
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  v-if="game.status !== 'completed' && game.status !== 'forfeit'"
                  @click="openScoreModal(game)"
                  class="p-1.5 rounded-lg text-gray-500 hover:text-gold-400 hover:bg-navy-700 transition-colors"
                  title="Registrar marcador"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  @click="openEditGame(game)"
                  class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors"
                  title="Editar juego"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="confirmDelete(game.id)"
                  class="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-navy-700 transition-colors"
                  title="Eliminar juego"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="deletingGameId"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="absolute inset-0 bg-black/70" @click="deletingGameId = null"></div>
      <div class="relative w-full max-w-sm bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl p-6">
        <h3 class="text-white font-bold mb-2">Eliminar Juego</h3>
        <p class="text-gray-400 text-sm mb-5">
          Esta accion no se puede deshacer. El juego sera eliminado permanentemente.
        </p>
        <div class="flex gap-3">
          <button
            @click="deletingGameId = null"
            class="btn-ghost flex-1 text-sm"
          >
            Cancelar
          </button>
          <button
            @click="handleDeleteGame"
            :disabled="deleteLoading"
            class="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 text-sm disabled:opacity-50"
          >
            {{ deleteLoading ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <GameFormModal
      v-if="showGameModal"
      :game="editingGame"
      :teams="store.teams"
      :matchdays="store.matchdays"
      :selected-matchday-number="selectedMatchday"
      :loading="gameLoading"
      :error="gameError"
      @save="handleSaveGame"
      @close="showGameModal = false"
    />

    <ScoreModal
      v-if="showScoreModal && scoringGame"
      :game="scoringGame"
      :loading="scoreLoading"
      :error="scoreError"
      @save="handleSaveScore"
      @close="showScoreModal = false"
    />

    <GenerateFixtureModal
      v-if="showGenerateModal"
      :teams="store.teams"
      :existing-games-count="store.games.length"
      :season="currentSeason"
      :loading="generateLoading"
      :error="generateError"
      @generate="handleGenerate"
      @close="showGenerateModal = false"
    />

    <MatchdayFormModal
      v-if="showMatchdayModal"
      :matchday="editingMatchday"
      :teams="store.teams"
      :next-number="nextMatchdayNumber"
      :loading="matchdayLoading"
      :error="matchdayError"
      :delete-loading="matchdayDeleteLoading"
      @save="handleSaveMatchday"
      @delete="handleDeleteMatchday"
      @close="showMatchdayModal = false"
    />
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
</style>
