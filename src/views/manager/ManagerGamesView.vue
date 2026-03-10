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
    ])
    if (store.currentTeam) {
      managerTeamCtx.setContext({ teamId: teamId.value, teamName: store.currentTeam.name })
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar juegos'
  }
})

const team = computed(() => store.currentTeam)

const gamesByMatchday = computed(() => {
  const groups: Record<number, { games: typeof store.games; name: string | null }> = {}
  for (const game of store.games) {
    if (!groups[game.matchday]) groups[game.matchday] = { games: [], name: null }
    groups[game.matchday].games.push(game)
    if (game.matchday_name) groups[game.matchday].name = game.matchday_name
  }
  return Object.entries(groups)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([matchday, data]) => ({ matchday: Number(matchday), games: data.games, name: data.name }))
})

function matchdayLabel(md: { matchday: number; name: string | null }): string {
  return md.name ? `Jornada ${md.matchday} -- ${md.name}` : `Jornada ${md.matchday}`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin fecha'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric' })
}

const statusLabel: Record<string, string> = {
  scheduled: 'Programado',
  in_progress: 'En Curso',
  completed: 'Completado',
  cancelled: 'Cancelado',
  forfeit: 'Forfeit',
}

const statusClass: Record<string, string> = {
  scheduled: 'bg-blue-400/10 text-blue-400',
  in_progress: 'bg-gold-400/10 text-gold-400',
  completed: 'bg-green-400/10 text-green-400',
  cancelled: 'bg-gray-500/10 text-gray-500',
  forfeit: 'bg-red-400/10 text-red-400',
}
</script>

<template>
  <div>
    <div class="mb-6">
      <button @click="router.push({ name: 'manager-team-dashboard', params: { teamId } })" class="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-3 transition-colors">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {{ team?.name || 'Equipo' }}
      </button>
      <h1 class="text-2xl font-bold text-white">Juegos</h1>
      <p class="text-gray-500 text-sm mt-1">{{ store.games.length }} juegos programados</p>
    </div>

    <div v-if="store.gamesLoading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="card p-4 animate-pulse">
        <div class="h-5 bg-navy-700 rounded w-1/4 mb-3"></div>
        <div class="h-4 bg-navy-700 rounded w-2/3"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-6 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="store.games.length === 0" class="card p-8 text-center">
      <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">No hay juegos</h3>
      <p class="text-gray-500 text-sm">Aun no se han programado juegos para tu equipo.</p>
    </div>

    <div v-else class="space-y-6">
      <div v-for="group in gamesByMatchday" :key="group.matchday">
        <h3 class="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">{{ matchdayLabel(group) }}</h3>
        <div class="space-y-2">
          <div
            v-for="game in group.games"
            :key="game.id"
            class="card p-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-white font-medium text-sm" :class="{ 'text-blue-400': game.home_team_id === teamId }">
                    {{ game.home_team_name }}
                  </span>
                  <span class="text-gray-600 text-xs">vs</span>
                  <span class="text-white font-medium text-sm" :class="{ 'text-blue-400': game.away_team_id === teamId }">
                    {{ game.away_team_name }}
                  </span>
                </div>
                <p class="text-gray-500 text-xs">{{ formatDate(game.game_date) }} {{ game.game_time ? '- ' + game.game_time : '' }}</p>
                <p v-if="game.location" class="text-gray-600 text-xs mt-0.5">{{ game.location }}</p>
              </div>
              <div class="text-right flex-shrink-0 ml-4">
                <div v-if="game.status === 'completed' || game.status === 'forfeit'" class="text-white font-bold text-lg">
                  {{ game.home_score }} - {{ game.away_score }}
                </div>
                <span class="text-xs font-medium px-2 py-0.5 rounded-full" :class="statusClass[game.status]">
                  {{ statusLabel[game.status] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
