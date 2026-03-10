<script setup lang="ts">
import type { PlayoffSeries } from '@/services/leagueService'

defineProps<{
  series: PlayoffSeries
  seriesFormat: string
}>()

const emit = defineEmits<{
  click: [series: PlayoffSeries]
}>()

function winsNeeded(format: string): number {
  if (format === 'best_of_5') return 3
  if (format === 'best_of_3') return 2
  return 1
}

function teamInitial(name: string | null): string {
  return name ? name.charAt(0).toUpperCase() : '?'
}
</script>

<template>
  <div
    @click="emit('click', series)"
    class="bg-navy-900 border rounded-lg p-3 cursor-pointer transition-all duration-200 hover:border-navy-500 w-56 flex-shrink-0"
    :class="series.status === 'completed'
      ? 'border-green-500/30'
      : series.status === 'in_progress'
        ? 'border-gold-400/30'
        : 'border-navy-700'"
  >
    <div class="flex items-center justify-between mb-2">
      <span class="text-[10px] font-medium text-gray-500">Serie {{ series.series_order }}</span>
      <span
        class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
        :class="series.status === 'completed'
          ? 'bg-green-400/10 text-green-400'
          : series.status === 'in_progress'
            ? 'bg-gold-400/10 text-gold-400'
            : 'bg-gray-500/10 text-gray-500'"
      >
        {{ series.status === 'completed' ? 'Finalizada' : series.status === 'in_progress' ? 'En juego' : 'Pendiente' }}
      </span>
    </div>

    <div class="space-y-1.5">
      <div
        class="flex items-center gap-2 p-1.5 rounded"
        :class="series.winner_team_id === series.home_team_id ? 'bg-green-400/5' : ''"
      >
        <div
          class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          :class="series.home_team_id ? 'bg-blue-400/10' : 'bg-navy-700'"
        >
          <span class="text-[10px] font-bold" :class="series.home_team_id ? 'text-blue-400' : 'text-gray-600'">
            {{ teamInitial(series.home_team_name) }}
          </span>
        </div>
        <span class="text-xs font-medium flex-1 truncate" :class="series.home_team_name ? 'text-white' : 'text-gray-600'">
          {{ series.home_team_name || (series.seed_home ? `Semilla #${series.seed_home}` : 'Por definir') }}
        </span>
        <span class="text-xs font-bold w-4 text-center" :class="series.home_wins >= winsNeeded(seriesFormat) ? 'text-green-400' : 'text-gray-400'">
          {{ series.home_wins }}
        </span>
      </div>

      <div
        class="flex items-center gap-2 p-1.5 rounded"
        :class="series.winner_team_id === series.away_team_id ? 'bg-green-400/5' : ''"
      >
        <div
          class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          :class="series.away_team_id ? 'bg-cardinal-600/10' : 'bg-navy-700'"
        >
          <span class="text-[10px] font-bold" :class="series.away_team_id ? 'text-cardinal-400' : 'text-gray-600'">
            {{ teamInitial(series.away_team_name) }}
          </span>
        </div>
        <span class="text-xs font-medium flex-1 truncate" :class="series.away_team_name ? 'text-white' : 'text-gray-600'">
          {{ series.away_team_name || (series.seed_away ? `Semilla #${series.seed_away}` : 'Por definir') }}
        </span>
        <span class="text-xs font-bold w-4 text-center" :class="series.away_wins >= winsNeeded(seriesFormat) ? 'text-green-400' : 'text-gray-400'">
          {{ series.away_wins }}
        </span>
      </div>
    </div>

    <div v-if="series.games.length > 0" class="mt-2 pt-2 border-t border-navy-700">
      <div class="flex gap-1">
        <div
          v-for="(game, idx) in series.games"
          :key="game.id"
          class="flex-1 text-center"
        >
          <span class="text-[9px] text-gray-600 block">J{{ idx + 1 }}</span>
          <span
            v-if="game.status === 'completed' || game.status === 'forfeit'"
            class="text-[10px] font-medium text-gray-300"
          >
            {{ game.home_score }}-{{ game.away_score }}
          </span>
          <span v-else class="text-[10px] text-gray-600">-</span>
        </div>
      </div>
    </div>
  </div>
</template>
