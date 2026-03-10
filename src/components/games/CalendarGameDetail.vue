<script setup lang="ts">
import type { Game } from '@/services/leagueService'

const props = defineProps<{
  game: Game
}>()

defineEmits<{
  close: []
}>()

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
  if (!date) return 'Sin fecha'
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(time: string | null) {
  if (!time) return null
  return time.slice(0, 5)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="$emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h3 class="text-white font-bold text-sm">Detalle del Juego</h3>
        <button @click="$emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-blue-400">{{ props.game.home_team_name.charAt(0) }}</span>
            </div>
            <span class="text-sm text-white font-medium truncate">{{ props.game.home_team_name }}</span>
          </div>

          <div class="flex items-center gap-2 px-4 flex-shrink-0">
            <template v-if="props.game.home_score !== null && props.game.away_score !== null">
              <span class="text-xl font-bold text-white">{{ props.game.home_score }}</span>
              <span class="text-gray-500 text-sm">-</span>
              <span class="text-xl font-bold text-white">{{ props.game.away_score }}</span>
            </template>
            <span v-else class="text-sm text-gray-500 font-medium">vs</span>
          </div>

          <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span class="text-sm text-white font-medium truncate text-right">{{ props.game.away_team_name }}</span>
            <div class="w-8 h-8 rounded-lg bg-cardinal-600/10 flex items-center justify-center flex-shrink-0">
              <span class="text-xs font-bold text-cardinal-400">{{ props.game.away_team_name.charAt(0) }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <span
              class="text-xs font-medium px-2 py-1 rounded-full"
              :class="statusClasses(props.game.status)"
            >
              {{ statusLabel(props.game.status) }}
            </span>
            <span v-if="props.game.matchday_name" class="text-xs text-gray-500">
              J{{ props.game.matchday }} - {{ props.game.matchday_name }}
            </span>
            <span v-else class="text-xs text-gray-500">
              Jornada {{ props.game.matchday }}
            </span>
          </div>

          <div class="grid grid-cols-1 gap-2">
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-gray-300">{{ formatDate(props.game.game_date) }}</span>
            </div>

            <div v-if="formatTime(props.game.game_time)" class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="text-gray-300">{{ formatTime(props.game.game_time) }}</span>
            </div>

            <div v-if="props.game.location" class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span class="text-gray-300">{{ props.game.location }}</span>
            </div>
          </div>

          <div v-if="props.game.umpire_1" class="pt-2 border-t border-navy-700 space-y-1">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-gray-500 text-xs w-12 flex-shrink-0">Ump:</span>
              <span class="text-gray-300 text-xs">
                {{ [props.game.umpire_1, props.game.umpire_2, props.game.umpire_3].filter(Boolean).join(', ') }}
              </span>
            </div>
            <div v-if="props.game.scorer" class="flex items-center gap-2 text-sm">
              <span class="text-gray-500 text-xs w-12 flex-shrink-0">Anot:</span>
              <span class="text-gray-300 text-xs">{{ props.game.scorer }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
