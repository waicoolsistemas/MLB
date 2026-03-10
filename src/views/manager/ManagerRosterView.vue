<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useManagerStore } from '@/stores/manager'
import { useManagerTeamContextStore } from '@/stores/managerTeamContext'
import { leagueService, type Player, type PlayerParent } from '@/services/leagueService'
import PlayerFormModal from '@/components/players/PlayerFormModal.vue'
import PlayerViewModal from '@/components/players/PlayerViewModal.vue'

const route = useRoute()
const router = useRouter()
const store = useManagerStore()
const managerTeamCtx = useManagerTeamContextStore()
const error = ref<string | null>(null)
const teamId = computed(() => route.params.teamId as string)

const showPlayerModal = ref(false)
const editingPlayer = ref<Player | null>(null)
const playerLoading = ref(false)
const playerError = ref<string | null>(null)
const viewingPlayer = ref<Player | null>(null)

const playerParents = ref<PlayerParent[]>([])
const parentsLoading = ref(false)

const sportType = computed(() => store.currentTeam?.league_sport_type ?? 'softball')

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchTeamDetail(teamId.value),
      store.fetchRosterIfNeeded(teamId.value),
    ])
    if (store.currentTeam) {
      managerTeamCtx.setContext({ teamId: teamId.value, teamName: store.currentTeam.name })
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar roster'
  }
})

const team = computed(() => store.currentTeam)
const activePlayers = computed(() => store.roster.filter(p => p.is_active))
const inactivePlayers = computed(() => store.roster.filter(p => !p.is_active))

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

async function loadParents(playerId: string) {
  if (sportType.value !== 'baseball') return
  parentsLoading.value = true
  try {
    playerParents.value = await leagueService.listPlayerParents(playerId)
  } catch {
    playerParents.value = []
  } finally {
    parentsLoading.value = false
  }
}

function openCreatePlayer() {
  editingPlayer.value = null
  playerError.value = null
  playerParents.value = []
  showPlayerModal.value = true
}

function openEditPlayer(player: Player) {
  editingPlayer.value = player
  playerError.value = null
  playerParents.value = []
  loadParents(player.id).then(() => {
    showPlayerModal.value = true
  })
}

function openViewPlayer(player: Player) {
  viewingPlayer.value = player
  playerParents.value = []
  loadParents(player.id)
}

async function handleSavePlayer(payload: { full_name: string; curp?: string; birth_date?: string | null; phone?: string; is_active?: boolean; photoFile?: File | null; parents?: { id?: string; full_name: string; phone: string; address: string; _deleted?: boolean }[] }) {
  playerLoading.value = true
  playerError.value = null
  try {
    const { photoFile: pFile, parents: parentEntries, ...rest } = payload
    let savedPlayerId: string
    if (editingPlayer.value) {
      await store.updatePlayer(teamId.value, editingPlayer.value.id, rest, pFile)
      savedPlayerId = editingPlayer.value.id
    } else {
      await store.createPlayer(teamId.value, rest, pFile)
      const lastPlayer = store.roster[store.roster.length - 1]
      savedPlayerId = lastPlayer?.id ?? ''
    }
    if (sportType.value === 'baseball' && parentEntries && savedPlayerId) {
      for (const entry of parentEntries) {
        if (entry._deleted && entry.id) {
          await leagueService.deletePlayerParent(entry.id)
        } else if (entry.id && !entry._deleted) {
          await leagueService.updatePlayerParent(entry.id, {
            full_name: entry.full_name,
            phone: entry.phone,
            address: entry.address,
          })
        } else if (!entry.id && !entry._deleted && entry.full_name.trim()) {
          await leagueService.createPlayerParent(savedPlayerId, {
            full_name: entry.full_name,
            phone: entry.phone,
            address: entry.address,
          })
        }
      }
    }
    showPlayerModal.value = false
    editingPlayer.value = null
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    playerError.value = e.response?.data?.error || 'Error al guardar jugador'
  } finally {
    playerLoading.value = false
  }
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
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-white">Roster</h1>
          <p class="text-gray-500 text-sm mt-1">
            {{ activePlayers.length }} activo{{ activePlayers.length === 1 ? '' : 's' }}
            <span v-if="inactivePlayers.length > 0" class="text-gray-600">
              / {{ inactivePlayers.length }} inactivo{{ inactivePlayers.length === 1 ? '' : 's' }}
            </span>
          </p>
        </div>
        <button @click="openCreatePlayer" class="btn-primary flex items-center gap-2 text-sm">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Jugador
        </button>
      </div>
    </div>

    <div v-if="store.rosterLoading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card p-4 animate-pulse">
        <div class="h-5 bg-navy-700 rounded w-1/3"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-6 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <div v-else-if="store.roster.length === 0" class="card p-8 text-center">
      <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
        <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-white font-semibold mb-2">Sin jugadores</h3>
      <p class="text-gray-500 text-sm mb-4">No hay jugadores registrados en este equipo.</p>
      <button @click="openCreatePlayer" class="btn-primary text-sm">Agregar Primer Jugador</button>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="player in [...activePlayers, ...inactivePlayers]"
        :key="player.id"
        class="card px-4 py-3 flex items-center justify-between hover:border-navy-500 transition-all duration-200 group"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div
            v-if="player.photo_url"
            class="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0"
          >
            <img :src="player.photo_url" :alt="player.full_name" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            :class="player.is_active ? 'bg-blue-400/10' : 'bg-gray-500/10'"
          >
            <span
              class="text-sm font-bold"
              :class="player.is_active ? 'text-blue-400' : 'text-gray-500'"
            >
              {{ player.full_name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <button @click="openViewPlayer(player)" class="text-white text-sm font-medium truncate hover:text-blue-400 transition-colors text-left">{{ player.full_name }}</button>
              <span
                v-if="!player.is_active"
                class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-500/10 text-gray-500 flex-shrink-0"
              >
                Inactivo
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span v-if="player.curp">{{ player.curp }}</span>
              <span v-if="player.birth_date">{{ formatDate(player.birth_date) }}</span>
              <span v-if="player.phone" class="flex items-center gap-1">
                <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {{ player.phone }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-1 flex-shrink-0">
          <button
            @click="openViewPlayer(player)"
            class="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            @click="openEditPlayer(player)"
            class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <PlayerFormModal
      v-if="showPlayerModal"
      :player="editingPlayer"
      :loading="playerLoading"
      :error="playerError"
      :sport-type="sportType"
      :existing-parents="playerParents"
      @save="handleSavePlayer"
      @close="showPlayerModal = false"
    />

    <PlayerViewModal
      v-if="viewingPlayer"
      :player="viewingPlayer"
      :sport-type="sportType"
      :parents="playerParents"
      :parents-loading="parentsLoading"
      @close="viewingPlayer = null"
    />
  </div>
</template>
