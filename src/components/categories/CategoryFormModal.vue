<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Category } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  category?: Category | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: { name: string; description?: string; registration_fee?: number; is_active?: boolean }): void
  (e: 'close'): void
}>()

const name = ref(props.category?.name || '')
const description = ref(props.category?.description || '')
const registrationFee = ref(props.category?.registration_fee?.toString() || '0')
const isActive = ref(props.category?.is_active ?? true)
const nameError = ref('')
const feeError = ref('')

watch(() => props.category, (val) => {
  name.value = val?.name || ''
  description.value = val?.description || ''
  registrationFee.value = val?.registration_fee?.toString() || '0'
  isActive.value = val?.is_active ?? true
})

function validate(): boolean {
  nameError.value = ''
  feeError.value = ''
  let valid = true
  if (name.value.trim().length < 2) {
    nameError.value = 'El nombre debe tener al menos 2 caracteres'
    valid = false
  }
  const fee = parseFloat(registrationFee.value)
  if (isNaN(fee) || fee < 0) {
    feeError.value = 'El monto debe ser 0 o mayor'
    valid = false
  }
  return valid
}

function handleSubmit() {
  if (!validate()) return

  const payload: { name: string; description?: string; registration_fee?: number; is_active?: boolean } = {
    name: name.value.trim(),
    description: description.value.trim(),
    registration_fee: parseFloat(registrationFee.value) || 0,
  }

  if (props.category) {
    payload.is_active = isActive.value
  }

  emit('save', payload)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h2 class="text-lg font-bold text-white">
          {{ category ? 'Editar Categoria' : 'Nueva Categoria' }}
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

        <BaseInput
          v-model="name"
          label="Nombre de la Categoria"
          placeholder="Ej: Categoria Alta"
          :error="nameError"
        />

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Descripcion</label>
          <textarea
            v-model="description"
            placeholder="Descripcion opcional de la categoria"
            rows="3"
            class="input-field resize-none"
          ></textarea>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-medium text-gray-300">Costo de Inscripcion</label>
          <div class="relative">
            <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              v-model="registrationFee"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              class="input-field pl-8"
              :class="{ 'border-red-500 focus:border-red-500': feeError }"
            />
          </div>
          <p v-if="feeError" class="text-red-400 text-xs">{{ feeError }}</p>
          <p class="text-gray-600 text-xs">Monto base que se aplica a todos los equipos de esta categoria</p>
        </div>

        <div v-if="category" class="flex items-center justify-between py-2">
          <label class="text-sm font-medium text-gray-300">Categoria Activa</label>
          <button
            type="button"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
            :class="isActive ? 'bg-green-500' : 'bg-navy-600'"
            @click="isActive = !isActive"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
              :class="isActive ? 'translate-x-6' : 'translate-x-1'"
            />
          </button>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            {{ category ? 'Guardar Cambios' : 'Crear Categoria' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
