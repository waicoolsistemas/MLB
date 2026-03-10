<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { leagueService, type Category, type Season, type ScheduleType } from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import CategoryFormModal from '@/components/categories/CategoryFormModal.vue'
import SeasonFormModal from '@/components/seasons/SeasonFormModal.vue'

const route = useRoute()
const router = useRouter()
const myLeagueStore = useMyLeagueStore()

const season = ref<Season | null>(null)
const categories = ref<Category[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const showCategoryModal = ref(false)
const editingCategory = ref<Category | null>(null)
const categoryLoading = ref(false)
const categoryError = ref<string | null>(null)

const showEditSeasonModal = ref(false)
const editSeasonLoading = ref(false)
const editSeasonError = ref<string | null>(null)

const seasonId = computed(() => route.params.seasonId as string)
const activeCategories = computed(() => categories.value.filter(c => c.is_active).length)

onMounted(async () => {
  await fetchData()
})

async function fetchData(showLoading = true) {
  if (showLoading) isLoading.value = true
  error.value = null
  try {
    await myLeagueStore.fetchIfNeeded()
    const found = myLeagueStore.findSeason(seasonId.value)
    if (!found) {
      error.value = 'Temporada no encontrada'
      return
    }
    season.value = found
    categories.value = found.categories || []
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar la temporada'
  } finally {
    isLoading.value = false
  }
}

async function refreshAndReload() {
  await myLeagueStore.refresh()
  const found = myLeagueStore.findSeason(seasonId.value)
  if (found) {
    season.value = found
    categories.value = found.categories || []
  }
}

function openCreateCategory() {
  editingCategory.value = null
  categoryError.value = null
  showCategoryModal.value = true
}

function openEditCategory(cat: Category) {
  editingCategory.value = cat
  categoryError.value = null
  showCategoryModal.value = true
}

async function handleSaveCategory(payload: { name: string; description?: string; is_active?: boolean }) {
  categoryLoading.value = true
  categoryError.value = null
  try {
    if (editingCategory.value) {
      await leagueService.updateCategory(editingCategory.value.id, payload)
    } else {
      await leagueService.createCategory(seasonId.value, payload)
    }
    showCategoryModal.value = false
    editingCategory.value = null
    await refreshAndReload()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    categoryError.value = e.response?.data?.error || 'Error al guardar categoria'
  } finally {
    categoryLoading.value = false
  }
}

async function handleEditSeason(payload: { name: string; start_date?: string | null; end_date?: string | null; is_active?: boolean; schedule_type?: ScheduleType; schedule_days?: number[]; games_per_day?: number; default_time_slots?: string[] }) {
  if (!season.value) return
  editSeasonLoading.value = true
  editSeasonError.value = null
  try {
    await leagueService.updateSeason(season.value.id, payload)
    showEditSeasonModal.value = false
    await refreshAndReload()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    editSeasonError.value = e.response?.data?.error || 'Error al guardar temporada'
  } finally {
    editSeasonLoading.value = false
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '\u2014'
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <div>
    <button
      @click="router.push({ name: 'my-league' })"
      class="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Volver a Mi Liga
    </button>

    <div v-if="isLoading" class="space-y-6">
      <div class="card p-6 animate-pulse">
        <div class="h-6 bg-navy-700 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-navy-700 rounded w-1/2"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-12 text-center">
      <h3 class="text-white font-semibold mb-2">{{ error }}</h3>
      <p class="text-gray-500 text-sm">Verifica que la temporada exista y tengas permisos.</p>
    </div>

    <div v-else-if="season" class="space-y-6">
      <div class="card p-6">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-2xl font-bold text-white">{{ season.name }}</h1>
              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full"
                :class="season.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
              >
                {{ season.is_active ? 'Activa' : 'Inactiva' }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDate(season.start_date) }} - {{ formatDate(season.end_date) }}
              </span>
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                {{ categories.length }} categorias ({{ activeCategories }} activas)
              </span>
            </div>
          </div>
          <button @click="showEditSeasonModal = true" class="btn-secondary text-sm self-start">
            Editar Temporada
          </button>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-lg font-semibold text-white">Categorias</h2>
          <button @click="openCreateCategory" class="btn-primary flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nueva Categoria
          </button>
        </div>

        <div v-if="categories.length === 0" class="text-center py-8">
          <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 class="text-white font-semibold mb-2">No hay categorias</h3>
          <p class="text-gray-500 text-sm mb-4">Crea categorias para organizar los equipos en esta temporada.</p>
          <button @click="openCreateCategory" class="btn-primary text-sm">Crear Primera Categoria</button>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="bg-navy-900 border border-navy-700 rounded-lg p-4 hover:border-navy-500 transition-all duration-200 cursor-pointer group"
            @click="router.push({ name: 'admin-category-detail', params: { seasonId, categoryId: cat.id } })"
          >
            <div class="flex items-start justify-between mb-2">
              <div class="flex items-center gap-2">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  :class="cat.is_active ? 'bg-gold-400/10' : 'bg-gray-500/10'"
                >
                  <svg class="w-4 h-4" :class="cat.is_active ? 'text-gold-400' : 'text-gray-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <span
                  class="text-xs font-medium px-1.5 py-0.5 rounded-full"
                  :class="cat.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
                >
                  {{ cat.is_active ? 'Activa' : 'Inactiva' }}
                </span>
              </div>
              <div class="flex items-center gap-2 flex-shrink-0">
                <button
                  @click.stop="openEditCategory(cat)"
                  class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <svg class="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
            <h3 class="text-white font-medium mb-1">{{ cat.name }}</h3>
            <p v-if="cat.description" class="text-gray-500 text-xs line-clamp-2 mb-1">{{ cat.description }}</p>
            <p class="text-gray-500 text-xs flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {{ cat.teams_count || 0 }} equipos
            </p>
          </div>
        </div>
      </div>
    </div>

    <CategoryFormModal
      v-if="showCategoryModal"
      :category="editingCategory"
      :loading="categoryLoading"
      :error="categoryError"
      @save="handleSaveCategory"
      @close="showCategoryModal = false"
    />

    <SeasonFormModal
      v-if="showEditSeasonModal"
      :season="season"
      :loading="editSeasonLoading"
      :error="editSeasonError"
      @save="handleEditSeason"
      @close="showEditSeasonModal = false"
    />
  </div>
</template>
