import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  leagueService,
  type League,
  type LeagueDetail,
} from '@/services/leagueService'

export const useLeaguesStore = defineStore('leagues', () => {
  const leagues = ref<League[]>([])
  const currentLeague = ref<LeagueDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchLeagues() {
    isLoading.value = true
    error.value = null
    try {
      leagues.value = await leagueService.list()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      error.value = e.response?.data?.error || 'Failed to load leagues'
    } finally {
      isLoading.value = false
    }
  }

  async function fetchLeague(id: string) {
    isLoading.value = true
    error.value = null
    try {
      currentLeague.value = await leagueService.get(id)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      error.value = e.response?.data?.error || 'Failed to load league'
    } finally {
      isLoading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  function clearCurrent() {
    currentLeague.value = null
  }

  return {
    leagues,
    currentLeague,
    isLoading,
    error,
    fetchLeagues,
    fetchLeague,
    clearError,
    clearCurrent,
  }
})
