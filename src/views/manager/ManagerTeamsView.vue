<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useManagerStore } from '@/stores/manager'
import { useManagerTeamContextStore } from '@/stores/managerTeamContext'

const router = useRouter()
const store = useManagerStore()
const managerTeamCtx = useManagerTeamContextStore()
const error = ref<string | null>(null)

onMounted(async () => {
  managerTeamCtx.clear()
  try {
    await store.fetchTeams()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar equipos'
  }
})

const groupedTeams = computed(() => {
  const groups: Record<string, { league_name: string; league_logo_url: string; seasons: Record<string, { season_name: string; categories: Record<string, { category_name: string; teams: typeof store.teams }> }> }> = {}

  for (const team of store.teams) {
    if (!groups[team.league_id]) {
      groups[team.league_id] = { league_name: team.league_name, league_logo_url: team.league_logo_url, seasons: {} }
    }
    if (!groups[team.league_id].seasons[team.season_id]) {
      groups[team.league_id].seasons[team.season_id] = { season_name: team.season_name, categories: {} }
    }
    if (!groups[team.league_id].seasons[team.season_id].categories[team.category_id]) {
      groups[team.league_id].seasons[team.season_id].categories[team.category_id] = { category_name: team.category_name, teams: [] }
    }
    groups[team.league_id].seasons[team.season_id].categories[team.category_id].teams.push(team)
  }

  return groups
})

function goToTeam(teamId: string) {
  router.push({ name: 'manager-team-dashboard', params: { teamId } })
}
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-white">Mis Equipos</h1>
      <p class="text-gray-500 text-sm mt-1">Selecciona un equipo para ver su informacion.</p>
    </div>

    <div v-if="store.teamsLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card p-5 animate-pulse">
        <div class="h-5 bg-navy-700 rounded w-1/4 mb-3"></div>
        <div class="h-4 bg-navy-700 rounded w-1/3"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-6 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="store.teams.length === 0" class="card p-8 text-center">
      <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin equipos asignados</h3>
      <p class="text-gray-500 text-sm">Aun no tienes equipos asignados. Contacta al administrador de la liga.</p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="(league, leagueId) in groupedTeams" :key="leagueId">
        <div class="flex items-center gap-3 mb-4">
          <div v-if="league.league_logo_url" class="w-8 h-8 rounded-lg overflow-hidden bg-navy-700 flex-shrink-0">
            <img :src="league.league_logo_url" :alt="league.league_name" class="w-full h-full object-cover" />
          </div>
          <div v-else class="w-8 h-8 rounded-lg bg-cardinal-600/20 flex items-center justify-center flex-shrink-0">
            <span class="text-cardinal-400 text-sm font-bold">{{ league.league_name.charAt(0) }}</span>
          </div>
          <h2 class="text-lg font-semibold text-white">{{ league.league_name }}</h2>
        </div>

        <div v-for="(season, seasonId) in league.seasons" :key="seasonId" class="mb-4">
          <p class="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3 pl-1">{{ season.season_name }}</p>

          <div v-for="(category, catId) in season.categories" :key="catId" class="mb-3">
            <p class="text-gold-400 text-xs font-medium mb-2 pl-1">{{ category.category_name }}</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="team in category.teams"
                :key="team.id"
                class="card p-4 hover:border-navy-500 transition-all duration-200 cursor-pointer group"
                @click="goToTeam(team.id)"
              >
                <div class="flex items-center gap-3 mb-3">
                  <div
                    v-if="team.logo_url"
                    class="w-12 h-12 rounded-lg overflow-hidden bg-navy-700 flex-shrink-0"
                  >
                    <img :src="team.logo_url" :alt="team.name" class="w-full h-full object-cover" />
                  </div>
                  <div
                    v-else
                    class="w-12 h-12 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0"
                  >
                    <span class="text-blue-400 text-lg font-bold">{{ team.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div class="min-w-0">
                    <h3 class="text-white font-semibold truncate group-hover:text-blue-400 transition-colors">{{ team.name }}</h3>
                    <p class="text-gray-500 text-xs">{{ team.players_count }} jugador{{ team.players_count === 1 ? '' : 'es' }}</p>
                  </div>
                </div>
                <div class="flex items-center justify-end">
                  <svg class="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
