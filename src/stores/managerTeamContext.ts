import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface ManagerTeamContext {
  teamId: string
  teamName: string
}

export const useManagerTeamContextStore = defineStore('managerTeamContext', () => {
  const context = ref<ManagerTeamContext | null>(null)

  const isActive = computed(() => !!context.value)
  const teamId = computed(() => context.value?.teamId ?? '')
  const teamName = computed(() => context.value?.teamName ?? '')

  function setContext(data: ManagerTeamContext) {
    context.value = data
  }

  function clear() {
    context.value = null
  }

  return {
    context,
    isActive,
    teamId,
    teamName,
    setContext,
    clear,
  }
})
