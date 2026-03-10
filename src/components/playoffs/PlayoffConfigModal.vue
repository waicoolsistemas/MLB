<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PlayoffConfig } from '@/services/leagueService'

const props = defineProps<{
  config: PlayoffConfig | null
  maxTeams: number
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  save: [payload: { teams_count: number; series_format: string }]
  close: []
}>()

const teamsCount = ref(props.config?.teams_count ?? Math.min(4, props.maxTeams))
const seriesFormat = ref(props.config?.series_format ?? 'single_game')

watch(() => props.config, (c) => {
  if (c) {
    teamsCount.value = c.teams_count
    seriesFormat.value = c.series_format
  }
})

const teamOptions = [2, 4, 6, 8, 10, 12, 16].filter(n => n <= props.maxTeams)

function handleSubmit() {
  emit('save', {
    teams_count: teamsCount.value,
    series_format: seriesFormat.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h3 class="text-white font-bold">Configurar Playoffs</h3>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-5">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Equipos clasificados</label>
          <select
            v-model.number="teamsCount"
            class="w-full h-10 px-3 text-sm bg-navy-800 border border-navy-600 rounded-lg text-white focus:border-cardinal-600 focus:outline-none transition-colors appearance-none cursor-pointer"
          >
            <option v-for="n in teamOptions" :key="n" :value="n">{{ n }} equipos</option>
          </select>
          <p class="text-xs text-gray-500 mt-1">Maximo disponible: {{ maxTeams }} equipos activos</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Formato de serie</label>
          <div class="space-y-2">
            <label
              v-for="opt in [
                { value: 'single_game', label: 'A 1 juego', desc: 'El ganador avanza con un solo partido' },
                { value: 'best_of_3', label: 'Mejor de 3', desc: 'El primero en ganar 2 juegos avanza' },
                { value: 'best_of_5', label: 'Mejor de 5', desc: 'El primero en ganar 3 juegos avanza' },
              ]"
              :key="opt.value"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200"
              :class="seriesFormat === opt.value
                ? 'border-cardinal-600 bg-cardinal-600/5'
                : 'border-navy-600 hover:border-navy-500'"
            >
              <input
                type="radio"
                :value="opt.value"
                v-model="seriesFormat"
                class="mt-0.5 w-4 h-4 text-cardinal-600 bg-navy-700 border-navy-600 focus:ring-cardinal-600 focus:ring-offset-0 cursor-pointer"
              />
              <div>
                <span class="text-sm font-medium text-white">{{ opt.label }}</span>
                <p class="text-xs text-gray-500 mt-0.5">{{ opt.desc }}</p>
              </div>
            </label>
          </div>
        </div>

        <div v-if="error" class="bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          <p class="text-xs text-red-400">{{ error }}</p>
        </div>

        <div class="flex gap-3 pt-2">
          <button type="button" @click="emit('close')" class="btn-ghost flex-1 text-sm">
            Cancelar
          </button>
          <button type="submit" :disabled="loading || teamOptions.length === 0" class="btn-primary flex-1 text-sm">
            {{ loading ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
