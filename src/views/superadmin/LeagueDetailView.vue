<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLeaguesStore } from '@/stores/leagues'
import { leagueService, type UpdateLeaguePayload, type AssignAdminPayload } from '@/services/leagueService'
import LeagueFormModal from '@/components/leagues/LeagueFormModal.vue'
import AssignAdminModal from '@/components/leagues/AssignAdminModal.vue'
import BaseButton from '@/components/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const store = useLeaguesStore()

const showEditModal = ref(false)
const showAdminModal = ref(false)
const editLoading = ref(false)
const editError = ref<string | null>(null)
const adminLoading = ref(false)
const adminError = ref<string | null>(null)
const removeAdminLoading = ref(false)

const leagueId = computed(() => route.params.id as string)

onMounted(() => {
  store.fetchLeague(leagueId.value)
})

async function handleEditSave(payload: UpdateLeaguePayload & { logoFile?: File | null; removeLogo?: boolean }) {
  editLoading.value = true
  editError.value = null
  try {
    const { logoFile, removeLogo, ...fields } = payload
    await leagueService.update(leagueId.value, fields)
    if (logoFile) {
      await leagueService.uploadLeagueLogo(leagueId.value, logoFile)
    } else if (removeLogo) {
      await leagueService.removeLeagueLogo(leagueId.value)
    }
    showEditModal.value = false
    await store.fetchLeague(leagueId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    editError.value = e.response?.data?.error || 'Error al guardar'
  } finally {
    editLoading.value = false
  }
}

async function handleAssignAdmin(payload: AssignAdminPayload) {
  adminLoading.value = true
  adminError.value = null
  try {
    await leagueService.assignAdmin(leagueId.value, payload)
    showAdminModal.value = false
    await store.fetchLeague(leagueId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    adminError.value = e.response?.data?.error || 'Error al asignar admin'
  } finally {
    adminLoading.value = false
  }
}

async function handleRemoveAdmin() {
  removeAdminLoading.value = true
  try {
    await leagueService.removeAdmin(leagueId.value)
    await store.fetchLeague(leagueId.value)
  } catch {
  } finally {
    removeAdminLoading.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
</script>

<template>
  <div>
    <button
      @click="router.push({ name: 'leagues' })"
      class="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver a Ligas
    </button>

    <div v-if="store.isLoading" class="space-y-6">
      <div class="card p-6 animate-pulse">
        <div class="h-6 bg-navy-700 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-navy-700 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else-if="!store.currentLeague" class="card p-12 text-center">
      <p class="text-gray-500">Liga no encontrada</p>
    </div>

    <div v-else class="space-y-6">
      <div class="card p-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div class="flex items-center gap-4">
            <div v-if="store.currentLeague.logo_url" class="w-14 h-14 rounded-xl overflow-hidden bg-navy-700 flex-shrink-0">
              <img :src="store.currentLeague.logo_url" :alt="store.currentLeague.name" class="w-full h-full object-cover" />
            </div>
            <div v-else class="w-14 h-14 rounded-xl bg-cardinal-600/20 flex items-center justify-center flex-shrink-0">
              <span class="text-cardinal-400 font-bold text-2xl">{{ store.currentLeague.name.charAt(0).toUpperCase() }}</span>
            </div>
            <div>
              <div class="flex items-center gap-3 mb-1">
                <h1 class="text-2xl font-bold text-white">{{ store.currentLeague.name }}</h1>
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  :class="store.currentLeague.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
                >
                  {{ store.currentLeague.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
              <p v-if="store.currentLeague.description" class="text-gray-500 text-sm">{{ store.currentLeague.description }}</p>
              <p class="text-gray-600 text-xs mt-1">Creada el {{ formatDate(store.currentLeague.created_at) }}</p>
            </div>
          </div>
          <button @click="showEditModal = true" class="btn-secondary text-sm self-start">
            Editar Liga
          </button>
        </div>
      </div>

      <div class="card p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Administrador de la Liga</h2>

        <div v-if="store.currentLeague.admin" class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold text-sm flex-shrink-0">
              {{ store.currentLeague.admin.full_name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <div class="text-white font-medium">{{ store.currentLeague.admin.full_name }}</div>
              <div class="text-gray-500 text-sm">{{ store.currentLeague.admin.email }}</div>
            </div>
          </div>
          <BaseButton
            variant="ghost"
            :loading="removeAdminLoading"
            class="text-red-400 hover:text-red-300 hover:bg-red-900/20 text-sm self-start"
            @click="handleRemoveAdmin"
          >
            Remover Admin
          </BaseButton>
        </div>

        <div v-else class="text-center py-6">
          <div class="w-12 h-12 rounded-full bg-navy-700 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p class="text-gray-500 text-sm mb-4">Esta liga no tiene un administrador asignado</p>
          <button @click="showAdminModal = true" class="btn-primary text-sm">
            Asignar Administrador
          </button>
        </div>
      </div>

      <div class="card p-6">
        <h2 class="text-lg font-semibold text-white mb-4">Temporadas</h2>

        <div v-if="!store.currentLeague.seasons || store.currentLeague.seasons.length === 0" class="text-center py-6">
          <p class="text-gray-500 text-sm">No hay temporadas creadas en esta liga.</p>
          <p class="text-gray-600 text-xs mt-1">El administrador de la liga puede crear temporadas desde su panel.</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="season in store.currentLeague.seasons"
            :key="season.id"
            class="bg-navy-900 border border-navy-700 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <h3 class="text-white font-medium">{{ season.name }}</h3>
                <span
                  class="text-xs font-medium px-2 py-0.5 rounded-full"
                  :class="season.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
                >
                  {{ season.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
              <div class="text-gray-500 text-xs">
                <span v-if="season.start_date">{{ formatDate(season.start_date) }}</span>
                <span v-if="season.start_date && season.end_date"> - </span>
                <span v-if="season.end_date">{{ formatDate(season.end_date) }}</span>
              </div>
            </div>

            <div v-if="season.categories && season.categories.length > 0" class="flex flex-wrap gap-2">
              <span
                v-for="cat in season.categories"
                :key="cat.id"
                class="text-xs px-2.5 py-1 rounded-lg"
                :class="cat.is_active ? 'bg-navy-700 text-gray-300' : 'bg-navy-800 text-gray-600'"
              >
                {{ cat.name }}
              </span>
            </div>
            <p v-else class="text-gray-600 text-xs">Sin categorias</p>
          </div>
        </div>
      </div>
    </div>

    <LeagueFormModal
      v-if="showEditModal"
      :league="store.currentLeague"
      :loading="editLoading"
      :error="editError"
      @save="handleEditSave"
      @close="showEditModal = false"
    />

    <AssignAdminModal
      v-if="showAdminModal"
      :loading="adminLoading"
      :error="adminError"
      @save="handleAssignAdmin"
      @close="showAdminModal = false"
    />
  </div>
</template>
