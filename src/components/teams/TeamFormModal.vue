<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Team } from '@/services/leagueService'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'

const props = defineProps<{
  team?: Team | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  (e: 'save', data: { name: string; logo_url?: string; manager_name?: string; manager_phone?: string; manager_email?: string; is_active?: boolean }): void
  (e: 'close'): void
}>()

const name = ref(props.team?.name || '')
const logoUrl = ref(props.team?.logo_url || '')
const managerName = ref(props.team?.manager_name || '')
const managerPhone = ref(props.team?.manager_phone || '')
const managerEmail = ref(props.team?.manager_email || '')
const isActive = ref(props.team?.is_active ?? true)
const nameError = ref('')
const emailError = ref('')

watch(() => props.team, (val) => {
  name.value = val?.name || ''
  logoUrl.value = val?.logo_url || ''
  managerName.value = val?.manager_name || ''
  managerPhone.value = val?.manager_phone || ''
  managerEmail.value = val?.manager_email || ''
  isActive.value = val?.is_active ?? true
})

function validate(): boolean {
  nameError.value = ''
  emailError.value = ''
  let valid = true
  if (name.value.trim().length < 2) {
    nameError.value = 'El nombre debe tener al menos 2 caracteres'
    valid = false
  }
  if (managerEmail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail.value.trim())) {
    emailError.value = 'Formato de email invalido'
    valid = false
  }
  return valid
}

function handleSubmit() {
  if (!validate()) return

  const payload: { name: string; logo_url?: string; manager_name?: string; manager_phone?: string; manager_email?: string; is_active?: boolean } = {
    name: name.value.trim(),
    logo_url: logoUrl.value.trim(),
    manager_name: managerName.value.trim(),
    manager_phone: managerPhone.value.trim(),
  }

  if (!props.team) {
    payload.manager_email = managerEmail.value.trim()
  }

  if (props.team) {
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
          {{ team ? 'Editar Equipo' : 'Nuevo Equipo' }}
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
          label="Nombre del Equipo"
          placeholder="Ej: Tigres del Norte"
          :error="nameError"
        />

        <BaseInput
          v-model="logoUrl"
          label="URL del Logo"
          placeholder="https://ejemplo.com/logo.png (opcional)"
        />

        <BaseInput
          v-model="managerName"
          label="Manager / Director Tecnico"
          placeholder="Nombre del manager (opcional)"
        />

        <BaseInput
          v-model="managerPhone"
          label="Telefono del Manager"
          type="tel"
          placeholder="10 digitos (opcional)"
        />

        <template v-if="!team">
          <div class="border-t border-navy-700 pt-4">
            <p class="text-xs text-gray-500 mb-3">Si proporcionas un email, se creara una cuenta de manager con acceso de solo lectura.</p>
            <BaseInput
              v-model="managerEmail"
              label="Email del Manager (Portal)"
              type="email"
              placeholder="manager@ejemplo.com (opcional)"
              :error="emailError"
            />
          </div>
        </template>

        <template v-if="team && team.manager_email">
          <div class="border-t border-navy-700 pt-4">
            <label class="block text-sm font-medium text-gray-300 mb-1">Email del Manager (Portal)</label>
            <div class="bg-navy-700/50 border border-navy-600 rounded-lg px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
              <svg class="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {{ team.manager_email }}
            </div>
          </div>
        </template>

        <div v-if="team" class="flex items-center justify-between py-2">
          <label class="text-sm font-medium text-gray-300">Equipo Activo</label>
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
            {{ team ? 'Guardar Cambios' : 'Crear Equipo' }}
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
