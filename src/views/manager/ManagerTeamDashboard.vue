<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useManagerStore } from '@/stores/manager'
import { useManagerTeamContextStore } from '@/stores/managerTeamContext'

const route = useRoute()
const router = useRouter()
const store = useManagerStore()
const managerTeamCtx = useManagerTeamContextStore()
const error = ref<string | null>(null)
const teamId = computed(() => route.params.teamId as string)

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchTeamDetail(teamId.value),
      store.fetchGamesIfNeeded(teamId.value),
      store.fetchStandingsIfNeeded(teamId.value),
    ])
    if (store.currentTeam) {
      managerTeamCtx.setContext({ teamId: teamId.value, teamName: store.currentTeam.name })
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar datos'
  }
})

const team = computed(() => store.currentTeam)

const nextGame = computed(() => {
  const upcoming = store.games
    .filter(g => g.status === 'scheduled' && g.game_date)
    .sort((a, b) => (a.game_date || '').localeCompare(b.game_date || ''))
  return upcoming[0] || null
})

const myStanding = computed(() => {
  return store.standings.find(s => s.team_id === teamId.value)
})

const myPosition = computed(() => {
  const idx = store.standings.findIndex(s => s.team_id === teamId.value)
  return idx >= 0 ? idx + 1 : null
})

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin fecha'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })
}

function navigate(name: string) {
  router.push({ name, params: { teamId: teamId.value } })
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button @click="router.push({ name: 'manager-teams' })" class="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-3 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Mis Equipos
      </button>

      <div v-if="store.currentTeamLoading" class="animate-pulse">
        <div class="h-7 bg-navy-700 rounded w-1/3 mb-2"></div>
        <div class="h-4 bg-navy-700 rounded w-1/4"></div>
      </div>
      <div v-else-if="team" class="flex items-center gap-4">
        <div v-if="team.logo_url" class="w-14 h-14 rounded-xl overflow-hidden bg-navy-700 flex-shrink-0">
          <img :src="team.logo_url" :alt="team.name" class="w-full h-full object-cover" />
        </div>
        <div v-else class="w-14 h-14 rounded-xl bg-blue-400/10 flex items-center justify-center flex-shrink-0">
          <span class="text-blue-400 text-xl font-bold">{{ team.name.charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <h1 class="text-2xl font-bold text-white">{{ team.name }}</h1>
          <p class="text-gray-500 text-sm">{{ team.category_name }} -- {{ team.season_name }}</p>
        </div>
      </div>
    </div>

    <div v-if="error" class="card p-6 text-center mb-6">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
      <div class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-green-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div class="text-2xl font-bold text-white">{{ myStanding?.wins ?? 0 }}-{{ myStanding?.losses ?? 0 }}</div>
        <div class="text-gray-500 text-sm">Record (G-P)</div>
      </div>

      <div class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div class="text-2xl font-bold text-white">{{ myPosition ? `#${myPosition}` : '--' }}</div>
        <div class="text-gray-500 text-sm">Posicion en tabla</div>
      </div>

      <div class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div class="text-2xl font-bold text-white">{{ myStanding?.games_played ?? 0 }}</div>
        <div class="text-gray-500 text-sm">Juegos jugados</div>
      </div>

      <div class="card p-5">
        <div class="flex items-start justify-between mb-3">
          <div class="w-10 h-10 rounded-xl bg-cardinal-400/10 flex items-center justify-center">
            <svg class="w-5 h-5 text-cardinal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div class="text-2xl font-bold text-white" :class="{ 'text-green-400': (myStanding?.run_diff ?? 0) > 0, 'text-red-400': (myStanding?.run_diff ?? 0) < 0 }">
          {{ (myStanding?.run_diff ?? 0) > 0 ? '+' : '' }}{{ myStanding?.run_diff ?? 0 }}
        </div>
        <div class="text-gray-500 text-sm">Diferencial de carreras</div>
      </div>
    </div>

    <div v-if="nextGame" class="card p-5 mb-6">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Proximo Juego</h3>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-white font-semibold">{{ nextGame.home_team_name }} vs {{ nextGame.away_team_name }}</p>
          <p class="text-gray-500 text-sm">{{ formatDate(nextGame.game_date) }} {{ nextGame.game_time ? '- ' + nextGame.game_time : '' }}</p>
          <p v-if="nextGame.location" class="text-gray-600 text-xs mt-0.5">{{ nextGame.location }}</p>
        </div>
        <span class="text-xs font-medium px-2 py-1 rounded-full bg-blue-400/10 text-blue-400">
          {{ nextGame.matchday_name ? `J${nextGame.matchday} - ${nextGame.matchday_name}` : `Jornada ${nextGame.matchday}` }}
        </span>
      </div>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <button @click="navigate('manager-team-games')" class="card p-4 hover:border-navy-500 transition-all duration-200 text-left group">
        <svg class="w-5 h-5 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-white text-sm font-medium group-hover:text-blue-400 transition-colors">Juegos</span>
      </button>
      <button @click="navigate('manager-team-standings')" class="card p-4 hover:border-navy-500 transition-all duration-200 text-left group">
        <svg class="w-5 h-5 text-green-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-white text-sm font-medium group-hover:text-green-400 transition-colors">Posiciones</span>
      </button>
      <button @click="navigate('manager-team-stats')" class="card p-4 hover:border-navy-500 transition-all duration-200 text-left group">
        <svg class="w-5 h-5 text-gold-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span class="text-white text-sm font-medium group-hover:text-gold-400 transition-colors">Estadisticas</span>
      </button>
      <button @click="navigate('manager-team-roster')" class="card p-4 hover:border-navy-500 transition-all duration-200 text-left group">
        <svg class="w-5 h-5 text-cardinal-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-white text-sm font-medium group-hover:text-cardinal-400 transition-colors">Roster</span>
      </button>
      <button @click="navigate('manager-team-payments')" class="card p-4 hover:border-navy-500 transition-all duration-200 text-left group">
        <svg class="w-5 h-5 text-teal-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span class="text-white text-sm font-medium group-hover:text-teal-400 transition-colors">Pagos</span>
      </button>
    </div>
  </div>
</template>
