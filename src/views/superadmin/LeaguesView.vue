<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useLeaguesStore } from '@/stores/leagues'
import { leagueService, type CreateLeaguePayload, type UpdateLeaguePayload, type League } from '@/services/leagueService'
import LeagueFormModal from '@/components/leagues/LeagueFormModal.vue'

const router = useRouter()
const store = useLeaguesStore()
const showModal = ref(false)
const editingLeague = ref<League | null>(null)
const actionLoading = ref(false)
const actionError = ref<string | null>(null)

const totalLeagues = computed(() => store.leagues.length)
const activeLeagues = computed(() => store.leagues.filter(l => l.is_active).length)
const leaguesWithoutAdmin = computed(() => store.leagues.filter(l => !l.admin).length)

onMounted(() => {
  store.fetchLeagues()
})

function openCreateModal() {
  editingLeague.value = null
  actionError.value = null
  showModal.value = true
}

function openEditModal(league: League) {
  editingLeague.value = league
  actionError.value = null
  showModal.value = true
}

async function handleSave(payload: { name: string; description?: string; is_active?: boolean; sport_type?: 'baseball' | 'softball'; logoFile?: File | null; removeLogo?: boolean }) {
  actionLoading.value = true
  actionError.value = null
  try {
    const { logoFile, removeLogo, sport_type: _st, ...fields } = payload
    let leagueId: string

    if (editingLeague.value) {
      const updated = await leagueService.update(editingLeague.value.id, fields as UpdateLeaguePayload)
      leagueId = updated.id
    } else {
      const created = await leagueService.create({ ...fields, sport_type: payload.sport_type } as CreateLeaguePayload)
      leagueId = created.id
    }

    if (logoFile) {
      await leagueService.uploadLeagueLogo(leagueId, logoFile)
    } else if (removeLogo) {
      await leagueService.removeLeagueLogo(leagueId)
    }

    showModal.value = false
    editingLeague.value = null
    await store.fetchLeagues()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    actionError.value = e.response?.data?.error || 'Error al guardar la liga'
  } finally {
    actionLoading.value = false
  }
}

function goToDetail(id: string) {
  router.push({ name: 'league-detail', params: { id } })
}
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-white">Gestion de Ligas</h1>
        <p class="text-gray-500 text-sm mt-1">Administra todas las ligas del sistema</p>
      </div>
      <button @click="openCreateModal" class="btn-primary flex items-center gap-2 self-start">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva Liga
      </button>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      <div class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div class="text-2xl font-bold text-white mb-1">{{ totalLeagues }}</div>
        <div class="text-gray-500 text-sm">Total Ligas</div>
      </div>
      <div class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="text-2xl font-bold text-white mb-1">{{ activeLeagues }}</div>
        <div class="text-gray-500 text-sm">Ligas Activas</div>
      </div>
      <div class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div class="text-2xl font-bold text-white mb-1">{{ leaguesWithoutAdmin }}</div>
        <div class="text-gray-500 text-sm">Sin Admin Asignado</div>
      </div>
    </div>

    <div v-if="store.isLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card p-5 animate-pulse">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-navy-700"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-navy-700 rounded w-1/3"></div>
            <div class="h-3 bg-navy-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="store.leagues.length === 0" class="card p-12 text-center">
      <div class="w-16 h-16 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">No hay ligas creadas</h3>
      <p class="text-gray-500 text-sm mb-6">Comienza creando tu primera liga para organizar temporadas y categorias.</p>
      <button @click="openCreateModal" class="btn-primary">Crear Primera Liga</button>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="league in store.leagues"
        :key="league.id"
        class="card p-5 hover:border-navy-500 transition-all duration-200 cursor-pointer group"
        @click="goToDetail(league.id)"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4 min-w-0">
            <div v-if="league.logo_url" class="w-12 h-12 rounded-xl overflow-hidden bg-navy-700 flex-shrink-0">
              <img :src="league.logo_url" :alt="league.name" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-12 h-12 rounded-xl bg-cardinal-600/20 flex items-center justify-center flex-shrink-0">
              <span class="text-cardinal-400 font-bold text-lg">{{ league.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-white font-semibold truncate">{{ league.name }}</h3>
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  :class="league.sport_type === 'baseball'
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'bg-emerald-500/10 text-emerald-400'"
                >
                  {{ league.sport_type === 'baseball' ? 'Baseball' : 'Softball' }}
                </span>
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  :class="league.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
                >
                  {{ league.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {{ league.admin ? league.admin.full_name : 'Sin admin' }}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {{ league.active_seasons_count }} temporada{{ league.active_seasons_count !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              @click.stop="openEditModal(league)"
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

    <LeagueFormModal
      v-if="showModal"
      :league="editingLeague"
      :loading="actionLoading"
      :error="actionError"
      @save="handleSave"
      @close="showModal = false"
    />
  </div>
</template>
