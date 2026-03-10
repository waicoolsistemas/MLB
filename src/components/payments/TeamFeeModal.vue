<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  teamName: string
  categoryFee: number
  currentCustomFee: number | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', amount: number): void
  (e: 'reset'): void
  (e: 'close'): void
}>()

const amount = ref((props.currentCustomFee ?? props.categoryFee).toString())
const amountError = ref('')

function validate(): boolean {
  amountError.value = ''
  const num = parseFloat(amount.value)
  if (isNaN(num) || num < 0) {
    amountError.value = 'El monto debe ser 0 o mayor'
    return false
  }
  return true
}

function handleSubmit() {
  if (!validate()) return
  emit('save', parseFloat(amount.value))
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-sm bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h2 class="text-lg font-bold text-white">Ajustar Cuota</h2>
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

        <div class="bg-navy-800 border border-navy-700 rounded-lg p-3">
          <p class="text-gray-400 text-xs mb-1">Equipo</p>
          <p class="text-white font-medium text-sm">{{ teamName }}</p>
        </div>

        <div class="bg-navy-800 border border-navy-700 rounded-lg p-3">
          <p class="text-gray-400 text-xs mb-1">Cuota de la categoria</p>
          <p class="text-gold-400 font-semibold text-sm">
            ${{ Number(categoryFee).toLocaleString('en-US', { minimumFractionDigits: 0 }) }}
          </p>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Cuota personalizada</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              v-model="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="input-field pl-8"
              :class="{ 'border-red-500 focus:border-red-500': amountError }"
            />
          </div>
          <p v-if="amountError" class="text-red-400 text-xs">{{ amountError }}</p>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton
            v-if="currentCustomFee !== null"
            variant="ghost"
            @click="emit('reset')"
            :loading="loading"
            class="flex-1 text-sm"
          >
            Restaurar
          </BaseButton>
          <BaseButton
            v-else
            variant="ghost"
            @click="emit('close')"
            class="flex-1"
          >
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            Guardar
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
