<script setup lang="ts">
import { ref, computed, onMounted, inject, type ComputedRef } from 'vue'
import {
  leagueService,
  type Payment,
  type TeamPaymentSummary,
} from '@/services/leagueService'
import { useMyLeagueStore } from '@/stores/myLeague'
import PaymentFormModal from '@/components/payments/PaymentFormModal.vue'
import TeamFeeModal from '@/components/payments/TeamFeeModal.vue'

const categoryId = inject<ComputedRef<string>>('categoryId')!
const store = useMyLeagueStore()

const error = ref<string | null>(null)

const expandedTeamId = ref<string | null>(null)

const showPaymentModal = ref(false)
const editingPayment = ref<Payment | null>(null)
const preselectedTeamId = ref<string | null>(null)
const paymentLoading = ref(false)
const paymentError = ref<string | null>(null)

const showFeeModal = ref(false)
const feeTeam = ref<TeamPaymentSummary | null>(null)
const feeLoading = ref(false)
const feeError = ref<string | null>(null)

const deleteConfirm = ref<string | null>(null)

const activeTeams = computed(() =>
  store.paymentsSummary.filter(s => s.team.is_active)
)

const inactiveTeams = computed(() =>
  store.paymentsSummary.filter(s => !s.team.is_active)
)

const allTeams = computed(() =>
  store.paymentsSummary.map(s => s.team)
)

const unsettledTeams = computed(() =>
  store.paymentsSummary.filter(s => !s.is_settled).map(s => s.team)
)

const totalCollected = computed(() =>
  store.paymentsSummary.reduce((sum, s) => sum + s.total_paid, 0)
)

const settledCount = computed(() =>
  activeTeams.value.filter(s => s.is_settled).length
)

const collectionPercent = computed(() => {
  const totalExpected = activeTeams.value.reduce((sum, s) => sum + s.effective_fee, 0)
  if (totalExpected === 0) return 0
  return Math.min(100, Math.round((totalCollected.value / totalExpected) * 100))
})

onMounted(async () => {
  error.value = null
  try {
    await store.fetchPaymentsIfNeeded(categoryId.value)
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al cargar pagos'
  }
})

function toggleExpand(teamId: string) {
  expandedTeamId.value = expandedTeamId.value === teamId ? null : teamId
}

function openCreatePayment(teamId?: string) {
  editingPayment.value = null
  preselectedTeamId.value = teamId || null
  paymentError.value = null
  showPaymentModal.value = true
}

function openEditPayment(payment: Payment) {
  editingPayment.value = payment
  preselectedTeamId.value = null
  paymentError.value = null
  showPaymentModal.value = true
}

async function handleSavePayment(payload: { team_id: string; amount: number; payment_date?: string; payment_method?: string; notes?: string }) {
  paymentLoading.value = true
  paymentError.value = null
  try {
    if (editingPayment.value) {
      await leagueService.updatePayment(editingPayment.value.id, payload)
    } else {
      await leagueService.createPayment(categoryId.value, payload)
    }
    showPaymentModal.value = false
    await store.refreshPayments(categoryId.value)
    store.invalidateTeams()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    paymentError.value = e.response?.data?.error || 'Error al guardar pago'
  } finally {
    paymentLoading.value = false
  }
}

async function handleDeletePayment(paymentId: string) {
  if (deleteConfirm.value !== paymentId) {
    deleteConfirm.value = paymentId
    return
  }
  try {
    await leagueService.deletePayment(paymentId)
    deleteConfirm.value = null
    await store.refreshPayments(categoryId.value)
    store.invalidateTeams()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    error.value = e.response?.data?.error || 'Error al eliminar pago'
  }
}

function openFeeModal(summary: TeamPaymentSummary) {
  feeTeam.value = summary
  feeError.value = null
  showFeeModal.value = true
}

async function handleSaveFee(amount: number) {
  if (!feeTeam.value) return
  feeLoading.value = true
  feeError.value = null
  try {
    await leagueService.setTeamFee(feeTeam.value.team.id, amount)
    showFeeModal.value = false
    await store.refreshPayments(categoryId.value)
    store.invalidateTeams()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    feeError.value = e.response?.data?.error || 'Error al guardar cuota'
  } finally {
    feeLoading.value = false
  }
}

async function handleResetFee() {
  if (!feeTeam.value) return
  feeLoading.value = true
  feeError.value = null
  try {
    await leagueService.removeTeamFee(feeTeam.value.team.id)
    showFeeModal.value = false
    await store.refreshPayments(categoryId.value)
    store.invalidateTeams()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { error?: string } } }
    feeError.value = e.response?.data?.error || 'Error al restaurar cuota'
  } finally {
    feeLoading.value = false
  }
}

function formatMoney(n: number): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 })
}

function progressPercent(s: TeamPaymentSummary): number {
  if (s.effective_fee === 0) return 0
  return Math.min(100, Math.round((s.total_paid / s.effective_fee) * 100))
}

function progressColor(s: TeamPaymentSummary): string {
  if (s.is_settled) return 'bg-green-500'
  if (s.total_paid > 0) return 'bg-gold-400'
  return 'bg-gray-600'
}
</script>

<template>
  <div class="space-y-6">
    <div v-if="store.paymentsLoading" class="card p-6">
      <div class="animate-pulse space-y-4">
        <div class="h-5 bg-navy-700 rounded w-1/4"></div>
        <div class="grid grid-cols-3 gap-4">
          <div class="h-16 bg-navy-700 rounded"></div>
          <div class="h-16 bg-navy-700 rounded"></div>
          <div class="h-16 bg-navy-700 rounded"></div>
        </div>
        <div v-for="i in 3" :key="i" class="h-20 bg-navy-700 rounded"></div>
      </div>
    </div>

    <div v-else-if="error" class="card p-8 text-center">
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>

    <template v-else>
      <div class="card p-6">
        <div class="flex items-center justify-between mb-5">
          <div>
            <h2 class="text-lg font-semibold text-white">Pagos</h2>
            <p v-if="store.registrationFee > 0" class="text-gray-500 text-xs mt-0.5">
              Inscripcion: ${{ formatMoney(store.registrationFee) }} por equipo
            </p>
          </div>
          <button @click="openCreatePayment()" class="btn-primary flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Registrar Pago
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div class="bg-navy-900 border border-navy-700 rounded-lg p-3">
            <p class="text-gray-500 text-xs mb-1">Total Recaudado</p>
            <p class="text-white font-bold text-lg">${{ formatMoney(totalCollected) }}</p>
          </div>
          <div class="bg-navy-900 border border-navy-700 rounded-lg p-3">
            <p class="text-gray-500 text-xs mb-1">Equipos Liquidados</p>
            <p class="text-white font-bold text-lg">
              {{ settledCount }}
              <span class="text-gray-500 font-normal text-sm">/ {{ activeTeams.length }}</span>
            </p>
          </div>
          <div class="bg-navy-900 border border-navy-700 rounded-lg p-3">
            <p class="text-gray-500 text-xs mb-1">Cobranza</p>
            <div class="flex items-center gap-2">
              <p class="text-white font-bold text-lg">{{ collectionPercent }}%</p>
              <div class="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="collectionPercent >= 100 ? 'bg-green-500' : collectionPercent > 50 ? 'bg-gold-400' : 'bg-cardinal-500'"
                  :style="{ width: collectionPercent + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTeams.length === 0 && inactiveTeams.length === 0" class="text-center py-8">
          <div class="w-14 h-14 rounded-2xl bg-navy-700 flex items-center justify-center mx-auto mb-4">
            <svg class="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 class="text-white font-semibold mb-2">No hay equipos</h3>
          <p class="text-gray-500 text-sm">Agrega equipos a esta categoria para comenzar a registrar pagos.</p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="s in activeTeams"
            :key="s.team.id"
            class="bg-navy-900 border border-navy-700 rounded-lg overflow-hidden transition-all duration-200"
            :class="expandedTeamId === s.team.id ? 'ring-1 ring-navy-500' : 'hover:border-navy-500'"
          >
            <button
              class="w-full text-left p-4 flex items-center gap-3"
              @click="toggleExpand(s.team.id)"
            >
              <div
                v-if="s.team.logo_url"
                class="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-navy-700"
              >
                <img :src="s.team.logo_url" :alt="s.team.name" class="w-full h-full object-cover" />
              </div>
              <div
                v-else
                class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-400/10"
              >
                <span class="text-sm font-bold text-blue-400">
                  {{ s.team.name.charAt(0).toUpperCase() }}
                </span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-white font-medium text-sm truncate">{{ s.team.name }}</span>
                  <span
                    v-if="s.custom_fee !== null"
                    class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400 flex-shrink-0"
                  >
                    Cuota ajustada
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-navy-700 rounded-full overflow-hidden max-w-[200px]">
                    <div
                      class="h-full rounded-full transition-all duration-500"
                      :class="progressColor(s)"
                      :style="{ width: progressPercent(s) + '%' }"
                    ></div>
                  </div>
                  <span class="text-gray-500 text-xs flex-shrink-0">
                    ${{ formatMoney(s.total_paid) }} / ${{ formatMoney(s.effective_fee) }}
                  </span>
                </div>
              </div>

              <span
                class="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                :class="s.is_settled
                  ? 'bg-green-400/10 text-green-400'
                  : s.total_paid > 0
                    ? 'bg-gold-400/10 text-gold-400'
                    : 'bg-gray-500/10 text-gray-500'"
              >
                {{ s.is_settled ? 'Liquidado' : s.balance > 0 ? `Pendiente: $${formatMoney(s.balance)}` : 'Sin cuota' }}
              </span>

              <svg
                class="w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0"
                :class="expandedTeamId === s.team.id ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="expandedTeamId === s.team.id"
              class="border-t border-navy-700 px-4 pb-4"
            >
              <div class="flex items-center justify-between py-3">
                <div class="flex items-center gap-2">
                  <span :title="s.is_settled ? 'Este equipo ya liquidó su inscripción' : undefined">
                    <button
                      @click="openCreatePayment(s.team.id)"
                      :disabled="s.is_settled"
                      class="text-xs font-medium flex items-center gap-1 transition-colors"
                      :class="s.is_settled
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-cardinal-400 hover:text-cardinal-300'"
                    >
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Agregar Abono
                    </button>
                  </span>
                </div>
                <span :title="s.is_settled ? 'Este equipo ya liquidó su inscripción' : undefined">
                  <button
                    @click="openFeeModal(s)"
                    :disabled="s.is_settled"
                    class="text-xs font-medium flex items-center gap-1 transition-colors"
                    :class="s.is_settled
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-blue-400 hover:text-blue-300'"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Ajustar Cuota
                  </button>
                </span>
              </div>

              <div v-if="s.payments.length === 0" class="text-center py-4">
                <p class="text-gray-600 text-xs">No hay pagos registrados</p>
              </div>

              <table v-else class="w-full text-sm">
                <thead>
                  <tr class="text-gray-500 text-xs">
                    <th class="text-left font-medium pb-2">Fecha</th>
                    <th class="text-left font-medium pb-2">Monto</th>
                    <th class="text-left font-medium pb-2">Metodo</th>
                    <th class="text-left font-medium pb-2">Notas</th>
                    <th class="text-right font-medium pb-2 w-20"></th>
                  </tr>
                </thead>
                <tbody class="text-gray-300">
                  <tr
                    v-for="p in s.payments"
                    :key="p.id"
                    class="border-t border-navy-700/50"
                  >
                    <td class="py-2 text-xs">{{ p.payment_date }}</td>
                    <td class="py-2 text-xs font-medium text-white">${{ formatMoney(p.amount) }}</td>
                    <td class="py-2 text-xs">{{ p.payment_method || '-' }}</td>
                    <td class="py-2 text-xs text-gray-500 truncate max-w-[120px]">{{ p.notes || '-' }}</td>
                    <td class="py-2 text-right">
                      <div class="flex items-center justify-end gap-1">
                        <button
                          @click.stop="openEditPayment(p)"
                          class="p-1 rounded text-gray-500 hover:text-white hover:bg-navy-700 transition-colors"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          @click.stop="handleDeletePayment(p.id)"
                          class="p-1 rounded transition-colors"
                          :class="deleteConfirm === p.id ? 'text-red-400 bg-red-400/10' : 'text-gray-500 hover:text-red-400 hover:bg-navy-700'"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div v-if="inactiveTeams.length > 0" class="card p-6 opacity-60">
        <div class="flex items-center gap-2 mb-4">
          <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h3 class="text-gray-400 font-semibold text-sm">Equipos Inactivos</h3>
          <span class="text-gray-600 text-xs">({{ inactiveTeams.length }})</span>
        </div>

        <div class="space-y-2">
          <div
            v-for="s in inactiveTeams"
            :key="s.team.id"
            class="bg-navy-900/50 border border-navy-700/50 rounded-lg overflow-hidden"
          >
            <button
              class="w-full text-left p-4 flex items-center gap-3 cursor-pointer"
              @click="toggleExpand(s.team.id)"
            >
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-500/10"
              >
                <span class="text-sm font-bold text-gray-600">
                  {{ s.team.name.charAt(0).toUpperCase() }}
                </span>
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-gray-400 font-medium text-sm truncate">{{ s.team.name }}</span>
                  <span class="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-500 flex-shrink-0">
                    Inactivo
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1.5 bg-navy-700/50 rounded-full overflow-hidden max-w-[200px]">
                    <div
                      class="h-full rounded-full bg-gray-600"
                      :style="{ width: progressPercent(s) + '%' }"
                    ></div>
                  </div>
                  <span class="text-gray-600 text-xs flex-shrink-0">
                    ${{ formatMoney(s.total_paid) }} / ${{ formatMoney(s.effective_fee) }}
                  </span>
                </div>
              </div>

              <span class="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-500 flex-shrink-0">
                {{ s.is_settled ? 'Liquidado' : s.balance > 0 ? `Pendiente: $${formatMoney(s.balance)}` : 'Sin cuota' }}
              </span>

              <svg
                class="w-4 h-4 text-gray-600 transition-transform duration-200 flex-shrink-0"
                :class="expandedTeamId === s.team.id ? 'rotate-180' : ''"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-if="expandedTeamId === s.team.id"
              class="border-t border-navy-700/50 px-4 pb-4 pt-3"
            >
              <div v-if="s.payments.length === 0" class="text-center py-4">
                <p class="text-gray-600 text-xs">No hay pagos registrados</p>
              </div>

              <table v-else class="w-full text-sm">
                <thead>
                  <tr class="text-gray-600 text-xs">
                    <th class="text-left font-medium pb-2">Fecha</th>
                    <th class="text-left font-medium pb-2">Monto</th>
                    <th class="text-left font-medium pb-2">Metodo</th>
                    <th class="text-left font-medium pb-2">Notas</th>
                  </tr>
                </thead>
                <tbody class="text-gray-500">
                  <tr
                    v-for="p in s.payments"
                    :key="p.id"
                    class="border-t border-navy-700/30"
                  >
                    <td class="py-2 text-xs">{{ p.payment_date }}</td>
                    <td class="py-2 text-xs font-medium">${{ formatMoney(p.amount) }}</td>
                    <td class="py-2 text-xs">{{ p.payment_method || '-' }}</td>
                    <td class="py-2 text-xs truncate max-w-[120px]">{{ p.notes || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>

    <PaymentFormModal
      v-if="showPaymentModal"
      :teams="editingPayment ? allTeams : unsettledTeams"
      :payment="editingPayment"
      :preselected-team-id="preselectedTeamId"
      :loading="paymentLoading"
      :error="paymentError"
      @save="handleSavePayment"
      @close="showPaymentModal = false"
    />

    <TeamFeeModal
      v-if="showFeeModal && feeTeam"
      :team-name="feeTeam.team.name"
      :category-fee="store.registrationFee"
      :current-custom-fee="feeTeam.custom_fee"
      :loading="feeLoading"
      :error="feeError"
      @save="handleSaveFee"
      @reset="handleResetFee"
      @close="showFeeModal = false"
    />
  </div>
</template>
