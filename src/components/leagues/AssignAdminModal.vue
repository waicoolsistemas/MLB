<script setup lang="ts">
import { ref } from 'vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

defineProps<{
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: { email: string; password: string; full_name: string }): void
  (e: 'close'): void
}>()

const fullName = ref('')
const email = ref('')
const password = ref('')
const errors = ref<{ fullName?: string; email?: string; password?: string }>({})

function validate(): boolean {
  errors.value = {}
  let valid = true

  if (fullName.value.trim().length < 2) {
    errors.value.fullName = 'El nombre debe tener al menos 2 caracteres'
    valid = false
  }
  if (!email.value.includes('@')) {
    errors.value.email = 'Ingresa un email valido'
    valid = false
  }
  if (password.value.length < 8) {
    errors.value.password = 'La contrasena debe tener al menos 8 caracteres'
    valid = false
  }

  return valid
}

function handleSubmit() {
  if (!validate()) return
  emit('save', {
    full_name: fullName.value.trim(),
    email: email.value.trim().toLowerCase(),
    password: password.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h2 class="text-lg font-bold text-white">Asignar Administrador</h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
        <p class="text-gray-400 text-sm">
          Se creara una nueva cuenta de administrador para esta liga.
        </p>

        <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-lg">
          {{ error }}
        </div>

        <BaseInput
          v-model="fullName"
          label="Nombre Completo"
          placeholder="Ej: Juan Perez"
          :error="errors.fullName"
        />

        <BaseInput
          v-model="email"
          label="Correo Electronico"
          type="email"
          placeholder="admin@liga.com"
          :error="errors.email"
        />

        <BaseInput
          v-model="password"
          label="Contrasena"
          type="password"
          placeholder="Minimo 8 caracteres"
          :error="errors.password"
        />

        <div class="flex gap-3 pt-2">
          <BaseButton variant="ghost" @click="emit('close')" class="flex-1">
            Cancelar
          </BaseButton>
          <BaseButton type="submit" :loading="loading" class="flex-1">
            Crear y Asignar
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
