<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import { leagueService } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import PlayoffConfigModal from '@/components/playoffs/PlayoffConfigModal.vue'
import TeamSelectorModal from '@/components/playoffs/TeamSelectorModal.vue'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const error = ref<string | null>(null)

const showConfigModal = ref(false)
const configLoading = ref(false)
const configError = ref<string | null>(null)

const showTeamSelector = ref(false)
const generateLoading = ref(false)
const generateError = ref<string | null>(null)

const deleteLoading = ref(false)
const deleteConfirm = ref(false)

onMounted(async () => {
  error.value = null
  try {
    await Promise.all([
      store.fetchPlayoffConfigIfNeeded(categoryId.value),
      store.fetchPlayoffBracketIfNeeded(categoryId.value),
      store.fetchStandingsIfNeeded(categoryId.value),
      store.fetchTeamsIfNeeded(categoryId.value),
    ])
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar datos'
  }
})

const activeTeamsCount = computed(() => store.teams.filter(t => t.is_active).length)
const hasBracket = computed(() => (store.playoffBracket?.rounds?.length ?? 0) > 0)

const formatLabel: Record<string, string> = {
  single_game: 'A 1 juego',
  best_of_3: 'Mejor de 3',
  best_of_5: 'Mejor de 5',
}

const statusLabel: Record<string, string> = {
  setup: 'Configuracion',
  in_progress: 'En progreso',
  completed: 'Completado',
}

const statusClasses: Record<string, string> = {
  setup: 'bg-gray-500/10 text-gray-400',
  in_progress: 'bg-gold-400/10 text-gold-400',
  completed: 'bg-green-400/10 text-green-400',
}

async function handleSaveConfig(payload: { teams_count: number; series_format: string }) {
  configLoading.value = true
  configError.value = null
  try {
    await leagueService.savePlayoffConfig(categoryId.value, payload)
    showConfigModal.value = false
    await store.refreshPlayoffConfig(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    configError.value = e.response?.data?.error || 'Error al guardar configuracion'
  } finally {
    configLoading.value = false
  }
}

function openTeamSelector() {
  generateError.value = null
  showTeamSelector.value = true
}

async function handleGenerate(teamIds: string[]) {
  generateLoading.value = true
  generateError.value = null
  try {
    await leagueService.generatePlayoffBracket(categoryId.value, teamIds)
    showTeamSelector.value = false
    await store.refreshPlayoffBracket(categoryId.value)
    await store.refreshPlayoffConfig(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    generateError.value = e.response?.data?.error || 'Error al generar bracket'
  } finally {
    generateLoading.value = false
  }
}

async function handleDeleteBracket() {
  deleteLoading.value = true
  try {
    await leagueService.deletePlayoffBracket(categoryId.value)
    deleteConfirm.value = false
    store.invalidatePlayoffs()
    await store.refreshPlayoffBracket(categoryId.value)
    await store.refreshPlayoffConfig(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al eliminar bracket'
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="error" class="bg-red-400/10 border border-red-400/20 rounded-lg p-3">
      <p class="text-xs text-red-400">{{ error }}</p>
    </div>

    <div v-if="!store.playoffConfig" class="text-center py-12">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Configurar Playoffs</h3>
      <p class="text-gray-500 text-sm max-w-sm mx-auto mb-5">
        Define cuantos equipos clasifican y el formato de las series para iniciar los playoffs de esta categoria.
      </p>
      <button
        @click="showConfigModal = true"
        :disabled="activeTeamsCount < 2"
        class="btn-primary text-sm"
      >
        Configurar Playoffs
      </button>
      <p v-if="activeTeamsCount < 2" class="text-xs text-gray-500 mt-2">
        Se necesitan al menos 2 equipos activos
      </p>
    </div>

    <template v-else>
      <div class="bg-navy-900 border border-navy-700 rounded-lg p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-white">Configuracion de Playoffs</h3>
          <span
            class="text-xs font-medium px-2 py-0.5 rounded-full"
            :class="statusClasses[store.playoffConfig.status] || 'bg-gray-500/10 text-gray-400'"
          >
            {{ statusLabel[store.playoffConfig.status] || store.playoffConfig.status }}
          </span>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="text-xs text-gray-500 block">Equipos clasificados</label>
            <span class="text-white font-medium">{{ store.playoffConfig.teams_count }}</span>
          </div>
          <div>
            <label class="text-xs text-gray-500 block">Formato de serie</label>
            <span class="text-white font-medium">{{ formatLabel[store.playoffConfig.series_format] || store.playoffConfig.series_format }}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 mt-4 pt-4 border-t border-navy-700">
          <button
            v-if="store.playoffConfig.status === 'setup'"
            @click="showConfigModal = true"
            class="btn-secondary text-xs py-2 px-4"
          >
            Editar Configuracion
          </button>

          <button
            v-if="!hasBracket && store.playoffConfig.status !== 'completed' && store.standings.length >= store.playoffConfig.teams_count"
            @click="openTeamSelector"
            class="btn-primary text-xs py-2 px-4"
          >
            Seleccionar Equipos y Generar Bracket
          </button>

          <p
            v-if="!hasBracket && store.standings.length < store.playoffConfig.teams_count"
            class="text-xs text-gray-500"
          >
            Se necesitan al menos {{ store.playoffConfig.teams_count }} equipos con posiciones para generar el bracket.
          </p>

          <button
            v-if="hasBracket"
            @click="deleteConfirm = true"
            class="ml-auto text-xs text-red-400 hover:text-red-300 transition-colors px-3 py-2 rounded-lg hover:bg-red-900/20"
          >
            Eliminar Bracket
          </button>
        </div>
      </div>

      <div v-if="hasBracket" class="bg-navy-900 border border-navy-700 rounded-lg p-5">
        <h3 class="text-sm font-semibold text-white mb-3">Resumen del Bracket</h3>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="text-xs text-gray-500 block">Rondas</label>
            <span class="text-white font-medium">{{ store.playoffBracket?.rounds?.length ?? 0 }}</span>
          </div>
          <div>
            <label class="text-xs text-gray-500 block">Series totales</label>
            <span class="text-white font-medium">
              {{ store.playoffBracket?.rounds?.reduce((sum, r) => sum + r.series.length, 0) ?? 0 }}
            </span>
          </div>
          <div>
            <label class="text-xs text-gray-500 block">Series completadas</label>
            <span class="text-white font-medium">
              {{ store.playoffBracket?.rounds?.reduce((sum, r) => sum + r.series.filter(s => s.status === 'completed').length, 0) ?? 0 }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <PlayoffConfigModal
      v-if="showConfigModal"
      :config="store.playoffConfig"
      :max-teams="activeTeamsCount"
      :loading="configLoading"
      :error="configError"
      @save="handleSaveConfig"
      @close="showConfigModal = false"
    />

    <TeamSelectorModal
      v-if="showTeamSelector && store.playoffConfig"
      :standings="store.standings"
      :teams-count="store.playoffConfig.teams_count"
      :loading="generateLoading"
      :error="generateError"
      @generate="handleGenerate"
      @close="showTeamSelector = false"
    />

    <div
      v-if="deleteConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div class="absolute inset-0 bg-black/70" @click="deleteConfirm = false"></div>
      <div class="relative w-full max-w-sm bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl p-6">
        <h3 class="text-white font-bold mb-2">Eliminar Bracket</h3>
        <p class="text-gray-400 text-sm mb-5">
          Se eliminaran todas las series y juegos de playoffs. Esta accion no se puede deshacer.
        </p>
        <div class="flex gap-3">
          <button @click="deleteConfirm = false" class="btn-ghost flex-1 text-sm">
            Cancelar
          </button>
          <button
            @click="handleDeleteBracket"
            :disabled="deleteLoading"
            class="flex-1 bg-red-600 hover:bg-red-500 text-white font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 text-sm disabled:opacity-50"
          >
            {{ deleteLoading ? 'Eliminando...' : 'Eliminar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
