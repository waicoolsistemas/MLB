<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'admin-category-playoffs-setup', label: 'Configuracion' },
  { name: 'admin-category-playoffs-bracket', label: 'Bracket' },
  { name: 'admin-category-playoffs-games', label: 'Juegos' },
  { name: 'admin-category-playoffs-standings', label: 'Posiciones' },
  { name: 'admin-category-playoffs-stats', label: 'Metricas' },
  { name: 'admin-category-playoffs-leaders', label: 'Lideres' },
]

const currentTab = computed(() => route.name as string)

function navigate(tabName: string) {
  router.push({
    name: tabName,
    params: route.params,
  })
}
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center gap-1 mb-6 overflow-x-auto">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        @click="navigate(tab.name)"
        class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0"
        :class="currentTab === tab.name
          ? 'bg-cardinal-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-navy-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <RouterView />
  </div>
</template>
