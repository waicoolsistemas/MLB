<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useLeaguesStore } from '@/stores/leagues'

const router = useRouter()
const auth = useAuthStore()
const leaguesStore = useLeaguesStore()

const roleBadgeClass: Record<string, string> = {
  super_admin: 'bg-cardinal-600 text-white',
  admin: 'bg-gold-500 text-navy-950',
  manager: 'bg-blue-500 text-white',
  player: 'bg-navy-600 text-gray-300',
}

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  player: 'Jugador',
}

const activeLeagues = computed(() => leaguesStore.leagues.filter(l => l.is_active).length)
const totalAdmins = computed(() => leaguesStore.leagues.filter(l => l.admin).length)
const withoutAdmin = computed(() => leaguesStore.leagues.filter(l => !l.admin).length)

const adminFeatures = [
  {
    title: 'Temporadas',
    description: 'Crear y gestionar temporadas de tu liga',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  {
    title: 'Categorias',
    description: 'Organizar divisiones dentro de cada temporada',
    icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
    color: 'text-gold-400',
    bg: 'bg-gold-400/10',
    border: 'border-gold-400/20',
  },
  {
    title: 'Equipos',
    description: 'Registrar equipos y asignar managers',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
  },
  {
    title: 'Jugadores',
    description: 'Gestionar el roster de cada equipo',
    icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
  },
  {
    title: 'Jornadas y Juegos',
    description: 'Crear jornadas, generar fixtures y capturar marcadores',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/20',
  },
  {
    title: 'Tabla de Posiciones',
    description: 'Standings en tiempo real por categoria',
    icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
  {
    title: 'Estadisticas',
    description: 'Capturar y consultar metricas individuales de jugadores',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    color: 'text-gold-400',
    bg: 'bg-gold-400/10',
    border: 'border-gold-400/20',
  },
  {
    title: 'Pagos e Inscripciones',
    description: 'Controlar cuotas y registrar pagos por equipo',
    icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
    color: 'text-cardinal-400',
    bg: 'bg-cardinal-400/10',
    border: 'border-cardinal-400/20',
  },
  {
    title: 'Playoffs',
    description: 'Configurar brackets, llaves y juegos de postemporada',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
]

const superAdminStats = computed(() => [
  {
    label: 'Total Ligas',
    value: leaguesStore.leagues.length,
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    label: 'Ligas Activas',
    value: activeLeagues.value,
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
  {
    label: 'Admins Asignados',
    value: totalAdmins.value,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    color: 'text-gold-400',
    bg: 'bg-gold-400/10',
  },
  {
    label: 'Sin Admin',
    value: withoutAdmin.value,
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    color: 'text-cardinal-400',
    bg: 'bg-cardinal-400/10',
  },
])

onMounted(() => {
  if (auth.isSuperAdmin) {
    leaguesStore.fetchLeagues()
  }
})
</script>

<template>
  <div>
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-2">
        <h1 class="text-2xl font-bold text-white">Panel de Control</h1>
        <span
          class="text-xs font-semibold px-2 py-1 rounded"
          :class="roleBadgeClass[auth.user?.role || 'player']"
        >
          {{ roleLabel[auth.user?.role || 'player'] }}
        </span>
      </div>
      <p class="text-gray-500 text-sm">
        Bienvenido de nuevo, <span class="text-gray-300 font-medium">{{ auth.user?.full_name }}</span>.
        <template v-if="auth.isSuperAdmin">Aqui esta el resumen general del sistema.</template>
        <template v-else>Aqui esta el resumen de tu liga.</template>
      </p>
    </div>

    <template v-if="auth.isSuperAdmin">
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div
          v-for="stat in superAdminStats"
          :key="stat.label"
          class="card p-5 hover:border-navy-500 transition-colors duration-200"
        >
          <div class="flex items-start justify-between mb-4">
            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center', stat.bg]">
              <svg class="w-5 h-5" :class="stat.color" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" :d="stat.icon" />
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-white mb-1">{{ stat.value }}</div>
          <div class="text-gray-500 text-sm">{{ stat.label }}</div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-white font-semibold">Acceso Rapido</h2>
        </div>
        <div class="flex flex-wrap gap-3">
          <button
            @click="router.push('/leagues')"
            class="btn-primary flex items-center gap-2 text-sm"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Gestion de Ligas
          </button>
        </div>
      </div>
    </template>

    <template v-else-if="auth.isAdmin">
      <div class="card p-6 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h2 class="text-white font-semibold text-lg">Administrador de Liga</h2>
            <p class="text-gray-500 text-sm">Gestiona temporadas, categorias y equipos de tu liga asignada.</p>
          </div>
        </div>
        <button
          @click="router.push('/my-league')"
          class="btn-primary flex items-center gap-2 text-sm"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Ir a Mi Liga
        </button>
      </div>

      <div class="card p-6">
        <h2 class="text-white font-semibold mb-1">Que puedes hacer</h2>
        <p class="text-gray-500 text-sm mb-5">Todo lo que necesitas para administrar tu liga desde un solo lugar.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="feature in adminFeatures"
            :key="feature.title"
            class="rounded-xl border border-navy-700/50 bg-navy-800/30 p-4 hover:border-navy-600 transition-all duration-200 group"
          >
            <div class="flex items-start gap-3">
              <div :class="['w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-200', feature.bg, `group-hover:${feature.border}`]">
                <svg class="w-[18px] h-[18px]" :class="feature.color" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="feature.icon" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="text-white text-sm font-medium mb-0.5">{{ feature.title }}</h3>
                <p class="text-gray-500 text-xs leading-relaxed">{{ feature.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="auth.isManager">
      <div class="card p-6 mb-6">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <svg class="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 class="text-white font-semibold text-lg">Portal de Manager</h2>
            <p class="text-gray-500 text-sm">Consulta juegos, posiciones y estadisticas de tus equipos.</p>
          </div>
        </div>
        <button
          @click="router.push('/my-teams')"
          class="btn-primary flex items-center gap-2 text-sm"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Ver Mis Equipos
        </button>
      </div>

      <div class="card p-6">
        <h2 class="text-white font-semibold mb-3">Informacion disponible</h2>
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span class="text-gray-300">Ver <span class="text-white font-medium">calendario de juegos</span> y resultados</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span class="text-gray-300">Consultar <span class="text-white font-medium">tabla de posiciones</span> de la categoria</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span class="text-gray-300">Ver <span class="text-white font-medium">estadisticas</span> de tus jugadores</span>
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="w-8 h-8 rounded-lg bg-cardinal-400/10 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-cardinal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span class="text-gray-300">Revisar <span class="text-white font-medium">roster</span> de jugadores</span>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="card p-6">
        <h2 class="text-white font-semibold mb-1">Bienvenido</h2>
        <p class="text-gray-500 text-sm">Tu cuenta esta activa. Las funcionalidades de tu rol se habilitaran proximamente.</p>
      </div>
    </template>
  </div>
</template>
