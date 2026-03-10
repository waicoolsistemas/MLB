<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Game, Team, Matchday } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  game?: Game | null
  teams: Team[]
  matchdays?: Matchday[]
  selectedMatchdayNumber?: number | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: Record<string, unknown>): void
  (e: 'close'): void
}>()

const NEW_MATCHDAY_VALUE = '__new__'

function getInitialMatchdaySelection(): string {
  if (props.game?.matchday_id) {
    return props.game.matchday_id
  }
  if (props.game) {
    const found = props.matchdays?.find(m => m.number === props.game!.matchday)
    if (found) return found.id
  }
  if (props.selectedMatchdayNumber && props.matchdays) {
    const found = props.matchdays.find(m => m.number === props.selectedMatchdayNumber)
    if (found) return found.id
  }
  if (props.matchdays && props.matchdays.length > 0) {
    return props.matchdays[props.matchdays.length - 1].id
  }
  return NEW_MATCHDAY_VALUE
}

const selectedMatchdayId = ref(getInitialMatchdaySelection())
const newMatchdayNumber = ref('')

const homeTeamId = ref(props.game?.home_team_id || '')
const awayTeamId = ref(props.game?.away_team_id || '')
const gameDate = ref(props.game?.game_date || '')
const gameTime = ref(props.game?.game_time?.slice(0, 5) || '')
const location = ref(props.game?.location || '')
const notes = ref(props.game?.notes || '')
const status = ref(props.game?.status || 'scheduled')
const homeScore = ref(props.game?.home_score?.toString() ?? '')
const awayScore = ref(props.game?.away_score?.toString() ?? '')

const matchdayError = ref('')
const teamsError = ref('')

watch(() => props.game, (val) => {
  selectedMatchdayId.value = getInitialMatchdaySelection()
  homeTeamId.value = val?.home_team_id || ''
  awayTeamId.value = val?.away_team_id || ''
  gameDate.value = val?.game_date || ''
  gameTime.value = val?.game_time?.slice(0, 5) || ''
  location.value = val?.location || ''
  notes.value = val?.notes || ''
  status.value = val?.status || 'scheduled'
  homeScore.value = val?.home_score?.toString() ?? ''
  awayScore.value = val?.away_score?.toString() ?? ''
})

const isNewMatchday = computed(() => selectedMatchdayId.value === NEW_MATCHDAY_VALUE)

const selectedMatchday = computed(() => {
  if (isNewMatchday.value) return null
  return props.matchdays?.find(m => m.id === selectedMatchdayId.value) ?? null
})

watch(selectedMatchdayId, (newId) => {
  if (newId === NEW_MATCHDAY_VALUE) return
  const md = props.matchdays?.find(m => m.id === newId)
  if (md && !props.game) {
    if (md.game_date && !gameDate.value) gameDate.value = md.game_date
    if (md.game_time && !gameTime.value) gameTime.value = md.game_time.slice(0, 5)
    if (md.location && !location.value) location.value = md.location
  }
})

const activeTeams = computed(() => props.teams.filter(t => t.is_active))

const awayTeamOptions = computed(() =>
  activeTeams.value.filter(t => t.id !== homeTeamId.value)
)

const homeTeamOptions = computed(() =>
  activeTeams.value.filter(t => t.id !== awayTeamId.value)
)

const statusOptions = [
  { value: 'scheduled', label: 'Programado' },
  { value: 'in_progress', label: 'En Juego' },
  { value: 'completed', label: 'Finalizado' },
  { value: 'cancelled', label: 'Cancelado' },
]

function validate(): boolean {
  matchdayError.value = ''
  teamsError.value = ''

  if (isNewMatchday.value) {
    const n = parseInt(newMatchdayNumber.value)
    if (isNaN(n) || n < 1) {
      matchdayError.value = 'Ingresa un numero de jornada valido'
      return false
    }
  }

  if (!homeTeamId.value || !awayTeamId.value) {
    teamsError.value = 'Debes seleccionar ambos equipos'
    return false
  }
  if (homeTeamId.value === awayTeamId.value) {
    teamsError.value = 'Los equipos deben ser diferentes'
    return false
  }
  return true
}

function handleSubmit() {
  if (!validate()) return

  let matchday: number
  let matchdayId: string | null = null

  if (isNewMatchday.value) {
    matchday = parseInt(newMatchdayNumber.value)
  } else if (selectedMatchday.value) {
    matchday = selectedMatchday.value.number
    matchdayId = selectedMatchday.value.id
  } else {
    matchday = 1
  }

  const payload: Record<string, unknown> = {
    home_team_id: homeTeamId.value,
    away_team_id: awayTeamId.value,
    matchday,
    matchday_id: matchdayId,
    game_date: gameDate.value || null,
    game_time: gameTime.value || null,
    location: location.value,
    notes: notes.value,
  }

  if (props.game) {
    payload.status = status.value
    payload.home_score = homeScore.value !== '' ? parseInt(homeScore.value) : null
    payload.away_score = awayScore.value !== '' ? parseInt(awayScore.value) : null
  }

  emit('save', payload)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-lg bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700 sticky top-0 bg-navy-900 z-10">
        <h2 class="text-lg font-bold text-white">
          {{ game ? 'Editar Juego' : 'Nuevo Juego' }}
        </h2>
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

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Jornada</label>
          <select v-model="selectedMatchdayId" class="input-field">
            <option
              v-for="md in matchdays"
              :key="md.id"
              :value="md.id"
            >
              Jornada {{ md.number }}{{ md.name ? ` - ${md.name}` : '' }}
            </option>
            <option :value="NEW_MATCHDAY_VALUE">+ Nueva Jornada</option>
          </select>
          <div v-if="isNewMatchday" class="mt-2">
            <BaseInput
              v-model="newMatchdayNumber"
              label="Numero de jornada"
              type="number"
              placeholder="Ej: 5"
              :error="matchdayError"
            />
          </div>
          <p v-if="matchdayError && !isNewMatchday" class="text-red-400 text-xs">{{ matchdayError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Equipo Local</label>
          <select
            v-model="homeTeamId"
            class="input-field"
          >
            <option value="" disabled>Seleccionar equipo local</option>
            <option v-for="team in homeTeamOptions" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Equipo Visitante</label>
          <select
            v-model="awayTeamId"
            class="input-field"
          >
            <option value="" disabled>Seleccionar equipo visitante</option>
            <option v-for="team in awayTeamOptions" :key="team.id" :value="team.id">
              {{ team.name }}
            </option>
          </select>
          <p v-if="teamsError" class="text-red-400 text-xs">{{ teamsError }}</p>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <BaseInput
            v-model="gameDate"
            label="Fecha"
            type="date"
          />
          <BaseInput
            v-model="gameTime"
            label="Hora"
            type="time"
          />
        </div>

        <BaseInput
          v-model="location"
          label="Cancha / Ubicacion"
          placeholder="Ej: Campo 1 (opcional)"
        />

        <div v-if="game" class="space-y-4 pt-2 border-t border-navy-700">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-300">Estado</label>
            <select v-model="status" class="input-field">
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <BaseInput
              v-model="homeScore"
              label="Carreras Local"
              type="number"
              placeholder="0"
            />
            <BaseInput
              v-model="awayScore"
              label="Carreras Visitante"
              type="number"
              placeholder="0"
            />
          </div>
        </div>

        <BaseInput
          v-model="notes"
          label="Notas"
          placeholder="Notas adicionales (opcional)"
        />

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            {{ game ? 'Guardar Cambios' : 'Crear Juego' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
