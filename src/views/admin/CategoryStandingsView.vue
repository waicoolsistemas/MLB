<script setup lang="ts">
import { ref, onMounted, inject, type ComputedRef } from 'vue'
import { useMyLeagueStore } from '@/stores/myLeague'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const error = ref<string | null>(null)

onMounted(async () => {
  error.value = null
  try {
    await store.fetchStandingsIfNeeded(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar posiciones'
  }
})

async function handleRefresh() {
  error.value = null
  try {
    await store.refreshStandings(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar posiciones'
  }
}
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">Tabla de Posiciones</h2>
        <p v-if="store.standings.length > 0" class="text-gray-500 text-xs mt-0.5">
          {{ store.standings.length }} equipo{{ store.standings.length === 1 ? '' : 's' }}
        </p>
      </div>
      <button
        @click="handleRefresh"
        :disabled="store.standingsLoading"
        class="btn-secondary flex items-center gap-2 text-sm"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'animate-spin': store.standingsLoading }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Actualizar
      </button>
    </div>

    <div v-if="store.standingsLoading && store.standings.length === 0" class="space-y-2">
      <div class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse" v-for="i in 5" :key="i">
        <div class="flex items-center gap-4">
          <div class="w-6 h-4 bg-navy-700 rounded"></div>
          <div class="w-8 h-8 bg-navy-700 rounded-lg"></div>
          <div class="flex-1">
            <div class="h-4 bg-navy-700 rounded w-32"></div>
          </div>
          <div class="flex gap-6">
            <div class="h-4 bg-navy-700 rounded w-6" v-for="j in 7" :key="j"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="store.standings.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin datos de posiciones</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Agrega equipos y registra resultados de juegos para ver la tabla de posiciones.
      </p>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-navy-700">
            <th class="text-left text-gray-500 font-medium py-3 px-3 w-10">#</th>
            <th class="text-left text-gray-500 font-medium py-3 px-3">Equipo</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">JJ</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">JG</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">JE</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">JP</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">CF</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-12">CC</th>
            <th class="text-center text-gray-500 font-medium py-3 px-2 w-14">DIF</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in store.standings"
            :key="row.team_id"
            class="border-b border-navy-700/50 hover:bg-navy-800/50 transition-colors duration-150"
          >
            <td class="py-3 px-3">
              <span
                class="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center"
                :class="index === 0 ? 'bg-gold-400/15 text-gold-400' : index === 1 ? 'bg-gray-400/10 text-gray-300' : index === 2 ? 'bg-orange-400/10 text-orange-400' : 'text-gray-500'"
              >
                {{ index + 1 }}
              </span>
            </td>
            <td class="py-3 px-3">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-bold text-white">{{ row.team_name.charAt(0) }}</span>
                </div>
                <span class="text-white font-medium truncate">{{ row.team_name }}</span>
              </div>
            </td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.games_played }}</td>
            <td class="text-center py-3 px-2 text-green-400 font-semibold">{{ row.wins }}</td>
            <td class="text-center py-3 px-2 text-gray-400">{{ row.draws }}</td>
            <td class="text-center py-3 px-2 text-red-400">{{ row.losses }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.runs_for }}</td>
            <td class="text-center py-3 px-2 text-gray-300">{{ row.runs_against }}</td>
            <td class="text-center py-3 px-2 font-semibold" :class="row.run_diff > 0 ? 'text-green-400' : row.run_diff < 0 ? 'text-red-400' : 'text-gray-500'">
              {{ row.run_diff > 0 ? '+' : '' }}{{ row.run_diff }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
