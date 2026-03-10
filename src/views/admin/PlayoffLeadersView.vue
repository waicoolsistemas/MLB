<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import { leagueService, type PlayerSeasonStats } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'

interface LeaderEntry extends PlayerSeasonStats {
  team_name: string
}

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const error = ref<string | null>(null)
const loading = ref(false)
const allStats = ref<LeaderEntry[]>([])

const playoffTeams = computed(() => {
  const rounds = store.playoffBracket?.rounds ?? []
  const teamMap = new Map<string, string>()
  for (const round of rounds) {
    for (const series of round.series) {
      if (series.home_team_id && series.home_team_name) {
        teamMap.set(series.home_team_id, series.home_team_name)
      }
      if (series.away_team_id && series.away_team_name) {
        teamMap.set(series.away_team_id, series.away_team_name)
      }
    }
  }
  return Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }))
})

const battingLeaders = computed(() => {
  return allStats.value
    .filter(s => s.at_bats >= 1)
    .sort((a, b) => b.batting_average - a.batting_average || b.hits - a.hits)
    .slice(0, 3)
})

const hrLeaders = computed(() => {
  return allStats.value
    .filter(s => s.home_runs > 0)
    .sort((a, b) => b.home_runs - a.home_runs || b.batting_average - a.batting_average)
    .slice(0, 3)
})

onMounted(async () => {
  await fetchAllStats()
})

async function fetchAllStats() {
  loading.value = true
  error.value = null
  allStats.value = []
  try {
    await Promise.all([
      store.fetchPlayoffBracketIfNeeded(categoryId.value),
      store.fetchTeamsIfNeeded(categoryId.value),
    ])
    const teams = playoffTeams.value
    if (teams.length === 0) return

    const results = await Promise.all(
      teams.map(team =>
        leagueService.getPlayoffPlayerStats(categoryId.value, team.id)
          .then(stats => stats.map(s => ({ ...s, team_name: team.name })))
          .catch(() => [] as LeaderEntry[])
      )
    )
    allStats.value = results.flat()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar lideres de playoffs'
  } finally {
    loading.value = false
  }
}

function formatAvg(avg: number): string {
  return avg.toFixed(3).replace(/^0/, '')
}

const podiumColors: Record<number, { bg: string; text: string; border: string; badge: string }> = {
  0: { bg: 'bg-gold-400/5', text: 'text-gold-400', border: 'border-gold-400/20', badge: 'bg-gold-400/15 text-gold-400' },
  1: { bg: 'bg-gray-300/5', text: 'text-gray-300', border: 'border-gray-400/20', badge: 'bg-gray-400/15 text-gray-300' },
  2: { bg: 'bg-orange-400/5', text: 'text-orange-400', border: 'border-orange-400/20', badge: 'bg-orange-400/15 text-orange-400' },
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">Lideres de Playoffs</h2>
        <p v-if="allStats.length > 0" class="text-gray-500 text-xs mt-0.5">
          {{ playoffTeams.length }} equipo{{ playoffTeams.length === 1 ? '' : 's' }} en playoffs
        </p>
      </div>
      <button
        @click="fetchAllStats"
        :disabled="loading"
        class="btn-secondary flex items-center gap-2 text-sm"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'animate-spin': loading }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Actualizar
      </button>
    </div>

    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-for="i in 2" :key="i" class="bg-navy-900 border border-navy-700 rounded-xl p-5">
        <div class="h-5 bg-navy-700 rounded w-40 mb-5 animate-pulse"></div>
        <div v-for="j in 3" :key="j" class="flex items-center gap-4 py-3 animate-pulse">
          <div class="w-8 h-8 bg-navy-700 rounded-full"></div>
          <div class="flex-1">
            <div class="h-4 bg-navy-700 rounded w-32 mb-1.5"></div>
            <div class="h-3 bg-navy-700 rounded w-20"></div>
          </div>
          <div class="h-6 bg-navy-700 rounded w-14"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="playoffTeams.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin bracket de playoffs</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Configura y genera el bracket de playoffs para ver los lideres.
      </p>
    </div>

    <div v-else-if="allStats.length === 0" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin lideres aun</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto">
        Aun no hay estadisticas de playoffs registradas. Los lideres apareceran cuando se capturen metricas de juegos de playoffs.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-navy-900 border border-navy-700 rounded-xl p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div class="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center flex-shrink-0">
            <svg class="w-4.5 h-4.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Lider de Bateo</h3>
            <p class="text-gray-500 text-[10px]">Promedio de bateo (AVG)</p>
          </div>
        </div>

        <div v-if="battingLeaders.length === 0" class="text-center py-6">
          <p class="text-gray-500 text-xs">Sin datos de bateo disponibles</p>
        </div>

        <div v-else class="space-y-1">
          <div
            v-for="(player, index) in battingLeaders"
            :key="player.player_id"
            class="flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200"
            :class="[podiumColors[index]?.bg, podiumColors[index]?.border]"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              :class="podiumColors[index]?.badge"
            >
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ player.player_name }}</p>
              <p class="text-[10px] text-gray-500 truncate">{{ player.team_name }}</p>
            </div>
            <div class="flex flex-col items-end flex-shrink-0">
              <span
                class="text-lg font-black tabular-nums"
                :class="podiumColors[index]?.text"
              >
                {{ formatAvg(player.batting_average) }}
              </span>
              <span class="text-[10px] text-gray-500">
                {{ player.hits }}/{{ player.at_bats }} - {{ player.games_played }} JJ
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-navy-900 border border-navy-700 rounded-xl p-5">
        <div class="flex items-center gap-2.5 mb-5">
          <div class="w-8 h-8 rounded-lg bg-cardinal-600/10 flex items-center justify-center flex-shrink-0">
            <svg class="w-4.5 h-4.5 text-cardinal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Lider de Home Runs</h3>
            <p class="text-gray-500 text-[10px]">Total de cuadrangulares (HR)</p>
          </div>
        </div>

        <div v-if="hrLeaders.length === 0" class="text-center py-6">
          <p class="text-gray-500 text-xs">Sin home runs registrados</p>
        </div>

        <div v-else class="space-y-1">
          <div
            v-for="(player, index) in hrLeaders"
            :key="player.player_id"
            class="flex items-center gap-3 rounded-lg border p-3 transition-colors duration-200"
            :class="[podiumColors[index]?.bg, podiumColors[index]?.border]"
          >
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
              :class="podiumColors[index]?.badge"
            >
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ player.player_name }}</p>
              <p class="text-[10px] text-gray-500 truncate">{{ player.team_name }}</p>
            </div>
            <div class="flex flex-col items-end flex-shrink-0">
              <span
                class="text-lg font-black tabular-nums"
                :class="podiumColors[index]?.text"
              >
                {{ player.home_runs }}
              </span>
              <span class="text-[10px] text-gray-500">
                {{ player.games_played }} JJ - {{ player.rbi }} RBI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
