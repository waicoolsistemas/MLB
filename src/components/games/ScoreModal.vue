<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Game } from '@/services/leagueService'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  game: Game
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: {
    home_score: number | null
    away_score: number | null
    status: string
    umpire_1: string | null
    umpire_2: string | null
    umpire_3: string | null
    scorer: string | null
  }): void
  (e: 'close'): void
}>()

const homeScore = ref(props.game.home_score?.toString() ?? '0')
const awayScore = ref(props.game.away_score?.toString() ?? '0')
const markCompleted = ref(props.game.status !== 'completed')

const umpire1 = ref(props.game.umpire_1 ?? '')
const umpire2 = ref(props.game.umpire_2 ?? '')
const umpire3 = ref(props.game.umpire_3 ?? '')
const scorer = ref(props.game.scorer ?? '')

const canSubmit = computed(() => {
  if (!markCompleted.value) return true
  return umpire1.value.trim() !== '' && scorer.value.trim() !== ''
})

function handleSubmit() {
  if (!canSubmit.value) return
  emit('save', {
    home_score: homeScore.value !== '' ? parseInt(homeScore.value) : null,
    away_score: awayScore.value !== '' ? parseInt(awayScore.value) : null,
    status: markCompleted.value ? 'completed' : props.game.status === 'scheduled' ? 'in_progress' : props.game.status,
    umpire_1: umpire1.value.trim() || null,
    umpire_2: umpire2.value.trim() || null,
    umpire_3: umpire3.value.trim() || null,
    scorer: scorer.value.trim() || null,
  })
}

function increment(team: 'home' | 'away') {
  if (team === 'home') {
    homeScore.value = (parseInt(homeScore.value || '0') + 1).toString()
  } else {
    awayScore.value = (parseInt(awayScore.value || '0') + 1).toString()
  }
}

function decrement(team: 'home' | 'away') {
  if (team === 'home') {
    const val = parseInt(homeScore.value || '0')
    if (val > 0) homeScore.value = (val - 1).toString()
  } else {
    const val = parseInt(awayScore.value || '0')
    if (val > 0) awayScore.value = (val - 1).toString()
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700 sticky top-0 bg-navy-900 z-10">
        <h2 class="text-lg font-bold text-white">Registrar Marcador</h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6">
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
          {{ error }}
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1 text-center">
            <div class="w-12 h-12 rounded-xl bg-blue-400/10 flex items-center justify-center mx-auto mb-2">
              <span class="text-lg font-bold text-blue-400">{{ game.home_team_name.charAt(0) }}</span>
            </div>
            <p class="text-white text-sm font-medium mb-3 truncate">{{ game.home_team_name }}</p>
            <div class="flex items-center justify-center gap-2">
              <button
                type="button"
                @click="decrement('home')"
                class="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <input
                v-model="homeScore"
                type="number"
                min="0"
                class="w-16 h-14 text-center text-2xl font-bold text-white bg-navy-700 border border-navy-600 rounded-xl outline-none focus:border-cardinal-600 transition-colors"
              />
              
              <button
                type="button"
                @click="increment('home')"
                class="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          <div class="text-gray-500 text-lg font-bold pt-6">VS</div>

          <div class="flex-1 text-center">
            <div class="w-12 h-12 rounded-xl bg-cardinal-600/10 flex items-center justify-center mx-auto mb-2">
              <span class="text-lg font-bold text-cardinal-400">{{ game.away_team_name.charAt(0) }}</span>
            </div>
            <p class="text-white text-sm font-medium mb-3 truncate">{{ game.away_team_name }}</p>
            <div class="flex items-center justify-center gap-2">
              <button
                type="button"
                @click="decrement('away')"
                class="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" />
                </svg>
              </button>
              <input
                v-model="awayScore"
                type="number"
                min="0"
                class="w-16 h-14 text-center text-2xl font-bold text-white bg-navy-700 border border-navy-600 rounded-xl outline-none focus:border-cardinal-600 transition-colors"
              />
              <button
                type="button"
                @click="increment('away')"
                class="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="mt-6 pt-4 border-t border-navy-700">
          <h3 class="text-sm font-semibold text-gray-300 mb-3">Oficiales del Juego</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">
                Umpire 1
                <span v-if="markCompleted" class="text-red-400 ml-0.5">*</span>
              </label>
              <input
                v-model="umpire1"
                type="text"
                placeholder="Nombre del umpire principal"
                class="w-full h-9 px-3 text-sm text-white bg-navy-700 border rounded-lg outline-none transition-colors placeholder:text-gray-600"
                :class="markCompleted && !umpire1.trim() ? 'border-red-500/50 focus:border-red-500' : 'border-navy-600 focus:border-cardinal-600'"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Umpire 2</label>
              <input
                v-model="umpire2"
                type="text"
                placeholder="Nombre del segundo umpire"
                class="w-full h-9 px-3 text-sm text-white bg-navy-700 border border-navy-600 rounded-lg outline-none focus:border-cardinal-600 transition-colors placeholder:text-gray-600"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">Umpire 3</label>
              <input
                v-model="umpire3"
                type="text"
                placeholder="Nombre del tercer umpire (opcional)"
                class="w-full h-9 px-3 text-sm text-white bg-navy-700 border border-navy-600 rounded-lg outline-none focus:border-cardinal-600 transition-colors placeholder:text-gray-600"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-400 mb-1">
                Anotador
                <span v-if="markCompleted" class="text-red-400 ml-0.5">*</span>
              </label>
              <input
                v-model="scorer"
                type="text"
                placeholder="Nombre del anotador oficial"
                class="w-full h-9 px-3 text-sm text-white bg-navy-700 border rounded-lg outline-none transition-colors placeholder:text-gray-600"
                :class="markCompleted && !scorer.trim() ? 'border-red-500/50 focus:border-red-500' : 'border-navy-600 focus:border-cardinal-600'"
              />
            </div>
          </div>
          <p v-if="markCompleted && !canSubmit" class="text-red-400 text-xs mt-2">
            * Umpire 1 y Anotador son requeridos para finalizar el juego
          </p>
        </div>

        <div class="flex items-center justify-between mt-4 py-3 border-t border-navy-700">
          <label class="text-sm font-medium text-gray-300">Marcar como Finalizado</label>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
            :class="markCompleted ? 'bg-green-500' : 'bg-navy-600'"
            @click="markCompleted = !markCompleted"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
              :class="markCompleted ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="flex gap-3 pt-4">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" :disabled="!canSubmit" class="flex-1">
            Guardar Marcador
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
