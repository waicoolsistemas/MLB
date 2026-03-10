<script setup lang="ts">
import { ref, onMounted, inject, type ComputedRef } from 'vue'
import { leagueService, type PlayoffSeries, type PlayoffConfig } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import BracketSeriesCard from '@/components/playoffs/BracketSeriesCard.vue'
import ScoreModal from '@/components/games/ScoreModal.vue'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const error = ref<string | null>(null)
const showScoreModal = ref(false)
const scoringGame = ref<PlayoffSeries['games'][0] | null>(null)
const scoreLoading = ref(false)
const scoreError = ref<string | null>(null)

const expandedSeriesId = ref<string | null>(null)

onMounted(async () => {
  error.value = null
  try {
    await store.fetchPlayoffBracketIfNeeded(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar bracket'
  }
})

function getConfig(): PlayoffConfig | null {
  return store.playoffBracket?.config ?? null
}

function toggleSeries(series: PlayoffSeries) {
  expandedSeriesId.value = expandedSeriesId.value === series.id ? null : series.id
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
</script>

<template>
  <div>
    <div v-if="store.playoffBracketLoading && !store.playoffBracket" class="space-y-4">
      <div v-for="i in 3" :key="i" class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse">
        <div class="h-5 bg-navy-700 rounded w-32 mb-3"></div>
        <div class="flex gap-4">
          <div v-for="j in 3" :key="j" class="w-56 h-28 bg-navy-700 rounded-lg"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="!store.playoffBracket || store.playoffBracket.rounds.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">No hay bracket generado</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Ve a la seccion de Configuracion para crear el bracket de playoffs.
      </p>
    </div>

    <div v-else class="space-y-8">
      <div class="overflow-x-auto">
        <div class="flex gap-8 min-w-max pb-4">
          <div
            v-for="round in store.playoffBracket.rounds"
            :key="round.round"
            class="space-y-4"
          >
            <h3 class="text-sm font-semibold text-white flex items-center gap-2">
              {{ round.round_name }}
              <span class="text-xs text-gray-500 bg-navy-700 px-2 py-0.5 rounded-full">
                {{ round.series.length }} serie{{ round.series.length === 1 ? '' : 's' }}
              </span>
            </h3>

            <div class="space-y-3">
              <div v-for="series in round.series" :key="series.id" class="space-y-2">
                <BracketSeriesCard
                  :series="series"
                  :series-format="getConfig()?.series_format ?? 'single_game'"
                  @click="toggleSeries"
                />

                <div v-if="expandedSeriesId === series.id" class="w-56 space-y-2">
                  <div
                    v-for="game in series.games"
                    :key="game.id"
                    class="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <div class="flex items-center gap-2">
                        <span
                          class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          :class="statusClasses(game.status)"
                        >
                          {{ statusLabel(game.status) }}
                        </span>
                        <span v-if="game.game_date" class="text-[10px] text-gray-500">
                          {{ formatDate(game.game_date) }}
                        </span>
                        <span v-if="game.game_time" class="text-[10px] text-gray-500">
                          {{ formatTime(game.game_time) }}
                        </span>
                      </div>
                      <button
                        @click.stop="openScoreModal(game)"
                        class="p-1 rounded text-gray-500 hover:text-gold-400 hover:bg-navy-700 transition-colors"
                        title="Registrar marcador"
                      >
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                    <div class="flex items-center gap-2 text-xs">
                      <span class="text-white truncate flex-1">{{ game.home_team_name }}</span>
                      <template v-if="game.home_score !== null && game.away_score !== null">
                        <span class="font-bold text-white">{{ game.home_score }}</span>
                        <span class="text-gray-600">-</span>
                        <span class="font-bold text-white">{{ game.away_score }}</span>
                      </template>
                      <span v-else class="text-gray-500">vs</span>
                      <span class="text-white truncate flex-1 text-right">{{ game.away_team_name }}</span>
                    </div>
                    <div v-if="game.umpire_1" class="mt-1.5">
                      <span class="text-[9px] text-gray-500 block">
                        Ump: {{ [game.umpire_1, game.umpire_2, game.umpire_3].filter(Boolean).join(', ') }}
                      </span>
                      <span v-if="game.scorer" class="text-[9px] text-gray-500 block">
                        Anot: {{ game.scorer }}
                      </span>
                    </div>
                  </div>

                </div>
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
