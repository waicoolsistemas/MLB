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
      store.fetchStandingsIfNeeded(teamId.value),
    ])
    if (store.currentTeam) {
      managerTeamCtx.setContext({ teamId: teamId.value, teamName: store.currentTeam.name })
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar posiciones'
  }
})

const team = computed(() => store.currentTeam)
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
      <h1 class="text-2xl font-bold text-white">Posiciones</h1>
      <p class="text-gray-500 text-sm mt-1">Tabla de posiciones de la categoria.</p>
    </div>

    <div v-if="store.standingsLoading" class="card p-6 animate-pulse">
      <div class="space-y-3">
        <div v-for="i in 5" :key="i" class="h-10 bg-navy-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-6 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="store.standings.length === 0" class="card p-8 text-center">
      <p class="text-gray-500 text-sm">No hay datos de posiciones disponibles.</p>
    </div>

    <div v-else class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-navy-600">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Equipo</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">JJ</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">G</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">P</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">CF</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">CC</th>
              <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">DIF</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, index) in store.standings"
              :key="row.team_id"
              class="border-b border-navy-700 last:border-0 transition-colors"
              :class="row.team_id === teamId ? 'bg-blue-500/10' : 'hover:bg-navy-700/50'"
            >
              <td class="px-4 py-3 text-gray-400 font-medium">{{ index + 1 }}</td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <div v-if="row.logo_url" class="w-6 h-6 rounded overflow-hidden bg-navy-600 flex-shrink-0">
                    <img :src="row.logo_url" :alt="row.team_name" class="w-full h-full object-cover" />
                  </div>
                  <span class="font-medium" :class="row.team_id === teamId ? 'text-blue-400' : 'text-white'">
                    {{ row.team_name }}
                  </span>
                  <span v-if="row.team_id === teamId" class="text-[10px] font-bold bg-blue-400/20 text-blue-400 px-1.5 py-0.5 rounded">TU</span>
                </div>
              </td>
              <td class="px-4 py-3 text-center text-gray-400">{{ row.games_played }}</td>
              <td class="px-4 py-3 text-center text-green-400 font-medium">{{ row.wins }}</td>
              <td class="px-4 py-3 text-center text-red-400 font-medium">{{ row.losses }}</td>
              <td class="px-4 py-3 text-center text-gray-400">{{ row.runs_for }}</td>
              <td class="px-4 py-3 text-center text-gray-400">{{ row.runs_against }}</td>
              <td class="px-4 py-3 text-center font-medium" :class="row.run_diff > 0 ? 'text-green-400' : row.run_diff < 0 ? 'text-red-400' : 'text-gray-400'">
                {{ row.run_diff > 0 ? '+' : '' }}{{ row.run_diff }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
