<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCategoryContextStore } from '@/stores/categoryContext'
import { useManagerTeamContextStore } from '@/stores/managerTeamContext'
import { useMyLeagueStore } from '@/stores/myLeague'
import { useManagerStore } from '@/stores/manager'

const router = useRouter()
const auth = useAuthStore()
const categoryCtx = useCategoryContextStore()
const managerTeamCtx = useManagerTeamContextStore()
const myLeagueStore = useMyLeagueStore()
const managerStore = useManagerStore()
const sidebarOpen = ref(false)
const isLoggingOut = ref(false)

const sidebarLeagueName = computed(() => {
  if (auth.isAdmin && myLeagueStore.league) return myLeagueStore.league.name
  if (auth.isManager && managerStore.teams.length > 0) return managerStore.teams[0].league_name
  return 'Liga de Softball'
})

const sidebarLeagueLogo = computed(() => {
  if (auth.isAdmin && myLeagueStore.league) return myLeagueStore.league.logo_url || ''
  if (auth.isManager && managerStore.teams.length > 0) return managerStore.teams[0].league_logo_url || ''
  return ''
})

onMounted(() => {
  if (auth.isAdmin) myLeagueStore.fetchIfNeeded()
  if (auth.isManager) managerStore.fetchTeams()
})

const roleBadgeClass: Record<string, string> = {
  super_admin: 'bg-cardinal-600 text-white',
  admin: 'bg-gold-500 text-navy-950',
  manager: 'bg-blue-500 text-white',
  player: 'bg-navy-600 text-gray-300',
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  player: 'Jugador',
}

async function handleLogout() {
  isLoggingOut.value = true
  try {
    await auth.logout()
    router.push('/login')
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <div class="h-screen overflow-hidden bg-navy-950 flex">
    <aside
      class="fixed inset-y-0 left-0 z-50 w-64 bg-navy-900 border-r border-navy-700 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex flex-col h-full">
        <div class="flex items-center gap-3 px-6 py-5 border-b border-navy-700">
          <div v-if="sidebarLeagueLogo" class="w-9 h-9 rounded-xl overflow-hidden bg-navy-700 flex-shrink-0">
            <img :src="sidebarLeagueLogo" :alt="sidebarLeagueName" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-9 h-9 rounded-xl bg-cardinal-600 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div>
            <div class="text-white font-bold text-sm leading-tight">{{ sidebarLeagueName }}</div>
            <div class="text-gray-500 text-xs">Sistema de Administracion</div>
          </div>
        </div>

        <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <RouterLink
            to="/"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
            active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Panel de Control
          </RouterLink>

          <template v-if="auth.isSuperAdmin">
            <div class="px-3 pt-4 pb-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Super Admin</span>
            </div>
            <RouterLink
              to="/leagues"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
              active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Gestion de Ligas
            </RouterLink>
          </template>

          <template v-if="auth.isAdmin">
            <div class="px-3 pt-4 pb-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Administracion</span>
            </div>
            <RouterLink
              to="/my-league"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
              active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Mi Liga
            </RouterLink>

            <template v-if="categoryCtx.isActive">
              <div class="px-3 pt-4 pb-1"></div>

              <RouterLink
                :to="{ name: 'admin-category-overview', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Resumen
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-teams', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Equipos
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-games', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Juegos
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-calendar', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
                Calendario
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-standings', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Posiciones
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-stats', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Captura Metricas
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-player-stats', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Metricas Jugadores
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-leaders', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Lideres
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-playoffs', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Playoffs
              </RouterLink>

              <RouterLink
                :to="{ name: 'admin-category-payments', params: { seasonId: categoryCtx.seasonId, categoryId: categoryCtx.categoryId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Pagos
              </RouterLink>
            </template>
          </template>

          <template v-if="auth.isManager">
            <div class="px-3 pt-4 pb-2">
              <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Manager</span>
            </div>
            <RouterLink
              to="/my-teams"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
              active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Mis Equipos
            </RouterLink>

            <template v-if="managerTeamCtx.isActive">
              <div class="px-3 pt-4 pb-1">
                <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider truncate block">{{ managerTeamCtx.teamName }}</span>
              </div>

              <RouterLink
                :to="{ name: 'manager-team-dashboard', params: { teamId: managerTeamCtx.teamId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Dashboard
              </RouterLink>

              <RouterLink
                :to="{ name: 'manager-team-games', params: { teamId: managerTeamCtx.teamId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Juegos
              </RouterLink>

              <RouterLink
                :to="{ name: 'manager-team-standings', params: { teamId: managerTeamCtx.teamId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Posiciones
              </RouterLink>

              <RouterLink
                :to="{ name: 'manager-team-stats', params: { teamId: managerTeamCtx.teamId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Estadisticas
              </RouterLink>

              <RouterLink
                :to="{ name: 'manager-team-roster', params: { teamId: managerTeamCtx.teamId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Roster
              </RouterLink>

              <RouterLink
                :to="{ name: 'manager-team-payments', params: { teamId: managerTeamCtx.teamId } }"
                class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-gray-400 hover:text-white hover:bg-navy-700"
                active-class="!text-white !bg-navy-700 !border-l-2 !border-cardinal-500"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Pagos
              </RouterLink>
            </template>
          </template>
        </nav>

        <div class="px-3 py-4 border-t border-navy-700">
          <div class="flex items-center gap-3 px-3 py-3 rounded-lg bg-navy-800 mb-2">
            <div class="w-8 h-8 rounded-full bg-cardinal-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {{ auth.user?.full_name?.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-white text-sm font-medium truncate">{{ auth.user?.full_name }}</div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span
                  class="text-xs font-semibold px-1.5 py-0.5 rounded"
                  :class="roleBadgeClass[auth.user?.role || 'player']"
                >
                  {{ roleLabel[auth.user?.role || 'player'] }}
                </span>
              </div>
            </div>
          </div>
          <button
            @click="handleLogout"
            :disabled="isLoggingOut"
            class="w-full btn-ghost text-sm text-left flex items-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-red-400"
          >
            <svg v-if="isLoggingOut" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {{ isLoggingOut ? 'Cerrando sesion...' : 'Cerrar Sesion' }}
          </button>
        </div>
      </div>
    </aside>

    <div v-if="sidebarOpen" @click="sidebarOpen = false" class="fixed inset-0 z-40 bg-black/60 lg:hidden"></div>

    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <header class="bg-navy-900 border-b border-navy-700 px-6 py-4 flex items-center gap-4 lg:hidden">
        <button @click="sidebarOpen = true" class="text-gray-400 hover:text-white">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <img v-if="sidebarLeagueLogo" :src="sidebarLeagueLogo" :alt="sidebarLeagueName" class="w-7 h-7 rounded-lg object-cover" />
        <span class="text-white font-semibold">{{ sidebarLeagueName }}</span>
      </header>

      <main class="flex-1 overflow-y-auto p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>
