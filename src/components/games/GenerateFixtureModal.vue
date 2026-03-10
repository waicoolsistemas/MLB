<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Team, Season } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  teams: Team[]
  existingGamesCount: number
  season?: Season | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'generate', data: { include_return: boolean; start_date: string | null }): void
  (e: 'close'): void
}>()

const includeReturn = ref(false)
const startDate = ref('')

const activeTeams = computed(() => props.teams.filter(t => t.is_active))
const teamCount = computed(() => activeTeams.value.length)
const hasBye = computed(() => teamCount.value % 2 !== 0)
const roundCount = computed(() => {
  const n = hasBye.value ? teamCount.value + 1 : teamCount.value
  const rounds = n - 1
  return includeReturn.value ? rounds * 2 : rounds
})
const gamesPerRound = computed(() => {
  const n = hasBye.value ? teamCount.value + 1 : teamCount.value
  const perRound = n / 2
  return hasBye.value ? perRound - 1 : perRound
})
const totalGames = computed(() => Math.floor(gamesPerRound.value * roundCount.value))

const dayLabels = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado']

const hasScheduleConfig = computed(() => !!props.season?.schedule_type)

const scheduleLabel = computed(() => {
  if (!props.season) return ''
  if (props.season.schedule_type === 'dominical') return 'Los juegos se programaran solo los domingos'
  if (props.season.schedule_type === 'semanal') return 'Los juegos se programaran de lunes a viernes'
  const days = (props.season.schedule_days || []).map(d => dayLabels[d]).join(', ')
  return `Dias habilitados: ${days}`
})

const gamesPerDayLabel = computed(() => {
  if (!props.season || props.season.games_per_day <= 1) return ''
  return `Se programaran hasta ${props.season.games_per_day} juegos por dia`
})

const timeSlotsLabel = computed(() => {
  if (!props.season?.default_time_slots?.length) return ''
  return `Horarios: ${props.season.default_time_slots.join(', ')}`
})

function handleSubmit() {
  emit('generate', {
    include_return: includeReturn.value,
    start_date: startDate.value || null,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h2 class="text-lg font-bold text-white">Generar Jornadas Automatico</h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <div v-if="teamCount < 2" class="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm px-4 py-3 rounded-lg">
          Se necesitan al menos 2 equipos activos para generar las jornadas. Actualmente hay {{ teamCount }}.
        </div>

        <template v-else>
          <div v-if="existingGamesCount > 0" class="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm px-4 py-3 rounded-lg">
            Ya hay {{ existingGamesCount }} juego{{ existingGamesCount === 1 ? '' : 's' }} creado{{ existingGamesCount === 1 ? '' : 's' }}.
            Generar las jornadas creara juegos adicionales.
          </div>

          <div class="bg-navy-800 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">Equipos activos</span>
              <span class="text-sm font-medium text-white">{{ teamCount }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">Jornadas</span>
              <span class="text-sm font-medium text-white">{{ roundCount }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">Total partidos</span>
              <span class="text-sm font-medium text-gold-400">{{ totalGames }}</span>
            </div>
            <div v-if="hasBye" class="text-xs text-gray-500 pt-1 border-t border-navy-700">
              Con numero impar de equipos, un equipo descansa cada jornada.
            </div>
          </div>

          <div v-if="hasScheduleConfig && startDate" class="bg-navy-800/60 border border-navy-700 rounded-lg px-4 py-3 space-y-1.5">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-gold-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-xs font-medium text-gold-400">Calendario de la temporada</span>
            </div>
            <p class="text-xs text-gray-300">{{ scheduleLabel }}</p>
            <p v-if="gamesPerDayLabel" class="text-xs text-gray-400">{{ gamesPerDayLabel }}</p>
            <p v-if="timeSlotsLabel" class="text-xs text-gray-400">{{ timeSlotsLabel }}</p>
          </div>

          <div class="flex items-center justify-between py-2">
            <div>
              <label class="text-sm font-medium text-gray-300">Ida y Vuelta</label>
              <p class="text-xs text-gray-500">Genera doble ronda</p>
            </div>
            <button
              type="button"
              class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
              :class="includeReturn ? 'bg-green-500' : 'bg-navy-600'"
              @click="includeReturn = !includeReturn"
            >
              <span
                class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                :class="includeReturn ? 'translate-x-6' : 'translate-x-1'"
              />
            </button>
          </div>

          <BaseInput
            v-model="startDate"
            label="Fecha de inicio (opcional)"
            type="date"
          />

          <p v-if="!startDate && hasScheduleConfig" class="text-xs text-gray-500 -mt-2">
            Ingresa una fecha de inicio para usar la configuracion de calendario de la temporada.
          </p>
        </template>

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton
            type="submit"
            :loading="loading"
            :disabled="teamCount < 2"
            class="flex-1"
          >
            Generar Jornadas
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
