<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import { leagueService, type PlayerSeasonStats } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const error = ref<string | null>(null)
const selectedTeamId = ref<string | null>(null)
const stats = ref<PlayerSeasonStats[]>([])
const statsLoading = ref(false)
const teamsReady = ref(false)

const activeTeams = computed(() => store.teams.filter(t => t.is_active))

onMounted(async () => {
  error.value = null
  try {
    await store.fetchTeamsIfNeeded(categoryId.value)
    teamsReady.value = true
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar equipos'
  }
})

async function fetchStats() {
  if (!selectedTeamId.value) return
  statsLoading.value = true
  error.value = null
  stats.value = []
  try {
    stats.value = await leagueService.getPlayerStatsByTeam(categoryId.value, selectedTeamId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar metricas'
  } finally {
    statsLoading.value = false
  }
}

function onTeamChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  selectedTeamId.value = value || null
  stats.value = []
  error.value = null
  if (value) fetchStats()
}

function handleRefresh() {
  fetchStats()
}

function formatAvg(avg: number): string {
  return avg.toFixed(3).replace(/^0/, '')
}
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">Metricas Jugadores</h2>
        <p v-if="selectedTeamId && stats.length > 0" class="text-gray-500 text-xs mt-0.5">
          {{ stats.length }} jugador{{ stats.length === 1 ? '' : 'es' }}
        </p>
      </div>
      <button
        v-if="selectedTeamId"
        @click="handleRefresh"
        :disabled="statsLoading"
        class="btn-secondary flex items-center gap-2 text-sm"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'animate-spin': statsLoading }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Actualizar
      </button>
    </div>

    <div class="mb-6">
      <label class="block text-xs font-medium text-gray-400 mb-2">Equipo</label>
      <select
        :value="selectedTeamId ?? ''"
        @change="onTeamChange"
        :disabled="store.teamsLoading"
        class="w-full sm:w-64 h-10 px-3 text-sm bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-cardinal-600 focus:outline-none transition-colors appearance-none cursor-pointer"
      >
        <option value="" disabled>Seleccionar equipo...</option>
        <option v-for="team in activeTeams" :key="team.id" :value="team.id">
          {{ team.name }}
        </option>
      </select>
    </div>

    <div v-if="!teamsReady || store.teamsLoading" class="space-y-2">
      <div class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse" v-for="i in 3" :key="i">
        <div class="h-4 bg-navy-700 rounded w-2/3 mb-2"></div>
        <div class="h-3 bg-navy-700 rounded w-1/3"></div>
      </div>
    </div>

    <div v-else-if="!selectedTeamId" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Selecciona un equipo</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Selecciona un equipo para ver las metricas acumuladas de sus jugadores.
      </p>
    </div>

    <div v-else-if="statsLoading" class="space-y-2">
      <div class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse" v-for="i in 5" :key="i">
        <div class="flex items-center gap-4">
          <div class="w-6 h-4 bg-navy-700 rounded"></div>
          <div class="flex-1">
            <div class="h-4 bg-navy-700 rounded w-32"></div>
          </div>
          <div class="flex gap-4">
            <div class="h-4 bg-navy-700 rounded w-6" v-for="j in 10" :key="j"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="stats.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin metricas registradas</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Este equipo aun no tiene estadisticas capturadas en los juegos de esta categoria.
      </p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-navy-700">
            <th class="text-left text-gray-500 font-medium py-3 px-3 w-10">#</th>
            <th class="text-left text-gray-500 font-medium py-3 px-3">Jugador</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">JJ</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">AB</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">H</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">2B</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">3B</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">HR</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">BB</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">K</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">R</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">RBI</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-14">AVG</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in stats"
            :key="row.player_id"
            class="border-b border-navy-700/50 hover:bg-navy-800/50 transition-colors duration-150"
          >
            <td class="py-3 px-3">
              <span class="text-xs font-bold text-gray-500">{{ index + 1 }}</span>
            </td>
            <td class="py-3 px-3">
              <span class="text-white font-medium whitespace-nowrap">{{ row.player_name }}</span>
            </td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.games_played }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.at_bats }}</td>
            <td class="text-center py-3 px-2 text-gray-300 font-semibold">{{ row.hits }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.doubles }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.triples }}</td>
            <td class="text-center py-3 px-2 text-gold-400 font-semibold">{{ row.home_runs }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.walks }}</td>
            <td class="text-center py-3 px-2 text-gray-400">{{ row.strikeouts }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.runs }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.rbi }}</td>
            <td class="text-center py-3 px-2 font-bold" :class="row.batting_average >= 0.300 ? 'text-green-400' : row.batting_average >= 0.200 ? 'text-white' : 'text-red-400'">
              {{ formatAvg(row.batting_average) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
