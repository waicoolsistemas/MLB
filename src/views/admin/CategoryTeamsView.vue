<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import { useRouter } from 'vue-router'
import { leagueService, type Team, type ManagerCredentials } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import TeamFormModal from '@/components/teams/TeamFormModal.vue'
import ManagerCredentialsModal from '@/components/teams/ManagerCredentialsModal.vue'

const router = useRouter()
const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!
const seasonId = inject<ComputedRef<string>>('seasonId')!

const error = ref<string | null>(null)

const showTeamModal = ref(false)
const editingTeam = ref<Team | null>(null)
const teamLoading = ref(false)
const teamError = ref<string | null>(null)

const showCredentialsModal = ref(false)
const credentials = ref<ManagerCredentials | null>(null)
const resetLoading = ref<string | null>(null)

onMounted(async () => {
  error.value = null
  try {
    await store.fetchTeamsIfNeeded(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar equipos'
  }
})

function openCreateTeam() {
  editingTeam.value = null
  teamError.value = null
  showTeamModal.value = true
}

function openEditTeam(team: Team) {
  editingTeam.value = team
  teamError.value = null
  showTeamModal.value = true
}

function goToTeamPlayers(team: Team) {
  router.push({
    name: 'admin-team-players',
    params: { seasonId: seasonId.value, categoryId: categoryId.value, teamId: team.id },
  })
}

async function handleSaveTeam(payload: { name: string; logo_url?: string; manager_name?: string; manager_phone?: string; manager_email?: string; is_active?: boolean }) {
  teamLoading.value = true
  teamError.value = null
  try {
    if (editingTeam.value) {
      await leagueService.updateTeam(editingTeam.value.id, payload)
    } else {
      const result = await leagueService.createTeam(categoryId.value, payload)
      if (result.manager_credentials) {
        credentials.value = result.manager_credentials
        showCredentialsModal.value = true
      }
    }
    showTeamModal.value = false
    editingTeam.value = null
    await store.refreshTeams(categoryId.value)
    store.invalidatePayments()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    teamError.value = e.response?.data?.error || 'Error al guardar equipo'
  } finally {
    teamLoading.value = false
  }
}

async function handleResetPassword(team: Team) {
  if (!team.manager_user_id) return
  resetLoading.value = team.id
  try {
    credentials.value = await leagueService.resetManagerPassword(team.id)
    showCredentialsModal.value = true
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al regenerar contrasena'
  } finally {
    resetLoading.value = null
  }
}

const activeCount = computed(() => store.teams.filter(t => t.is_active).length)
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">Equipos</h2>
        <p class="text-gray-500 text-xs mt-0.5">{{ store.teams.length }} equipos ({{ activeCount }} activos)</p>
      </div>
      <button @click="openCreateTeam" class="btn-primary flex items-center gap-2 text-sm">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Equipo
      </button>
    </div>

    <div v-if="store.teamsLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="bg-navy-900 border border-navy-700 rounded-lg p-4 animate-pulse">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-navy-700"></div>
          <div class="flex-1">
            <div class="h-4 bg-navy-700 rounded w-1/3 mb-2"></div>
            <div class="h-3 bg-navy-700 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="store.teams.length === 0" class="text-center py-8">
      <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">No hay equipos</h3>
      <p class="text-gray-500 text-sm mb-4">Agrega equipos a esta categoria para comenzar.</p>
      <button @click="openCreateTeam" class="btn-primary text-sm">Crear Primer Equipo</button>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="team in store.teams"
        :key="team.id"
        class="bg-navy-900 border border-navy-700 rounded-lg p-4 hover:border-navy-500 transition-all duration-200 group cursor-pointer"
        @click="goToTeamPlayers(team)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div
              v-if="team.logo_url"
              class="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-navy-700"
            >
              <img :src="team.logo_url" :alt="team.name" class="w-full h-full object-cover" />
            </div>
            <div
              v-else
              class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              :class="team.is_active ? 'bg-blue-400/10' : 'bg-gray-500/10'"
            >
              <span
                class="text-sm font-bold"
                :class="team.is_active ? 'text-blue-400' : 'text-gray-500'"
              >
                {{ team.name.charAt(0).toUpperCase() }}
              </span>
            </div>
            <span
              class="text-xs font-medium px-1.5 py-0.5 rounded-full"
              :class="team.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
            >
              {{ team.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="team.manager_user_id"
              @click.stop="handleResetPassword(team)"
              class="p-1.5 rounded-lg text-gray-500 hover:text-gold-400 hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100"
              :class="{ 'opacity-100 animate-spin': resetLoading === team.id }"
              title="Regenerar contrasena del manager"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>
            <button
              @click.stop="openEditTeam(team)"
              class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
        <h3 class="text-white font-medium mb-1">{{ team.name }}</h3>
        <div class="space-y-1">
          <p v-if="team.manager_name" class="text-gray-500 text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {{ team.manager_name }}
          </p>
          <p v-if="team.manager_phone" class="text-gray-500 text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {{ team.manager_phone }}
          </p>
          <p v-if="team.manager_email" class="text-gray-500 text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {{ team.manager_email }}
          </p>
          <p class="text-gray-500 text-xs flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {{ team.players_count || 0 }} jugador{{ (team.players_count || 0) === 1 ? '' : 'es' }}
          </p>
        </div>
      </div>
    </div>

    <TeamFormModal
      v-if="showTeamModal"
      :team="editingTeam"
      :loading="teamLoading"
      :error="teamError"
      @save="handleSaveTeam"
      @close="showTeamModal = false"
    />

    <ManagerCredentialsModal
      v-if="showCredentialsModal && credentials"
      :email="credentials.email"
      :password="credentials.password"
      @close="showCredentialsModal = false; credentials = null"
    />
  </div>
</template>
