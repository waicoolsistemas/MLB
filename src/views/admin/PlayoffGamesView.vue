<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import { leagueService, type PlayoffSeries } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import ScoreModal from '@/components/games/ScoreModal.vue'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const error = ref<string | null>(null)

const showScoreModal = ref(false)
const scoringGame = ref<PlayoffSeries['games'][0] | null>(null)
const scoreLoading = ref(false)
const scoreError = ref<string | null>(null)

onMounted(async () => {
  error.value = null
  try {
    await store.fetchPlayoffBracketIfNeeded(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar juegos de playoffs'
  }
})

const allGames = computed(() => {
  if (!store.playoffBracket) return []
  const games: (PlayoffSeries['games'][0] & { round_name: string; series_order: number })[] = []
  for (const round of store.playoffBracket.rounds) {
    for (const series of round.series) {
      for (const game of series.games) {
        games.push({ ...game, round_name: round.round_name, series_order: series.series_order })
      }
    }
  }
  return games
})

const totalGames = computed(() => allGames.value.length)
const completedCount = computed(() => allGames.value.filter(g => g.status === 'completed' || g.status === 'forfeit').length)

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    scheduled: 'Programado', in_progress: 'En Juego', completed: 'Finalizado',
    cancelled: 'Cancelado', forfeit: 'Forfeit',
  }
  return labels[status] || status
}

function statusClasses(status: string) {
  const map: Record<string, string> = {
    scheduled: 'bg-gray-500/10 text-gray-400', in_progress: 'bg-gold-400/10 text-gold-400',
    completed: 'bg-green-400/10 text-green-400', cancelled: 'bg-red-400/10 text-red-400',
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

function openScoreModal(game: PlayoffSeries['games'][0]) {
  scoringGame.value = game
  scoreError.value = null
  showScoreModal.value = true
}

async function handleSaveScore(payload: { home_score: number | null; away_score: number | null; status: string; umpire_1: string | null; umpire_2: string | null; umpire_3: string | null; scorer: string | null }) {
  if (!scoringGame.value) return
  scoreLoading.value = true
  scoreError.value = null
  try {
    await leagueService.updateGame(scoringGame.value.id, payload)
    showScoreModal.value = false
    scoringGame.value = null
    store.invalidatePlayoffs()
    await store.refreshPlayoffBracket(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    scoreError.value = e.response?.data?.error || 'Error al guardar marcador'
  } finally {
    scoreLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">Juegos de Playoffs</h2>
        <p v-if="totalGames > 0" class="text-gray-500 text-xs mt-0.5">
          {{ totalGames }} juego{{ totalGames === 1 ? '' : 's' }} -
          {{ completedCount }} finalizado{{ completedCount === 1 ? '' : 's' }}
        </p>
      </div>
    </div>

    <div v-if="store.playoffBracketLoading && !store.playoffBracket" class="space-y-4">
      <div v-for="i in 3" :key="i" class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse">
        <div class="h-4 bg-navy-700 rounded w-2/3 mb-2"></div>
        <div class="h-3 bg-navy-700 rounded w-1/3"></div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="allGames.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin juegos de playoffs</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Genera el bracket en la seccion de Configuracion para crear los juegos de playoffs.
      </p>
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="round in store.playoffBracket?.rounds ?? []"
        :key="round.round"
      >
        <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          {{ round.round_name }}
          <span class="text-xs text-gray-500 bg-navy-700 px-2 py-0.5 rounded-full">
            {{ round.series.reduce((sum, s) => sum + s.games.length, 0) }} juego{{ round.series.reduce((sum, s) => sum + s.games.length, 0) === 1 ? '' : 's' }}
          </span>
        </h3>

        <div v-for="series in round.series" :key="series.id" class="mb-4">
          <div class="flex items-center gap-2 mb-2 pl-1">
            <span class="text-xs font-medium text-gray-400">
              Serie {{ series.series_order }}:
              {{ series.home_team_name || 'TBD' }} vs {{ series.away_team_name || 'TBD' }}
            </span>
            <span class="text-[10px] text-gray-500">
              ({{ series.home_wins }}-{{ series.away_wins }})
            </span>
          </div>

          <div class="space-y-2">
            <div
              v-for="game in series.games"
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
                    <span v-if="game.game_date" class="text-xs text-gray-500">
                      {{ formatDate(game.game_date) }}
                    </span>
                    <span v-if="game.game_time" class="text-xs text-gray-500">
                      {{ formatTime(game.game_time) }}
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

                <button
                  v-if="game.status !== 'completed' && game.status !== 'forfeit'"
                  @click="openScoreModal(game)"
                  class="p-1.5 rounded-lg text-gray-500 hover:text-gold-400 hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100"
                  title="Registrar marcador"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ScoreModal
      v-if="showScoreModal && scoringGame"
      :game="scoringGame"
      :loading="scoreLoading"
      :error="scoreError"
      @save="handleSaveScore"
      @close="showScoreModal = false"
    />
  </div>
</template>
