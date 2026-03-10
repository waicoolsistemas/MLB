<script setup lang="ts">
import { ref, onMounted, computed, watch, provide, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { leagueService, type Category } from '@/services/leagueService'
import { useCategoryContextStore } from '@/stores/categoryContext'
import { useMyLeagueStore } from '@/stores/myLeague'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'

const route = useRoute()
const router = useRouter()
const categoryContext = useCategoryContextStore()
const myLeagueStore = useMyLeagueStore()

const category = ref<Category | null>(null)
const seasonName = ref('')
const isLoading = ref(true)
const error = ref<string | null>(null)

const showEditCategoryModal = ref(false)
const editCategoryLoading = ref(false)
const editCategoryError = ref<string | null>(null)

const seasonId = computed(() => route.params.seasonId as string)
const categoryId = computed(() => route.params.categoryId as string)

provide('category', category)
provide('categoryId', categoryId)
provide('seasonId', seasonId)
provide('refreshCategory', fetchData)

onMounted(async () => {
  await fetchData()
})

watch(() => route.params.categoryId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    await fetchData()
  }
})

onUnmounted(() => {
  categoryContext.clear()
})

async function fetchData() {
  isLoading.value = true
  error.value = null
  try {
    await myLeagueStore.fetchIfNeeded()
    const season = myLeagueStore.findSeason(seasonId.value)
    if (!season) {
      error.value = 'Temporada no encontrada'
      return
    }
    seasonName.value = season.name
    const found = season.categories?.find(c => c.id === categoryId.value)
    if (!found) {
      error.value = 'Categoria no encontrada'
      return
    }
    category.value = found

    categoryContext.setContext({
      seasonId: seasonId.value,
      seasonName: season.name,
      categoryId: categoryId.value,
      categoryName: found.name,
      categoryIsActive: found.is_active,
    })
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar la categoria'
  } finally {
    isLoading.value = false
  }
}

async function handleEditCategory(payload: { name: string; description?: string; registration_fee?: number; is_active?: boolean }) {
  if (!category.value) return
  editCategoryLoading.value = true
  editCategoryError.value = null
  try {
    await leagueService.updateCategory(category.value.id, payload)
    showEditCategoryModal.value = false
    await myLeagueStore.refresh()
    await fetchData()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    editCategoryError.value = e.response?.data?.error || 'Error al guardar categoria'
  } finally {
    editCategoryLoading.value = false
  }
}
</script>

<template>
  <div>
    <div v-if="isLoading" class="space-y-6">
      <div class="card p-6 animate-pulse">
        <div class="h-6 bg-navy-700 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-navy-700 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-12 text-center">
      <h3 class="text-white font-semibold mb-2">{{ error }}</h3>
      <p class="text-gray-500 text-sm">Verifica que la categoria exista y tengas permisos.</p>
    </div>

    <div v-else-if="category" class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3 text-sm text-gray-400">
          <button
            @click="router.push({ name: 'my-league' })"
            class="hover:text-white transition-colors"
          >
            Mi Liga
          </button>
          <svg class="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <button
            @click="router.push({ name: 'admin-season-detail', params: { seasonId } })"
            class="hover:text-white transition-colors"
          >
            {{ seasonName }}
          </button>
          <svg class="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span class="text-white font-medium">{{ category.name }}</span>
        </div>
        <button @click="showEditCategoryModal = true" class="btn-secondary text-sm">
          Editar Categoria
        </button>
      </div>

      <div class="card px-5 py-3 flex items-center gap-4">
        <div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          :class="category.is_active ? 'bg-gold-400/10' : 'bg-gray-500/10'"
        >
          <svg class="w-5 h-5" :class="category.is_active ? 'text-gold-400' : 'text-gray-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h1 class="text-lg font-bold text-white leading-tight">{{ category.name }}</h1>
          <p v-if="category.description" class="text-gray-500 text-xs truncate">{{ category.description }}</p>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <span
            v-if="category.registration_fee > 0"
            class="text-xs font-medium px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400"
          >
            Inscripcion: ${{ Number(category.registration_fee).toLocaleString('en-US', { minimumFractionDigits: 0 }) }}
          </span>
          <span
            class="text-xs font-medium px-2 py-0.5 rounded-full"
            :class="category.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
          >
            {{ category.is_active ? 'Activa' : 'Inactiva' }}
          </span>
        </div>
      </div>

      <RouterView />
    </div>

    <CategoryFormModal
      v-if="showEditCategoryModal"
      :category="category"
      :loading="editCategoryLoading"
      :error="editCategoryError"
      @save="handleEditCategory"
      @close="showEditCategoryModal = false"
    />
  </div>
</template>
