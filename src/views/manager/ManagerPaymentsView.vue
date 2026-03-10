<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useManagerStore } from '@/stores/manager'
import { useManagerTeamContextStore } from '@/stores/managerTeamContext'

const route = useRoute()
const router = useRouter()
const store = useManagerStore()
const managerTeamCtx = useManagerTeamContextStore()
const error = ref<string | null>(null)
const teamId = computed(() => route.params.teamId as string)

onMounted(async () => {
  try {
    await Promise.all([
      store.fetchTeamDetail(teamId.value),
      store.fetchPaymentInfoIfNeeded(teamId.value),
    ])
    if (store.currentTeam) {
      managerTeamCtx.setContext({ teamId: teamId.value, teamName: store.currentTeam.name })
    }
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar pagos'
  }
})

const team = computed(() => store.currentTeam)
const info = computed(() => store.paymentInfo)

const progressPercent = computed(() => {
  if (!info.value || info.value.effective_fee <= 0) return 0
  return Math.min(100, Math.round((info.value.total_paid / info.value.effective_fee) * 100))
})

const progressBarClass = computed(() => {
  if (!info.value) return 'bg-gray-600'
  if (info.value.is_settled) return 'bg-green-500'
  if (info.value.total_paid > 0) return 'bg-gold-500'
  return 'bg-gray-600'
})

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const methodLabel: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  check: 'Cheque',
  other: 'Otro',
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
      <h1 class="text-2xl font-bold text-white">Pagos de Inscripcion</h1>
      <p class="text-gray-500 text-sm mt-1">Estado de pago de tu equipo.</p>
    </div>

    <div v-if="store.paymentInfoLoading" class="space-y-4">
      <div class="card p-6 animate-pulse">
        <div class="h-6 bg-navy-700 rounded w-1/3 mb-4"></div>
        <div class="h-4 bg-navy-700 rounded w-full mb-2"></div>
        <div class="h-4 bg-navy-700 rounded w-2/3"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-6 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <template v-else-if="info">
      <div class="card p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-white font-semibold">Resumen</h2>
          <span
            v-if="info.is_settled"
            class="text-xs font-bold px-2.5 py-1 rounded-full bg-green-400/10 text-green-400"
          >
            Liquidado
          </span>
          <span
            v-else
            class="text-xs font-bold px-2.5 py-1 rounded-full bg-gold-400/10 text-gold-400"
          >
            Pendiente: {{ formatCurrency(info.balance) }}
          </span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div class="bg-navy-700/50 rounded-lg p-4">
            <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Cuota</p>
            <p class="text-white text-lg font-bold">{{ formatCurrency(info.effective_fee) }}</p>
          </div>
          <div class="bg-navy-700/50 rounded-lg p-4">
            <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Pagado</p>
            <p class="text-lg font-bold" :class="info.total_paid > 0 ? 'text-green-400' : 'text-gray-400'">{{ formatCurrency(info.total_paid) }}</p>
          </div>
          <div class="bg-navy-700/50 rounded-lg p-4">
            <p class="text-gray-500 text-xs uppercase tracking-wider mb-1">Balance</p>
            <p class="text-lg font-bold" :class="info.balance > 0 ? 'text-red-400' : 'text-green-400'">{{ formatCurrency(info.balance) }}</p>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>Progreso de pago</span>
            <span>{{ progressPercent }}%</span>
          </div>
          <div class="w-full h-2.5 bg-navy-700 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="progressBarClass"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="px-6 py-4 border-b border-navy-700">
          <h2 class="text-white font-semibold text-sm">Historial de Pagos</h2>
        </div>

        <div v-if="info.payments.length === 0" class="p-8 text-center">
          <div class="w-12 h-12 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p class="text-gray-500 text-sm">No hay pagos registrados.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-navy-600">
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Metodo</th>
                <th class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Notas</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="payment in info.payments"
                :key="payment.id"
                class="border-b border-navy-700 last:border-0 hover:bg-navy-700/50 transition-colors"
              >
                <td class="px-6 py-3 text-gray-400 whitespace-nowrap">{{ formatDate(payment.payment_date) }}</td>
                <td class="px-6 py-3 text-right text-green-400 font-medium whitespace-nowrap">{{ formatCurrency(payment.amount) }}</td>
                <td class="px-6 py-3 text-gray-400">{{ methodLabel[payment.payment_method] || payment.payment_method || '-' }}</td>
                <td class="px-6 py-3 text-gray-500 max-w-xs truncate">{{ payment.notes || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
