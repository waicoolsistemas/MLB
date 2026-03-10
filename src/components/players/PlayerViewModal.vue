<script setup lang="ts">
import type { Player, PlayerParent } from '@/services/leagueService'
import BaseButton from '@/components/BaseButton.vue'

defineProps<{
  player: Player
  sportType?: 'baseball' | 'softball'
  parents?: PlayerParent[]
  parentsLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700 sticky top-0 bg-navy-900 z-10">
        <h2 class="text-lg font-bold text-white">Detalle del Jugador</h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-5">
        <div class="flex flex-col items-center gap-3">
          <div
            v-if="player.photo_url"
            class="w-20 h-20 rounded-full overflow-hidden bg-navy-800"
          >
            <img :src="player.photo_url" :alt="player.full_name" class="w-full h-full object-cover" />
          </div>
          <div
            v-else
            class="w-20 h-20 rounded-full flex items-center justify-center bg-navy-800"
          >
            <span class="text-2xl font-bold text-blue-400">
              {{ player.full_name.charAt(0).toUpperCase() }}
            </span>
          </div>
          <div class="text-center">
            <p class="text-white font-semibold text-lg">{{ player.full_name }}</p>
            <span
              class="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full"
              :class="player.is_active ? 'bg-green-400/10 text-green-400' : 'bg-gray-500/10 text-gray-500'"
            >
              {{ player.is_active ? 'Activo' : 'Inactivo' }}
            </span>
          </div>
        </div>

        <div class="space-y-3">
          <div class="bg-navy-800/50 rounded-lg px-4 py-3">
            <p class="text-xs text-gray-500 mb-0.5">CURP</p>
            <p class="text-sm text-white">{{ player.curp || '-' }}</p>
          </div>
          <div class="bg-navy-800/50 rounded-lg px-4 py-3">
            <p class="text-xs text-gray-500 mb-0.5">Telefono</p>
            <p class="text-sm text-white">{{ player.phone || '-' }}</p>
          </div>
          <div class="bg-navy-800/50 rounded-lg px-4 py-3">
            <p class="text-xs text-gray-500 mb-0.5">Fecha de Nacimiento</p>
            <p class="text-sm text-white">{{ formatDate(player.birth_date) }}</p>
          </div>
        </div>

        <div v-if="sportType === 'baseball'" class="border-t border-navy-700 pt-4">
          <h3 class="text-sm font-semibold text-white mb-3">Padres</h3>
          <div v-if="parentsLoading" class="space-y-2">
            <div v-for="i in 2" :key="i" class="bg-navy-800/50 rounded-lg px-4 py-3 animate-pulse">
              <div class="h-3 bg-navy-700 rounded w-1/3 mb-2"></div>
              <div class="h-4 bg-navy-700 rounded w-2/3"></div>
            </div>
          </div>
          <div v-else-if="!parents || parents.length === 0" class="text-center py-3">
            <p class="text-gray-500 text-xs">Sin padres registrados</p>
          </div>
          <div v-else class="space-y-3">
            <div
              v-for="parent in parents"
              :key="parent.id"
              class="bg-navy-800/50 border border-navy-700 rounded-lg px-4 py-3 space-y-1.5"
            >
              <p class="text-sm font-medium text-white">{{ parent.full_name }}</p>
              <div class="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                <span v-if="parent.phone" class="flex items-center gap-1">
                  <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {{ parent.phone }}
                </span>
                <span v-if="parent.address" class="flex items-center gap-1">
                  <svg class="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {{ parent.address }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="pt-1">
          <BaseButton variant="ghost" @click="emit('close')" full-width>
            Cerrar
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
