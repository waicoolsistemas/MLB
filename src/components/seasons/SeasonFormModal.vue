<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Season, ScheduleType } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  season?: Season | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: {
    name: string
    start_date?: string | null
    end_date?: string | null
    is_active?: boolean
    schedule_type: ScheduleType
    schedule_days: number[]
    games_per_day: number
    default_time_slots: string[]
  }): void
  (e: 'close'): void
}>()

const name = ref(props.season?.name || '')
const startDate = ref(props.season?.start_date || '')
const endDate = ref(props.season?.end_date || '')
const isActive = ref(props.season?.is_active ?? true)
const nameError = ref('')

const scheduleType = ref<ScheduleType>(props.season?.schedule_type || 'custom')
const customDays = ref<number[]>(props.season?.schedule_days ?? [0, 1, 2, 3, 4, 5, 6])
const gamesPerDay = ref(props.season?.games_per_day ?? 1)
const timeSlots = ref<string[]>(props.season?.default_time_slots ?? [])

const dayLabels = [
  { value: 0, short: 'Dom', label: 'Domingo' },
  { value: 1, short: 'Lun', label: 'Lunes' },
  { value: 2, short: 'Mar', label: 'Martes' },
  { value: 3, short: 'Mie', label: 'Miercoles' },
  { value: 4, short: 'Jue', label: 'Jueves' },
  { value: 5, short: 'Vie', label: 'Viernes' },
  { value: 6, short: 'Sab', label: 'Sabado' },
]

const scheduleOptions: { value: ScheduleType; label: string; subtitle: string }[] = [
  { value: 'dominical', label: 'Dominical', subtitle: 'Solo domingos' },
  { value: 'semanal', label: 'Entre semana', subtitle: 'Lunes a viernes' },
  { value: 'custom', label: 'Personalizado', subtitle: 'Selecciona los dias' },
]

const activeDays = computed(() => {
  if (scheduleType.value === 'dominical') return [0]
  if (scheduleType.value === 'semanal') return [1, 2, 3, 4, 5]
  return customDays.value
})

watch(() => gamesPerDay.value, (newCount) => {
  if (newCount > timeSlots.value.length) {
    const diff = newCount - timeSlots.value.length
    for (let i = 0; i < diff; i++) {
      timeSlots.value.push('')
    }
  } else if (newCount < timeSlots.value.length) {
    timeSlots.value = timeSlots.value.slice(0, newCount)
  }
})

watch(() => props.season, (val) => {
  name.value = val?.name || ''
  startDate.value = val?.start_date || ''
  endDate.value = val?.end_date || ''
  isActive.value = val?.is_active ?? true
  scheduleType.value = val?.schedule_type || 'custom'
  customDays.value = val?.schedule_days ?? [0, 1, 2, 3, 4, 5, 6]
  gamesPerDay.value = val?.games_per_day ?? 1
  timeSlots.value = val?.default_time_slots ?? []
})

function toggleDay(day: number) {
  const idx = customDays.value.indexOf(day)
  if (idx >= 0) {
    if (customDays.value.length > 1) {
      customDays.value.splice(idx, 1)
    }
  } else {
    customDays.value.push(day)
    customDays.value.sort((a, b) => a - b)
  }
}

function validate(): boolean {
  nameError.value = ''
  if (name.value.trim().length < 2) {
    nameError.value = 'El nombre debe tener al menos 2 caracteres'
    return false
  }
  if (scheduleType.value === 'custom' && customDays.value.length === 0) {
    nameError.value = 'Selecciona al menos un dia'
    return false
  }
  return true
}

function handleSubmit() {
  if (!validate()) return

  const payload: {
    name: string
    start_date?: string | null
    end_date?: string | null
    is_active?: boolean
    schedule_type: ScheduleType
    schedule_days: number[]
    games_per_day: number
    default_time_slots: string[]
  } = {
    name: name.value.trim(),
    start_date: startDate.value || null,
    end_date: endDate.value || null,
    schedule_type: scheduleType.value,
    schedule_days: activeDays.value,
    games_per_day: gamesPerDay.value,
    default_time_slots: timeSlots.value.filter(t => t.trim() !== ''),
  }

  if (props.season) {
    payload.is_active = isActive.value
  }

  emit('save', payload)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-lg bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700 flex-shrink-0">
        <h2 class="text-lg font-bold text-white">
          {{ season ? 'Editar Temporada' : 'Nueva Temporada' }}
        </h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-5 overflow-y-auto flex-1">
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <BaseInput
          v-model="name"
          label="Nombre de la Temporada"
          placeholder="Ej: Enero-Abril 2025"
          :error="nameError"
        />

        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-300">Fecha Inicio</label>
            <input
              v-model="startDate"
              type="date"
              class="input-field"
            />
          </div>
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-300">Fecha Fin</label>
            <input
              v-model="endDate"
              type="date"
              class="input-field"
            />
          </div>
        </div>

        <div v-if="season" class="flex items-center justify-between py-2">
          <label class="text-sm font-medium text-gray-300">Temporada Activa</label>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
            :class="isActive ? 'bg-green-500' : 'bg-navy-600'"
            @click="isActive = !isActive"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
              :class="isActive ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="border-t border-navy-700 pt-5 space-y-4">
          <h3 class="text-sm font-semibold text-white uppercase tracking-wider">Configuracion de Calendario</h3>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Tipo de Calendario</label>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="opt in scheduleOptions"
                :key="opt.value"
                type="button"
                class="relative rounded-lg border px-3 py-2.5 text-left transition-all duration-200"
                :class="scheduleType === opt.value
                  ? 'border-cardinal-500 bg-cardinal-500/10'
                  : 'border-navy-600 bg-navy-800 hover:border-navy-500'"
                @click="scheduleType = opt.value"
              >
                <div class="text-sm font-medium" :class="scheduleType === opt.value ? 'text-white' : 'text-gray-300'">
                  {{ opt.label }}
                </div>
                <div class="text-xs mt-0.5" :class="scheduleType === opt.value ? 'text-cardinal-300' : 'text-gray-500'">
                  {{ opt.subtitle }}
                </div>
              </button>
            </div>
          </div>

          <div v-if="scheduleType === 'custom'">
            <label class="block text-sm font-medium text-gray-300 mb-2">Dias de Juego</label>
            <div class="flex gap-1.5">
              <button
                v-for="day in dayLabels"
                :key="day.value"
                type="button"
                class="w-10 h-10 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center justify-center"
                :class="customDays.includes(day.value)
                  ? 'bg-cardinal-600 text-white'
                  : 'bg-navy-800 border border-navy-600 text-gray-500 hover:border-navy-500 hover:text-gray-300'"
                @click="toggleDay(day.value)"
                :title="day.label"
              >
                {{ day.short }}
              </button>
            </div>
          </div>

          <div v-else class="bg-navy-800 rounded-lg px-3 py-2.5">
            <span class="text-xs text-gray-400">Dias habilitados: </span>
            <span class="text-xs text-white font-medium">
              {{ dayLabels.filter(d => activeDays.includes(d.value)).map(d => d.label).join(', ') }}
            </span>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Juegos por Dia</label>
            <div class="flex items-center gap-3">
              <button
                type="button"
                class="w-9 h-9 rounded-lg bg-navy-800 border border-navy-600 text-white flex items-center justify-center hover:border-navy-500 transition-colors disabled:opacity-40"
                :disabled="gamesPerDay <= 1"
                @click="gamesPerDay = Math.max(1, gamesPerDay - 1)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <span class="text-lg font-bold text-white w-8 text-center">{{ gamesPerDay }}</span>
              <button
                type="button"
                class="w-9 h-9 rounded-lg bg-navy-800 border border-navy-600 text-white flex items-center justify-center hover:border-navy-500 transition-colors"
                @click="gamesPerDay = Math.min(10, gamesPerDay + 1)"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Horarios</label>
            <div class="space-y-2">
              <div
                v-for="(_, idx) in gamesPerDay"
                :key="idx"
                class="flex items-center gap-3"
              >
                <span class="text-xs text-gray-500 w-16 flex-shrink-0">Juego {{ idx + 1 }}</span>
                <input
                  v-model="timeSlots[idx]"
                  type="time"
                  class="input-field flex-1"
                  placeholder="HH:MM"
                />
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-1.5">Los horarios son opcionales y se asignan al generar jornadas.</p>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            {{ season ? 'Guardar Cambios' : 'Crear Temporada' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
