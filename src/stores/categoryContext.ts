import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface CategoryContext {
  seasonId: string
  seasonName: string
  categoryId: string
  categoryName: string
  categoryIsActive: boolean
}

export const useCategoryContextStore = defineStore('categoryContext', () => {
  const context = ref<CategoryContext | null>(null)

  const isActive = computed(() => !!context.value)
  const seasonId = computed(() => context.value?.seasonId ?? '')
  const categoryId = computed(() => context.value?.categoryId ?? '')
  const categoryName = computed(() => context.value?.categoryName ?? '')
  const seasonName = computed(() => context.value?.seasonName ?? '')
  const categoryIsActive = computed(() => context.value?.categoryIsActive ?? false)

  function setContext(data: CategoryContext) {
    context.value = data
  }

  function clear() {
    context.value = null
  }

  return {
    context,
    isActive,
    seasonId,
    categoryId,
    categoryName,
    seasonName,
    categoryIsActive,
    setContext,
    clear,
  }
})
