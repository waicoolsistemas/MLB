<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import { useMyLeagueStore } from '@/stores/myLeague'
import type { Game } from '@/services/leagueService'
import CalendarGameDetail from '@/components/games/CalendarGameDetail.vue'

const store = useMyLeagueStore()
const categoryId = inject<ComputedRef<string>>('categoryId')!

const loading = ref(true)
const error = ref<string | null>(null)
const viewMode = ref<'month' | 'week'>('month')
const currentDate = ref(new Date())
const selectedGame = ref<Game | null>(null)
const expandedMobileDay = ref<string | null>(null)
const expandedDays = ref(new Set<string>())

function toggleExpandDay(dateStr: string) {
  const next = new Set(expandedDays.value)
  if (next.has(dateStr)) {
    next.delete(dateStr)
  } else {
    next.add(dateStr)
  }
  expandedDays.value = next
}

const DAY_NAMES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchGamesIfNeeded(categoryId.value),
      store.fetchTeamsIfNeeded(categoryId.value),
      store.fetchMatchdaysIfNeeded(categoryId.value),
    ])
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar juegos'
  } finally {
    loading.value = false
  }
})

const gamesByDate = computed(() => {
  const map = new Map<string, Game[]>()
  for (const g of store.games) {
    if (!g.game_date) continue
    const existing = map.get(g.game_date)
    if (existing) {
      existing.push(g)
    } else {
      map.set(g.game_date, [g])
    }
  }
  return map
})

const undatedGames = computed(() => store.games.filter(g => !g.game_date))

const currentYear = computed(() => currentDate.value.getFullYear())
const currentMonth = computed(() => currentDate.value.getMonth())

const monthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
})

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const weekStart = computed(() => getWeekStart(currentDate.value))

const weekLabel = computed(() => {
  const start = weekStart.value
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
  return `${fmt(start)} - ${fmt(end)}`
})

interface CalendarDay {
  date: Date
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  games: Game[]
}

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isToday(d: Date): boolean {
  const today = new Date()
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
}

const monthWeeks = computed<CalendarDay[][]>(() => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstOfMonth = new Date(year, month, 1)
  let startDay = firstOfMonth.getDay() - 1
  if (startDay < 0) startDay = 6

  const start = new Date(firstOfMonth)
  start.setDate(start.getDate() - startDay)

  const weeks: CalendarDay[][] = []
  const cursor = new Date(start)

  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = []
    for (let d = 0; d < 7; d++) {
      const dateStr = toDateStr(cursor)
      week.push({
        date: new Date(cursor),
        dateStr,
        dayNumber: cursor.getDate(),
        isCurrentMonth: cursor.getMonth() === month,
        isToday: isToday(cursor),
        games: gamesByDate.value.get(dateStr) || [],
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
    if (cursor.getMonth() !== month && cursor.getDay() === 1) break
  }

  return weeks
})

const weekDays = computed<CalendarDay[]>(() => {
  const start = weekStart.value
  const days: CalendarDay[] = []
  const cursor = new Date(start)
  for (let d = 0; d < 7; d++) {
    const dateStr = toDateStr(cursor)
    days.push({
      date: new Date(cursor),
      dateStr,
      dayNumber: cursor.getDate(),
      isCurrentMonth: cursor.getMonth() === currentMonth.value,
      isToday: isToday(cursor),
      games: gamesByDate.value.get(dateStr) || [],
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})

function navigate(direction: -1 | 1) {
  const d = new Date(currentDate.value)
  if (viewMode.value === 'month') {
    d.setMonth(d.getMonth() + direction)
    expandedDays.value = new Set()
  } else {
    d.setDate(d.getDate() + direction * 7)
  }
  currentDate.value = d
}

function goToday() {
  currentDate.value = new Date()
}

function statusDotClass(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-gray-400',
    in_progress: 'bg-gold-400',
    completed: 'bg-green-400',
    cancelled: 'bg-red-400',
    forfeit: 'bg-orange-400',
  }
  return map[status] || 'bg-gray-400'
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-gray-500/10 text-gray-400 border-gray-600/30',
    in_progress: 'bg-gold-400/10 text-gold-400 border-gold-500/30',
    completed: 'bg-green-400/10 text-green-400 border-green-500/30',
    cancelled: 'bg-red-400/10 text-red-400 border-red-500/30',
    forfeit: 'bg-orange-400/10 text-orange-400 border-orange-500/30',
  }
  return map[status] || 'bg-gray-500/10 text-gray-400 border-gray-600/30'
}

function formatTime(time: string | null): string {
  if (!time) return ''
  return time.slice(0, 5)
}

function toggleMobileDay(dateStr: string) {
  expandedMobileDay.value = expandedMobileDay.value === dateStr ? null : dateStr
}
</script>

<template>
  <div class="card p-6">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-lg font-semibold text-white">Calendario</h2>
        <p v-if="store.games.length > 0" class="text-gray-500 text-xs mt-0.5">
          {{ store.games.length }} juego{{ store.games.length === 1 ? '' : 's' }} programados
        </p>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <div class="h-8 bg-navy-700 rounded w-48 animate-pulse"></div>
      <div class="grid grid-cols-7 gap-1">
        <div v-for="i in 35" :key="i" class="h-20 bg-navy-700 rounded animate-pulse"></div>
      </div>
    </div>

    <div v-else-if="error" class="text-center py-8">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <template v-else>
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div class="flex items-center gap-2">
          <button
            @click="navigate(-1)"
            class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h3 class="text-white font-semibold text-sm capitalize min-w-[160px] text-center">
            {{ viewMode === 'month' ? monthLabel : weekLabel }}
          </h3>
          <button
            @click="navigate(1)"
            class="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-navy-700 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            @click="goToday"
            class="ml-2 px-3 py-1 rounded-lg text-xs font-medium bg-navy-700 text-gray-300 hover:text-white hover:bg-navy-600 transition-colors"
          >
            Hoy
          </button>
        </div>

        <div class="flex items-center bg-navy-700 rounded-lg p-0.5">
          <button
            @click="viewMode = 'month'"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            :class="viewMode === 'month' ? 'bg-cardinal-600 text-white' : 'text-gray-400 hover:text-white'"
          >
            Mes
          </button>
          <button
            @click="viewMode = 'week'"
            class="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            :class="viewMode === 'week' ? 'bg-cardinal-600 text-white' : 'text-gray-400 hover:text-white'"
          >
            Semana
          </button>
        </div>
      </div>

      <!-- Month View -->
      <div v-if="viewMode === 'month'">
        <!-- Desktop -->
        <div class="hidden sm:block">
          <div class="grid grid-cols-7 gap-px mb-px">
            <div
              v-for="day in DAY_NAMES"
              :key="day"
              class="text-center text-xs font-semibold text-gray-500 py-2"
            >
              {{ day }}
            </div>
          </div>
          <div
            v-for="(week, wIdx) in monthWeeks"
            :key="wIdx"
            class="grid grid-cols-7 gap-px"
          >
            <div
              v-for="day in week"
              :key="day.dateStr"
              class="min-h-[90px] border border-navy-700 rounded-lg p-1.5 transition-colors hover:border-navy-500 cursor-default"
              :class="{
                'bg-navy-800': day.isCurrentMonth,
                'bg-navy-900/50': !day.isCurrentMonth,
              }"
            >
              <div class="flex items-center justify-between mb-1">
                <span
                  class="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full"
                  :class="{
                    'bg-cardinal-600 text-white': day.isToday,
                    'text-white': day.isCurrentMonth && !day.isToday,
                    'text-gray-600': !day.isCurrentMonth,
                  }"
                >
                  {{ day.dayNumber }}
                </span>
                <span
                  v-if="day.games.length > 0"
                  class="text-[10px] text-gray-500"
                >
                  {{ day.games.length }}
                </span>
              </div>
              <div class="space-y-0.5">
                <button
                  v-for="game in (day.games.length >= 4 && !expandedDays.has(day.dateStr) ? day.games.slice(0, 3) : day.games)"
                  :key="game.id"
                  @click="selectedGame = game"
                  class="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border transition-colors hover:brightness-125"
                  :class="statusBadgeClass(game.status)"
                >
                  {{ game.home_team_name.slice(0, 3) }} vs {{ game.away_team_name.slice(0, 3) }}
                  <span v-if="game.game_time" class="text-[9px] opacity-70 ml-0.5">{{ formatTime(game.game_time) }}</span>
                </button>
              </div>
              <button
                v-if="day.games.length >= 4"
                @click.stop="toggleExpandDay(day.dateStr)"
                class="text-[10px] text-gray-500 hover:text-gray-300 pl-1.5 pt-0.5 cursor-pointer transition-colors"
              >
                {{ expandedDays.has(day.dateStr) ? 'Reducir' : `+${day.games.length - 3} mas` }}
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile -->
        <div class="sm:hidden">
          <div class="grid grid-cols-7 gap-px mb-px">
            <div
              v-for="day in DAY_NAMES"
              :key="day"
              class="text-center text-[10px] font-semibold text-gray-500 py-1.5"
            >
              {{ day }}
            </div>
          </div>
          <div
            v-for="(week, wIdx) in monthWeeks"
            :key="wIdx"
            class="grid grid-cols-7 gap-px"
          >
            <button
              v-for="day in week"
              :key="day.dateStr"
              @click="day.games.length > 0 ? toggleMobileDay(day.dateStr) : null"
              class="min-h-[44px] border border-navy-700 rounded-md p-1 text-center transition-colors"
              :class="{
                'bg-navy-800': day.isCurrentMonth,
                'bg-navy-900/50': !day.isCurrentMonth,
                'border-cardinal-500': expandedMobileDay === day.dateStr,
              }"
            >
              <span
                class="text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full mx-auto"
                :class="{
                  'bg-cardinal-600 text-white': day.isToday,
                  'text-white': day.isCurrentMonth && !day.isToday,
                  'text-gray-600': !day.isCurrentMonth,
                }"
              >
                {{ day.dayNumber }}
              </span>
              <div v-if="day.games.length > 0" class="flex items-center justify-center gap-0.5 mt-1">
                <span
                  v-for="(game, gIdx) in day.games.slice(0, 3)"
                  :key="gIdx"
                  class="w-1.5 h-1.5 rounded-full"
                  :class="statusDotClass(game.status)"
                ></span>
                <span v-if="day.games.length > 3" class="text-[8px] text-gray-500 ml-0.5">+{{ day.games.length - 3 }}</span>
              </div>
            </button>
          </div>

          <div
            v-for="(week, wIdx) in monthWeeks"
            :key="'exp-' + wIdx"
          >
            <template v-for="day in week" :key="'detail-' + day.dateStr">
              <div
                v-if="expandedMobileDay === day.dateStr && day.games.length > 0"
                class="mt-2 mb-2 space-y-1.5 px-1"
              >
                <div class="text-xs font-semibold text-gray-400 mb-1.5">
                  {{ day.date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }) }}
                </div>
                <button
                  v-for="game in day.games"
                  :key="game.id"
                  @click="selectedGame = game"
                  class="w-full text-left bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 hover:border-navy-500 transition-colors"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-white font-medium truncate">
                      {{ game.home_team_name }} vs {{ game.away_team_name }}
                    </span>
                    <span
                      class="w-2 h-2 rounded-full flex-shrink-0 ml-2"
                      :class="statusDotClass(game.status)"
                    ></span>
                  </div>
                  <div class="flex items-center gap-2 mt-1">
                    <span v-if="game.game_time" class="text-[10px] text-gray-500">{{ formatTime(game.game_time) }}</span>
                    <span v-if="game.location" class="text-[10px] text-gray-500 truncate">{{ game.location }}</span>
                  </div>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Week View -->
      <div v-if="viewMode === 'week'">
        <!-- Desktop -->
        <div class="hidden sm:block">
          <div class="grid grid-cols-7 gap-2">
            <div v-for="day in weekDays" :key="day.dateStr" class="flex flex-col">
              <div class="text-center mb-2">
                <div class="text-[10px] font-semibold text-gray-500 uppercase">
                  {{ DAY_NAMES[weekDays.indexOf(day)] }}
                </div>
                <span
                  class="text-sm font-semibold inline-flex items-center justify-center w-7 h-7 rounded-full mt-0.5"
                  :class="{
                    'bg-cardinal-600 text-white': day.isToday,
                    'text-white': !day.isToday,
                  }"
                >
                  {{ day.dayNumber }}
                </span>
              </div>
              <div
                class="flex-1 border border-navy-700 rounded-lg p-2 min-h-[200px] space-y-1.5 transition-colors hover:border-navy-500"
                :class="day.isToday ? 'bg-navy-700/30' : 'bg-navy-800'"
              >
                <div v-if="day.games.length === 0" class="flex items-center justify-center h-full">
                  <span class="text-[10px] text-gray-600">Sin juegos</span>
                </div>
                <button
                  v-for="game in day.games"
                  :key="game.id"
                  @click="selectedGame = game"
                  class="w-full text-left rounded-lg p-2 border transition-colors hover:brightness-125"
                  :class="statusBadgeClass(game.status)"
                >
                  <div v-if="game.game_time" class="text-[10px] opacity-70 mb-0.5">{{ formatTime(game.game_time) }}</div>
                  <div class="text-[11px] font-medium leading-tight">
                    {{ game.home_team_name }}
                  </div>
                  <div class="text-[10px] opacity-60 my-0.5">vs</div>
                  <div class="text-[11px] font-medium leading-tight">
                    {{ game.away_team_name }}
                  </div>
                  <div v-if="game.home_score !== null && game.away_score !== null" class="text-xs font-bold mt-1">
                    {{ game.home_score }} - {{ game.away_score }}
                  </div>
                  <div v-if="game.location" class="text-[9px] opacity-60 mt-1 truncate">
                    {{ game.location }}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Mobile -->
        <div class="sm:hidden space-y-3">
          <div v-for="day in weekDays" :key="day.dateStr">
            <div class="flex items-center gap-2 mb-1.5">
              <span
                class="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                :class="day.isToday ? 'bg-cardinal-600 text-white' : 'text-white'"
              >
                {{ day.dayNumber }}
              </span>
              <span class="text-xs text-gray-500 capitalize">
                {{ day.date.toLocaleDateString('es-MX', { weekday: 'long' }) }}
              </span>
              <span v-if="day.games.length > 0" class="text-[10px] text-gray-600">
                ({{ day.games.length }})
              </span>
            </div>
            <div v-if="day.games.length === 0" class="border border-navy-700 border-dashed rounded-lg py-3 text-center">
              <span class="text-[10px] text-gray-600">Sin juegos</span>
            </div>
            <div v-else class="space-y-1.5">
              <button
                v-for="game in day.games"
                :key="game.id"
                @click="selectedGame = game"
                class="w-full text-left bg-navy-900 border border-navy-700 rounded-lg px-3 py-2 hover:border-navy-500 transition-colors"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs text-white font-medium truncate">
                    {{ game.home_team_name }} vs {{ game.away_team_name }}
                  </span>
                  <span
                    class="w-2 h-2 rounded-full flex-shrink-0 ml-2"
                    :class="statusDotClass(game.status)"
                  ></span>
                </div>
                <div class="flex items-center gap-2 mt-1">
                  <span v-if="game.game_time" class="text-[10px] text-gray-500">{{ formatTime(game.game_time) }}</span>
                  <span v-if="game.location" class="text-[10px] text-gray-500 truncate">{{ game.location }}</span>
                  <span v-if="game.home_score !== null && game.away_score !== null" class="text-[10px] font-bold text-white ml-auto">
                    {{ game.home_score }} - {{ game.away_score }}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Undated games -->
      <div v-if="undatedGames.length > 0" class="mt-6 pt-5 border-t border-navy-700">
        <h3 class="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Sin Fecha Asignada
          <span class="text-xs text-gray-500 font-normal">({{ undatedGames.length }})</span>
        </h3>
        <div class="space-y-1.5">
          <button
            v-for="game in undatedGames"
            :key="game.id"
            @click="selectedGame = game"
            class="w-full text-left bg-navy-900 border border-navy-700 rounded-lg px-4 py-2.5 hover:border-navy-500 transition-colors"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs text-gray-500">J{{ game.matchday }}</span>
                <span class="text-sm text-white font-medium truncate">
                  {{ game.home_team_name }} vs {{ game.away_team_name }}
                </span>
              </div>
              <span
                class="w-2 h-2 rounded-full flex-shrink-0 ml-2"
                :class="statusDotClass(game.status)"
              ></span>
            </div>
          </button>
        </div>
      </div>
    </template>

    <CalendarGameDetail
      v-if="selectedGame"
      :game="selectedGame"
      @close="selectedGame = null"
    />
  </div>
</template>
