<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import { useMyLeagueStore } from '@/stores/myLeague'

const store = useMyLeagueStore()
const router = useRouter()
const categoryId = inject<ComputedRef<string>>('categoryId')!
const seasonId = inject<ComputedRef<string>>('seasonId')!

const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchTeamsIfNeeded(categoryId.value),
      store.fetchGamesIfNeeded(categoryId.value),
      store.fetchMatchdaysIfNeeded(categoryId.value),
      store.fetchStandingsIfNeeded(categoryId.value),
      store.fetchPaymentsIfNeeded(categoryId.value),
      store.fetchStatsSummaryIfNeeded(categoryId.value),
    ])
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar resumen'
  } finally {
    loading.value = false
  }
})

const totalTeams = computed(() => store.teams.length)
const activeTeams = computed(() => store.teams.filter(t => t.is_active).length)

const totalGames = computed(() => store.games.length)
const completedGames = computed(() => store.games.filter(g => g.status === 'completed' || g.status === 'forfeit').length)
const scheduledGames = computed(() => store.games.filter(g => g.status === 'scheduled').length)

const gamesPercent = computed(() => {
  if (totalGames.value === 0) return 0
  return Math.round((completedGames.value / totalGames.value) * 100)
})

const settledTeams = computed(() => store.paymentsSummary.filter(s => s.is_settled).length)
const paymentTeamsTotal = computed(() => store.paymentsSummary.length)

const totalExpected = computed(() => store.paymentsSummary.reduce((sum, s) => sum + s.effective_fee, 0))
const totalCollected = computed(() => store.paymentsSummary.reduce((sum, s) => sum + s.total_paid, 0))
const paymentsPercent = computed(() => {
  if (totalExpected.value === 0) return 0
  return Math.round((totalCollected.value / totalExpected.value) * 100)
})

const gamesWithStats = computed(() => store.statsSummary.length)
const statsPercent = computed(() => {
  if (completedGames.value === 0) return 0
  return Math.round((gamesWithStats.value / completedGames.value) * 100)
})

const upcomingGames = computed(() => {
  return store.games
    .filter(g => g.status === 'scheduled')
    .sort((a, b) => {
      const dateA = a.game_date || '9999-12-31'
      const dateB = b.game_date || '9999-12-31'
      if (dateA !== dateB) return dateA.localeCompare(dateB)
      const timeA = a.game_time || '99:99'
      const timeB = b.game_time || '99:99'
      return timeA.localeCompare(timeB)
    })
    .slice(0, 5)
})

const topStandings = computed(() => store.standings.slice(0, 5))

function progressColor(percent: number): string {
  if (percent >= 75) return 'bg-green-500'
  if (percent >= 25) return 'bg-gold-400'
  return 'bg-gray-500'
}

function progressTextColor(percent: number): string {
  if (percent >= 75) return 'text-green-400'
  if (percent >= 25) return 'text-gold-400'
  return 'text-gray-400'
}

function formatDate(date: string | null): string {
  if (!date) return ''
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function navigateToGames() {
  router.push({ name: 'admin-category-games', params: { seasonId: seasonId.value, categoryId: categoryId.value } })
}

function navigateToStandings() {
  router.push({ name: 'admin-category-standings', params: { seasonId: seasonId.value, categoryId: categoryId.value } })
}

function navigateToPayments() {
  router.push({ name: 'admin-category-payments', params: { seasonId: seasonId.value, categoryId: categoryId.value } })
}

function navigateToStats() {
  router.push({ name: 'admin-category-stats', params: { seasonId: seasonId.value, categoryId: categoryId.value } })
}

function navigateToTeams() {
  router.push({ name: 'admin-category-teams', params: { seasonId: seasonId.value, categoryId: categoryId.value } })
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div v-for="i in 4" :key="i" class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse">
          <div class="h-3 bg-navy-700 rounded w-16 mb-3"></div>
          <div class="h-7 bg-navy-700 rounded w-12 mb-2"></div>
          <div class="h-3 bg-navy-700 rounded w-24"></div>
        </div>
      </div>
      <div class="card p-6 animate-pulse">
        <div class="h-5 bg-navy-700 rounded w-40 mb-5"></div>
        <div class="space-y-4">
          <div v-for="j in 3" :key="j" class="h-6 bg-navy-700 rounded"></div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6 animate-pulse">
          <div class="h-5 bg-navy-700 rounded w-40 mb-4"></div>
          <div v-for="k in 4" :key="k" class="h-12 bg-navy-700 rounded mb-2"></div>
        </div>
        <div class="card p-6 animate-pulse">
          <div class="h-5 bg-navy-700 rounded w-40 mb-4"></div>
          <div v-for="k in 4" :key="k" class="h-10 bg-navy-700 rounded mb-2"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="card p-12 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else class="space-y-6">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button @click="navigateToTeams" class="bg-navy-900 border border-navy-700 rounded-lg p-4 text-left hover:border-navy-500 transition-all duration-200 group">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span class="text-xs text-gray-500 font-medium">Equipos</span>
          </div>
          <div class="text-2xl font-bold text-white">{{ totalTeams }}</div>
          <p class="text-xs text-gray-500 mt-1">{{ activeTeams }} activo{{ activeTeams === 1 ? '' : 's' }}</p>
        </button>

        <button @click="navigateToGames" class="bg-navy-900 border border-navy-700 rounded-lg p-4 text-left hover:border-navy-500 transition-all duration-200 group">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span class="text-xs text-gray-500 font-medium">Juegos</span>
          </div>
          <div class="text-2xl font-bold text-white">{{ totalGames }}</div>
          <p class="text-xs text-gray-500 mt-1">{{ completedGames }} finalizado{{ completedGames === 1 ? '' : 's' }}, {{ scheduledGames }} pendiente{{ scheduledGames === 1 ? '' : 's' }}</p>
        </button>

        <button @click="navigateToPayments" class="bg-navy-900 border border-navy-700 rounded-lg p-4 text-left hover:border-navy-500 transition-all duration-200 group">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span class="text-xs text-gray-500 font-medium">Cobranza</span>
          </div>
          <div class="text-2xl font-bold text-white">{{ paymentsPercent }}%</div>
          <p class="text-xs text-gray-500 mt-1">{{ settledTeams }}/{{ paymentTeamsTotal }} equipos liquidados</p>
        </button>

        <button @click="navigateToStats" class="bg-navy-900 border border-navy-700 rounded-lg p-4 text-left hover:border-navy-500 transition-all duration-200 group">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-8 h-8 rounded-lg bg-cardinal-600/10 flex items-center justify-center">
              <svg class="w-4 h-4 text-cardinal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span class="text-xs text-gray-500 font-medium">Estadisticas</span>
          </div>
          <div class="text-2xl font-bold text-white">{{ gamesWithStats }}/{{ completedGames }}</div>
          <p class="text-xs text-gray-500 mt-1">juegos con stats capturadas</p>
        </button>
      </div>

      <div class="card p-6">
        <h3 class="text-sm font-semibold text-white mb-4">Progreso de la Categoria</h3>
        <div class="space-y-5">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <button @click="navigateToGames" class="text-xs text-gray-400 hover:text-white transition-colors">Avance de Juegos</button>
              <span class="text-xs font-semibold" :class="progressTextColor(gamesPercent)">{{ gamesPercent }}%</span>
            </div>
            <div class="w-full h-2 bg-navy-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="progressColor(gamesPercent)"
                :style="{ width: gamesPercent + '%' }"
              ></div>
            </div>
            <p class="text-[10px] text-gray-600 mt-1">{{ completedGames }} de {{ totalGames }} juegos finalizados</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <button @click="navigateToPayments" class="text-xs text-gray-400 hover:text-white transition-colors">Avance de Pagos</button>
              <span class="text-xs font-semibold" :class="progressTextColor(paymentsPercent)">{{ paymentsPercent }}%</span>
            </div>
            <div class="w-full h-2 bg-navy-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="progressColor(paymentsPercent)"
                :style="{ width: paymentsPercent + '%' }"
              ></div>
            </div>
            <p class="text-[10px] text-gray-600 mt-1">${{ totalCollected.toLocaleString('en-US') }} de ${{ totalExpected.toLocaleString('en-US') }} recaudados</p>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <button @click="navigateToStats" class="text-xs text-gray-400 hover:text-white transition-colors">Avance de Estadisticas</button>
              <span class="text-xs font-semibold" :class="progressTextColor(statsPercent)">{{ statsPercent }}%</span>
            </div>
            <div class="w-full h-2 bg-navy-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="progressColor(statsPercent)"
                :style="{ width: statsPercent + '%' }"
              ></div>
            </div>
            <p class="text-[10px] text-gray-600 mt-1">{{ gamesWithStats }} de {{ completedGames }} juegos con estadisticas</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-white">Proximos Juegos</h3>
            <button
              v-if="upcomingGames.length > 0"
              @click="navigateToGames"
              class="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Ver todos
            </button>
          </div>

          <div v-if="upcomingGames.length === 0" class="text-center py-8">
            <div class="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-gray-500 text-xs">No hay juegos pendientes</p>
          </div>

          <div v-else class="space-y-2">
            <button
              v-for="game in upcomingGames"
              :key="game.id"
              @click="navigateToGames"
              class="w-full bg-navy-900 border border-navy-700 rounded-lg px-3 py-2.5 hover:border-navy-500 transition-all duration-200 text-left"
            >
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <div class="w-6 h-6 rounded bg-blue-400/10 flex items-center justify-center flex-shrink-0">
                    <span class="text-[10px] font-bold text-blue-400">{{ game.home_team_name.charAt(0) }}</span>
                  </div>
                  <span class="text-xs text-white truncate">{{ game.home_team_name }}</span>
                </div>
                <span class="text-[10px] text-gray-500 font-medium flex-shrink-0">vs</span>
                <div class="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                  <span class="text-xs text-white truncate text-right">{{ game.away_team_name }}</span>
                  <div class="w-6 h-6 rounded bg-cardinal-600/10 flex items-center justify-center flex-shrink-0">
                    <span class="text-[10px] font-bold text-cardinal-400">{{ game.away_team_name.charAt(0) }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-3 mt-1.5">
                <span class="text-[10px] text-gray-500 bg-navy-700 px-1.5 py-0.5 rounded">J{{ game.matchday }}</span>
                <span v-if="game.game_date" class="text-[10px] text-gray-500 flex items-center gap-1">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ formatDate(game.game_date) }}
                </span>
                <span v-if="game.game_time" class="text-[10px] text-gray-500 flex items-center gap-1">
                  <svg class="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {{ formatTime(game.game_time) }}
                </span>
                <span v-if="game.location" class="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                  <svg class="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ game.location }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-white">Tabla de Posiciones</h3>
            <button
              v-if="topStandings.length > 0"
              @click="navigateToStandings"
              class="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Ver completa
            </button>
          </div>

          <div v-if="topStandings.length === 0" class="text-center py-8">
            <div class="w-12 h-12 rounded-xl bg-navy-700 flex items-center justify-center mx-auto mb-3">
              <svg class="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-gray-500 text-xs">Sin datos de posiciones</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-navy-700">
                  <th class="text-left text-gray-500 font-medium py-2 px-2 w-8">#</th>
                  <th class="text-left text-gray-500 font-medium py-2 px-2">Equipo</th>
                  <th class="text-center text-gray-500 font-medium py-2 px-1 w-8">JJ</th>
                  <th class="text-center text-gray-500 font-medium py-2 px-1 w-8">JG</th>
                  <th class="text-center text-gray-500 font-medium py-2 px-1 w-8">JP</th>
                  <th class="text-center text-gray-500 font-medium py-2 px-1 w-10">DIF</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in topStandings"
                  :key="row.team_id"
                  class="border-b border-navy-700/50"
                >
                  <td class="py-2 px-2">
                    <span
                      class="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center"
                      :class="index === 0 ? 'bg-gold-400/15 text-gold-400' : index === 1 ? 'bg-gray-400/10 text-gray-300' : index === 2 ? 'bg-orange-400/10 text-orange-400' : 'text-gray-500'"
                    >
                      {{ index + 1 }}
                    </span>
                  </td>
                  <td class="py-2 px-2">
                    <div class="flex items-center gap-2">
                      <div class="w-6 h-6 rounded bg-navy-700 flex items-center justify-center flex-shrink-0">
                        <span class="text-[10px] font-bold text-white">{{ row.team_name.charAt(0) }}</span>
                      </div>
                      <span class="text-white font-medium truncate">{{ row.team_name }}</span>
                    </div>
                  </td>
                  <td class="text-center py-2 px-1 text-gray-300">{{ row.games_played }}</td>
                  <td class="text-center py-2 px-1 text-green-400 font-semibold">{{ row.wins }}</td>
                  <td class="text-center py-2 px-1 text-red-400">{{ row.losses }}</td>
                  <td class="text-center py-2 px-1 font-semibold" :class="row.run_diff > 0 ? 'text-green-400' : row.run_diff < 0 ? 'text-red-400' : 'text-gray-500'">
                    {{ row.run_diff > 0 ? '+' : '' }}{{ row.run_diff }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
