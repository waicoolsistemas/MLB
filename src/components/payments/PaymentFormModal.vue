<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Team, Payment } from '@/services/leagueService'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  teams: Team[]
  payment?: Payment | null
  preselectedTeamId?: string | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: { team_id: string; amount: number; payment_date?: string; payment_method?: string; notes?: string }): void
  (e: 'close'): void
}>()

const teamId = ref(props.payment?.team_id || props.preselectedTeamId || '')
const amount = ref(props.payment?.amount?.toString() || '')
const paymentDate = ref(props.payment?.payment_date || new Date().toISOString().split('T')[0])
const paymentMethod = ref(props.payment?.payment_method || '')
const notes = ref(props.payment?.notes || '')

const teamError = ref('')
const amountError = ref('')

const activeTeams = computed(() => props.teams.filter(t => t.is_active))

const methods = [
  { value: '', label: 'Seleccionar...' },
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Transferencia', label: 'Transferencia' },
  { value: 'Deposito', label: 'Deposito' },
  { value: 'Otro', label: 'Otro' },
]

watch(() => props.payment, (val) => {
  teamId.value = val?.team_id || props.preselectedTeamId || ''
  amount.value = val?.amount?.toString() || ''
  paymentDate.value = val?.payment_date || new Date().toISOString().split('T')[0]
  paymentMethod.value = val?.payment_method || ''
  notes.value = val?.notes || ''
})

function validate(): boolean {
  teamError.value = ''
  amountError.value = ''
  let valid = true

  if (!props.payment && !teamId.value) {
    teamError.value = 'Selecciona un equipo'
    valid = false
  }

  const num = parseFloat(amount.value)
  if (isNaN(num) || num <= 0) {
    amountError.value = 'El monto debe ser mayor a 0'
    valid = false
  }

  return valid
}

function handleSubmit() {
  if (!validate()) return

  emit('save', {
    team_id: teamId.value,
    amount: parseFloat(amount.value),
    payment_date: paymentDate.value,
    payment_method: paymentMethod.value,
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h2 class="text-lg font-bold text-white">
          {{ payment ? 'Editar Pago' : 'Registrar Pago' }}
        </h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <div v-if="!payment" class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Equipo</label>
          <select
            v-model="teamId"
            class="input-field"
            :class="{ 'border-red-500 focus:border-red-500': teamError }"
          >
            <option value="" disabled>Seleccionar equipo...</option>
            <option v-for="t in activeTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
          <p v-if="teamError" class="text-red-400 text-xs">{{ teamError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Monto</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              v-model="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              class="input-field pl-8"
              :class="{ 'border-red-500 focus:border-red-500': amountError }"
            />
          </div>
          <p v-if="amountError" class="text-red-400 text-xs">{{ amountError }}</p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Fecha de Pago</label>
          <input
            v-model="paymentDate"
            type="date"
            class="input-field"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Metodo de Pago</label>
          <select v-model="paymentMethod" class="input-field">
            <option v-for="m in methods" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Notas</label>
          <textarea
            v-model="notes"
            placeholder="Notas opcionales"
            rows="2"
            class="input-field resize-none"
          ></textarea>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            {{ payment ? 'Guardar Cambios' : 'Registrar Pago' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
