<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useManagerStore } from '@/stores/manager'
import { useManagerTeamContextStore } from '@/stores/managerTeamContext'

const route = useRoute()
const router = useRouter()
const store = useManagerStore()
const managerTeamCtx = useManagerTeamContextStore()
const error = ref<string | null>(null)
const teamId = computed(() => route.params.teamId as string)

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchTeamDetail(teamId.value),
      store.fetchStatsIfNeeded(teamId.value),
    ])
    if (store.currentTeam) {
      managerTeamCtx.setContext({ teamId: teamId.value, teamName: store.currentTeam.name })
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar estadisticas'
  }
})

const team = computed(() => store.currentTeam)

function fmtAvg(val: number): string {
  return val.toFixed(3).replace(/^0/, '')
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button @click="router.push({ name: 'manager-team-dashboard', params: { teamId } })" class="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-3 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {{ team?.name || 'Equipo' }}
      </button>
      <h1 class="text-2xl font-bold text-white">Estadisticas del Equipo</h1>
      <p class="text-gray-500 text-sm mt-1">Metricas individuales de tus jugadores.</p>
    </div>

    <div v-if="store.statsLoading" class="card p-6 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 bg-navy-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-6 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="store.stats.length === 0" class="card p-8 text-center">
      <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin estadisticas</h3>
      <p class="text-gray-500 text-sm">Aun no hay estadisticas registradas para tu equipo.</p>
    </div>

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-navy-600">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jugador</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">JJ</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">AB</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">H</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">2B</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">3B</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">HR</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">BB</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">K</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">C</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">CI</th>
              <th class="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">AVG</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="player in store.stats"
              :key="player.player_id"
              class="border-b border-navy-700 last:border-0 hover:bg-navy-700/50 transition-colors"
            >
              <td class="px-4 py-3 text-white font-medium whitespace-nowrap">{{ player.player_name }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.games_played }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.at_bats }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.hits }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.doubles }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.triples }}</td>
              <td class="px-3 py-3 text-center text-gold-400 font-medium">{{ player.home_runs }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.walks }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.strikeouts }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.runs }}</td>
              <td class="px-3 py-3 text-center text-gray-400">{{ player.rbi }}</td>
              <td class="px-3 py-3 text-center text-white font-bold">{{ fmtAvg(player.batting_average) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
