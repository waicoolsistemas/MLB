<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StandingRow } from '@/services/leagueService'

const props = defineProps<{
  standings: StandingRow[]
  teamsCount: number
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  generate: [teamIds: string[]]
  close: []
}>()

const selectedTeams = ref<string[]>(
  props.standings.slice(0, props.teamsCount).map(s => s.team_id)
)

const canGenerate = computed(() => selectedTeams.value.length === props.teamsCount)

function toggleTeam(teamId: string) {
  const idx = selectedTeams.value.indexOf(teamId)
  if (idx >= 0) {
    selectedTeams.value.splice(idx, 1)
  } else if (selectedTeams.value.length < props.teamsCount) {
    selectedTeams.value.push(teamId)
  }
}

function isSelected(teamId: string): boolean {
  return selectedTeams.value.includes(teamId)
}

function seedOf(teamId: string): number {
  return selectedTeams.value.indexOf(teamId) + 1
}

function moveUp(teamId: string) {
  const idx = selectedTeams.value.indexOf(teamId)
  if (idx > 0) {
    const temp = selectedTeams.value[idx - 1]
    selectedTeams.value[idx - 1] = teamId
    selectedTeams.value[idx] = temp
  }
}

function moveDown(teamId: string) {
  const idx = selectedTeams.value.indexOf(teamId)
  if (idx >= 0 && idx < selectedTeams.value.length - 1) {
    const temp = selectedTeams.value[idx + 1]
    selectedTeams.value[idx + 1] = teamId
    selectedTeams.value[idx] = temp
  }
}

function handleGenerate() {
  if (!canGenerate.value) return
  emit('generate', [...selectedTeams.value])
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-lg bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700 flex-shrink-0">
        <div>
          <h3 class="text-white font-bold">Seleccionar Equipos</h3>
          <p class="text-xs text-gray-500 mt-0.5">
            {{ selectedTeams.length }}/{{ teamsCount }} equipos seleccionados
          </p>
        </div>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
        <p class="text-xs text-gray-400 mb-3">
          Selecciona {{ teamsCount }} equipos y ordenalos por semilla (1 = mejor posicion). Los equipos se pre-seleccionan segun la tabla de posiciones.
        </p>

        <div
          v-for="(row, index) in standings"
          :key="row.team_id"
          @click="toggleTeam(row.team_id)"
          class="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200"
          :class="isSelected(row.team_id)
            ? 'border-cardinal-600 bg-cardinal-600/5'
            : 'border-navy-700 hover:border-navy-600'"
        >
          <span class="text-xs font-bold w-6 text-center text-gray-500">{{ index + 1 }}</span>
          <div class="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center flex-shrink-0">
            <span class="text-xs font-bold text-white">{{ row.team_name.charAt(0) }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <span class="text-sm text-white font-medium truncate block">{{ row.team_name }}</span>
            <span class="text-[10px] text-gray-500">
              {{ row.wins }}G - {{ row.losses }}P · Dif: {{ row.run_diff > 0 ? '+' : '' }}{{ row.run_diff }}
            </span>
          </div>
          <div v-if="isSelected(row.team_id)" class="flex items-center gap-1">
            <span class="text-xs font-bold text-cardinal-400 w-6 text-center">
              #{{ seedOf(row.team_id) }}
            </span>
            <div class="flex flex-col">
              <button
                @click.stop="moveUp(row.team_id)"
                class="p-0.5 text-gray-500 hover:text-white transition-colors"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                @click.stop="moveDown(row.team_id)"
                class="p-0.5 text-gray-500 hover:text-white transition-colors"
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          <div v-else class="w-6 h-6 rounded border border-navy-600 flex-shrink-0"></div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-navy-700 flex-shrink-0 space-y-3">
        <div v-if="error" class="bg-red-400/10 border border-red-400/20 rounded-lg p-3">
          <p class="text-xs text-red-400">{{ error }}</p>
        </div>

        <div class="flex gap-3">
          <button type="button" @click="emit('close')" class="btn-ghost flex-1 text-sm">
            Cancelar
          </button>
          <button
            @click="handleGenerate"
            :disabled="!canGenerate || loading"
            class="btn-primary flex-1 text-sm"
          >
            {{ loading ? 'Generando...' : 'Generar Bracket' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
