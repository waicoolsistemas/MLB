<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Matchday, Team } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  matchday?: Matchday | null
  teams: Team[]
  nextNumber: number
  loading?: boolean
  error?: string | null
  deleteLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', data: Record<string, unknown>): void
  (e: 'delete'): void
  (e: 'close'): void
}>()

const number = ref(props.matchday?.number?.toString() || props.nextNumber.toString())
const name = ref(props.matchday?.name || '')
const gameDate = ref(props.matchday?.game_date || '')
const gameTime = ref(props.matchday?.game_time?.slice(0, 5) || '')
const location = ref(props.matchday?.location || '')
const numberError = ref('')

interface GameRow {
  home_team_id: string
  away_team_id: string
  game_date: string
  game_time: string
  location: string
  notes: string
}

const gameRows = ref<GameRow[]>([])
const showConfirmDelete = ref(false)

watch(() => props.matchday, (val) => {
  number.value = val?.number?.toString() || props.nextNumber.toString()
  name.value = val?.name || ''
  gameDate.value = val?.game_date || ''
  gameTime.value = val?.game_time?.slice(0, 5) || ''
  location.value = val?.location || ''
})

const activeTeams = computed(() => props.teams.filter(t => t.is_active))

const isEditing = computed(() => !!props.matchday)

function addGameRow() {
  gameRows.value.push({
    home_team_id: '',
    away_team_id: '',
    game_date: '',
    game_time: '',
    location: '',
    notes: '',
  })
}

function removeGameRow(index: number) {
  gameRows.value.splice(index, 1)
}

function awayOptions(row: GameRow) {
  return activeTeams.value.filter(t => t.id !== row.home_team_id)
}

function homeOptions(row: GameRow) {
  return activeTeams.value.filter(t => t.id !== row.away_team_id)
}

function validate(): boolean {
  numberError.value = ''
  const n = parseInt(number.value)
  if (isNaN(n) || n < 1) {
    numberError.value = 'El numero debe ser mayor a 0'
    return false
  }
  for (const row of gameRows.value) {
    if (!row.home_team_id || !row.away_team_id) {
      numberError.value = 'Selecciona ambos equipos en todos los juegos'
      return false
    }
    if (row.home_team_id === row.away_team_id) {
      numberError.value = 'Los equipos deben ser diferentes'
      return false
    }
  }
  return true
}

function handleSubmit() {
  if (!validate()) return

  const payload: Record<string, unknown> = {
    number: parseInt(number.value),
    name: name.value || null,
    game_date: gameDate.value || null,
    game_time: gameTime.value || null,
    location: location.value || '',
  }

  if (!isEditing.value && gameRows.value.length > 0) {
    payload.games = gameRows.value.map(row => ({
      home_team_id: row.home_team_id,
      away_team_id: row.away_team_id,
      game_date: row.game_date || null,
      game_time: row.game_time || null,
      location: row.location || '',
      notes: row.notes || '',
    }))
  }

  emit('save', payload)
}

function handleDelete() {
  showConfirmDelete.value = false
  emit('delete')
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-lg bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700 sticky top-0 bg-navy-900 z-10">
        <h2 class="text-lg font-bold text-white">
          {{ isEditing ? 'Editar Jornada' : 'Nueva Jornada' }}
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

        <div class="grid grid-cols-2 gap-3">
          <BaseInput
            v-model="number"
            label="Numero"
            type="number"
            placeholder="1"
            :error="numberError"
          />
          <BaseInput
            v-model="name"
            label="Nombre (opcional)"
            placeholder="Ej: Jornada Doble"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <BaseInput
            v-model="gameDate"
            label="Fecha por defecto"
            type="date"
          />
          <BaseInput
            v-model="gameTime"
            label="Hora por defecto"
            type="time"
          />
        </div>

        <BaseInput
          v-model="location"
          label="Ubicacion por defecto"
          placeholder="Ej: Campo 1 (opcional)"
        />

        <div v-if="!isEditing" class="border-t border-navy-700 pt-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-white">Juegos</h3>
            <button
              type="button"
              @click="addGameRow"
              class="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar Juego
            </button>
          </div>

          <div v-if="gameRows.length === 0" class="text-center py-4">
            <p class="text-gray-500 text-xs">Sin juegos. Puedes crear una jornada vacia o agregar juegos.</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="(row, idx) in gameRows"
              :key="idx"
              class="bg-navy-800 border border-navy-700 rounded-lg p-3 space-y-2"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-gray-400">Juego {{ idx + 1 }}</span>
                <button
                  type="button"
                  @click="removeGameRow(idx)"
                  class="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div class="grid grid-cols-2 gap-2">
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-400">Local</label>
                  <select v-model="row.home_team_id" class="input-field text-sm !py-1.5">
                    <option value="" disabled>Seleccionar</option>
                    <option v-for="t in homeOptions(row)" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-400">Visitante</label>
                  <select v-model="row.away_team_id" class="input-field text-sm !py-1.5">
                    <option value="" disabled>Seleccionar</option>
                    <option v-for="t in awayOptions(row)" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-400">Fecha</label>
                  <input v-model="row.game_date" type="date" class="input-field text-xs !py-1.5" />
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-400">Hora</label>
                  <input v-model="row.game_time" type="time" class="input-field text-xs !py-1.5" />
                </div>
                <div class="space-y-1">
                  <label class="block text-xs font-medium text-gray-400">Cancha</label>
                  <input v-model="row.location" type="text" placeholder="Opcional" class="input-field text-xs !py-1.5" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            {{ isEditing ? 'Guardar Cambios' : 'Crear Jornada' }}
          </BaseButton>
        </div>

        <div v-if="isEditing && matchday" class="border-t border-navy-700 pt-4">
          <div v-if="!showConfirmDelete">
            <button
              type="button"
              @click="showConfirmDelete = true"
              class="w-full text-sm text-red-400 hover:text-red-300 transition-colors py-2"
            >
              Eliminar Jornada
            </button>
          </div>
          <div v-else class="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
            <p class="text-red-400 text-sm font-medium mb-1">Eliminar Jornada {{ matchday.number }}</p>
            <p class="text-gray-400 text-xs mb-3">
              Se eliminaran la jornada y todos sus juegos ({{ matchday.games_count }} juego{{ matchday.games_count === 1 ? '' : 's' }}).
              Esta accion no se puede deshacer.
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                @click="showConfirmDelete = false"
                class="btn-ghost flex-1 text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                @click="handleDelete"
                :disabled="deleteLoading"
                class="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg transition-all duration-200 text-xs disabled:opacity-50"
              >
                {{ deleteLoading ? 'Eliminando...' : 'Confirmar Eliminacion' }}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
