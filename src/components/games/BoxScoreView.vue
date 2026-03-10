<script setup lang="ts">
import { computed } from 'vue'
import type { Game, PlayerGameStats } from '@/services/leagueService'

const STAT_COLUMNS = [
  { key: 'at_bats', label: 'AB' },
  { key: 'hits', label: 'H' },
  { key: 'doubles', label: '2B' },
  { key: 'triples', label: '3B' },
  { key: 'home_runs', label: 'HR' },
  { key: 'walks', label: 'BB' },
  { key: 'strikeouts', label: 'K' },
  { key: 'runs', label: 'R' },
  { key: 'rbi', label: 'RBI' },
] as const

type StatKey = typeof STAT_COLUMNS[number]['key']

const props = defineProps<{
  game: Game
  stats: PlayerGameStats[]
}>()

defineEmits<{
  edit: []
}>()

const isForfeit = computed(() => props.game.status === 'forfeit')

const forfeitTeamName = computed(() => {
  if (!props.game.forfeit_team_id) return ''
  return props.game.forfeit_team_id === props.game.home_team_id
    ? props.game.home_team_name
    : props.game.away_team_name
})

const homeStats = computed(() =>
  props.stats.filter(s => s.team_id === props.game.home_team_id)
)

const awayStats = computed(() =>
  props.stats.filter(s => s.team_id === props.game.away_team_id)
)

function calcTotals(rows: PlayerGameStats[]): Record<StatKey, number> {
  const totals = {} as Record<StatKey, number>
  for (const col of STAT_COLUMNS) {
    totals[col.key] = rows.reduce((sum, r) => sum + (r[col.key] as number), 0)
  }
  return totals
}

const homeTotals = computed(() => calcTotals(homeStats.value))
const awayTotals = computed(() => calcTotals(awayStats.value))

const homeWon = computed(() => {
  if (props.game.home_score === null || props.game.away_score === null) return false
  return props.game.home_score > props.game.away_score
})

const awayWon = computed(() => {
  if (props.game.home_score === null || props.game.away_score === null) return false
  return props.game.away_score > props.game.home_score
})
</script>

<template>
  <div class="space-y-5">
    <!-- Scoreboard -->
    <div class="bg-navy-900 border border-navy-700 rounded-xl p-5">
      <div class="flex items-center justify-center gap-5">
        <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="homeWon ? 'bg-blue-400/20' : 'bg-blue-400/10'"
          >
            <span class="text-sm font-bold text-blue-400">{{ game.home_team_name.charAt(0) }}</span>
          </div>
          <span class="text-xs font-medium text-white truncate max-w-full text-center">{{ game.home_team_name }}</span>
          <span class="text-[10px] text-gray-500">Local</span>
        </div>

        <div class="flex items-center gap-3">
          <span
            class="text-3xl font-extrabold tabular-nums"
            :class="homeWon ? 'text-white' : 'text-gray-500'"
          >{{ game.home_score ?? '-' }}</span>
          <span class="text-sm text-gray-600 font-medium">-</span>
          <span
            class="text-3xl font-extrabold tabular-nums"
            :class="awayWon ? 'text-white' : 'text-gray-500'"
          >{{ game.away_score ?? '-' }}</span>
        </div>

        <div class="flex flex-col items-center gap-1.5 flex-1 min-w-0">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="awayWon ? 'bg-cardinal-600/20' : 'bg-cardinal-600/10'"
          >
            <span class="text-sm font-bold text-cardinal-400">{{ game.away_team_name.charAt(0) }}</span>
          </div>
          <span class="text-xs font-medium text-white truncate max-w-full text-center">{{ game.away_team_name }}</span>
          <span class="text-[10px] text-gray-500">Visitante</span>
        </div>
      </div>

      <div class="flex items-center justify-center gap-2 mt-3">
        <span
          class="text-[10px] font-medium px-2 py-0.5 rounded-full"
          :class="isForfeit ? 'bg-orange-400/10 text-orange-400' : 'bg-green-400/10 text-green-400'"
        >
          {{ isForfeit ? 'Forfeit' : 'Finalizado' }}
        </span>
      </div>
    </div>

    <!-- Forfeit banner -->
    <div v-if="isForfeit && forfeitTeamName" class="bg-orange-400/5 border border-orange-400/20 rounded-lg p-3">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-xs text-orange-400">
          <span class="font-semibold">{{ forfeitTeamName }}</span> no se presento. Victoria por forfeit.
        </p>
      </div>
    </div>

    <!-- Team stat tables -->
    <div
      v-for="(teamData, idx) in [
        { stats: homeStats, totals: homeTotals, name: game.home_team_name, side: 'home' as const },
        { stats: awayStats, totals: awayTotals, name: game.away_team_name, side: 'away' as const },
      ]"
      :key="idx"
    >
      <template v-if="teamData.stats.length > 0">
        <div class="flex items-center gap-2 mb-2">
          <div
            class="w-5 h-5 rounded flex items-center justify-center"
            :class="teamData.side === 'home' ? 'bg-blue-400/10' : 'bg-cardinal-600/10'"
          >
            <span
              class="text-[9px] font-bold"
              :class="teamData.side === 'home' ? 'text-blue-400' : 'text-cardinal-400'"
            >{{ teamData.name.charAt(0) }}</span>
          </div>
          <h4 class="text-xs font-semibold text-white">{{ teamData.name }}</h4>
        </div>

        <div class="overflow-x-auto rounded-lg border border-navy-700">
          <table class="w-full text-xs">
            <thead>
              <tr class="bg-navy-800">
                <th class="text-left text-gray-400 font-medium px-3 py-2 sticky left-0 bg-navy-800 min-w-[120px]">Jugador</th>
                <th
                  v-for="col in STAT_COLUMNS"
                  :key="col.key"
                  class="text-center text-gray-400 font-medium px-2 py-2 w-10"
                >{{ col.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in teamData.stats"
                :key="row.id"
                class="border-t border-navy-700/50 hover:bg-navy-800/50 transition-colors"
              >
                <td class="text-white px-3 py-1.5 sticky left-0 bg-navy-900 truncate max-w-[160px]">{{ row.player_name }}</td>
                <td
                  v-for="col in STAT_COLUMNS"
                  :key="col.key"
                  class="text-center text-gray-300 tabular-nums px-2 py-1.5"
                >{{ row[col.key] }}</td>
              </tr>
              <tr class="border-t border-navy-600 bg-navy-800/70">
                <td class="text-white font-semibold px-3 py-1.5 sticky left-0 bg-navy-800/70">TOTAL</td>
                <td
                  v-for="col in STAT_COLUMNS"
                  :key="col.key"
                  class="text-center text-white font-semibold tabular-nums px-2 py-1.5"
                >{{ teamData.totals[col.key] }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <!-- Empty state if no stats at all -->
    <div v-if="homeStats.length === 0 && awayStats.length === 0" class="text-center py-6">
      <p class="text-gray-500 text-sm">No hay estadisticas individuales registradas para este juego.</p>
    </div>

    <!-- Edit button -->
    <div class="flex justify-end pt-3 border-t border-navy-700">
      <button @click="$emit('edit')" class="btn-secondary text-sm px-4 py-2 flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
        Editar Stats
      </button>
    </div>
  </div>
</template>
