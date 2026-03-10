<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { leagueService, type Season, type ScheduleType } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import SeasonFormModal from '@/components/seasons/SeasonFormModal.vue'

const router = useRouter()
const myLeagueStore = useMyLeagueStore()

const showSeasonModal = ref(false)
const editingSeason = ref<Season | null>(null)
const seasonLoading = ref(false)
const seasonError = ref<string | null>(null)

const league = computed(() => myLeagueStore.league)
const isLoading = computed(() => myLeagueStore.isLoading)
const error = computed(() => myLeagueStore.error)

const activeSeasons = computed(() => league.value?.seasons?.filter(s => s.is_active).length || 0)
const totalCategories = computed(() =>
  league.value?.seasons?.reduce((sum, s) => sum + (s.categories?.length || 0), 0) || 0
)

onMounted(async () => {
  await fetchLeague()
})

async function fetchLeague() {
  try {
    await myLeagueStore.fetchIfNeeded()
  } catch {
  }
}

function openCreateSeason() {
  editingSeason.value = null
  seasonError.value = null
  showSeasonModal.value = true
}

function openEditSeason(season: Season) {
  editingSeason.value = season
  seasonError.value = null
  showSeasonModal.value = true
}

async function handleSaveSeason(payload: { name: string; start_date?: string | null; end_date?: string | null; is_active?: boolean; schedule_type?: ScheduleType; schedule_days?: number[]; games_per_day?: number; default_time_slots?: string[] }) {
  if (!league.value) return
  seasonLoading.value = true
  seasonError.value = null
  try {
    if (editingSeason.value) {
      await leagueService.updateSeason(editingSeason.value.id, payload)
    } else {
      await leagueService.createSeason(league.value.id, payload)
    }
    showSeasonModal.value = false
    editingSeason.value = null
    await myLeagueStore.refresh()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    seasonError.value = e.response?.data?.error || 'Error al guardar temporada'
  } finally {
    seasonLoading.value = false
  }
}

function goToSeason(seasonId: string) {
  router.push({ name: 'admin-season-detail', params: { seasonId } })
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div>
    <div v-if="isLoading" class="space-y-6">
      <div class="card p-6 animate-pulse">
        <div class="h-6 bg-navy-700 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-navy-700 rounded w-1/2"></div>
      </div>
      <div class="card p-6 animate-pulse">
        <div class="h-5 bg-navy-700 rounded w-1/4 mb-4"></div>
        <div class="space-y-3">
          <div class="h-16 bg-navy-700 rounded"></div>
          <div class="h-16 bg-navy-700 rounded"></div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="card p-12 text-center">
      <div class="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">{{ error }}</h3>
      <p class="text-gray-500 text-sm">Contacta al super administrador si el problema persiste.</p>
    </div>

    <div v-else-if="league" class="space-y-6">
      <div class="card p-6">
        <div class="flex items-center gap-4 mb-6">
          <div v-if="league.logo_url" class="w-14 h-14 rounded-xl overflow-hidden bg-navy-700 flex-shrink-0">
            <img :src="league.logo_url" :alt="league.name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center flex-shrink-0">
            <span class="text-gold-400 font-bold text-2xl">{{ league.name.charAt(0).toUpperCase() }}</span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl font-bold text-white">{{ league.name }}</h1>
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="league.sport_type === 'baseball'
                  ? 'bg-orange-500/10 text-orange-400'
                  : 'bg-emerald-500/10 text-emerald-400'"
              >
                {{ league.sport_type === 'baseball' ? 'Baseball' : 'Softball' }}
              </span>
            </div>
            <p v-if="league.description" class="text-gray-500 text-sm mt-0.5">{{ league.description }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="bg-navy-900 border border-navy-700 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span class="text-gray-500 text-sm">Temporadas</span>
            </div>
            <div class="text-xl font-bold text-white">{{ league.seasons?.length || 0 }}</div>
          </div>
          <div class="bg-navy-900 border border-navy-700 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="text-gray-500 text-sm">Activas</span>
            </div>
            <div class="text-xl font-bold text-white">{{ activeSeasons }}</div>
          </div>
          <div class="bg-navy-900 border border-navy-700 rounded-lg p-4">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
                <svg class="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <span class="text-gray-500 text-sm">Categorias</span>
            </div>
            <div class="text-xl font-bold text-white">{{ totalCategories }}</div>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-white">Temporadas</h2>
          <button @click="openCreateSeason" class="btn-primary flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Temporada
          </button>
        </div>

        <div v-if="!league.seasons || league.seasons.length === 0" class="text-center py-8">
          <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-white font-semibold mb-2">No hay temporadas</h3>
          <p class="text-gray-500 text-sm mb-4">Crea tu primera temporada para comenzar a organizar las categorias y equipos.</p>
          <button @click="openCreateSeason" class="btn-primary text-sm">Crear Primera Temporada</button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="season in league.seasons"
            :key="season.id"
            class="bg-navy-900 border border-navy-700 rounded-lg p-4 hover:border-navy-500 transition-all duration-200 cursor-pointer group"
            @click="goToSeason(season.id)"
          >
            <div class="flex items-center justify-between">
              <div class="min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-white font-medium">{{ season.name }}</h3>
                  <span
                    class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                    :class="season.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
                  >
                    {{ season.is_active ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-500">
                  <span>{{ formatDate(season.start_date) }} - {{ formatDate(season.end_date) }}</span>
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    {{ season.categories?.length || 0 }} categorias
                  </span>
                </div>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  @click.stop="openEditSeason(season)"
                  class="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <svg class="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <SeasonFormModal
      v-if="showSeasonModal"
      :season="editingSeason"
      :loading="seasonLoading"
      :error="seasonError"
      @save="handleSaveSeason"
      @close="showSeasonModal = false"
    />
  </div>
</template>
