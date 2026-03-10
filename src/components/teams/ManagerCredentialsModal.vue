<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from '@/components/BaseButton.vue'

defineProps<{
  email: string
  password: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const copied = ref(false)

function copyCredentials(email: string, password: string) {
  const text = `Email: ${email}\nContrasena: ${password}`
  navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70" @click="emit('close')"></div>
    <div class="relative w-full max-w-md bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-navy-700">
        <h2 class="text-lg font-bold text-white">Credenciales del Manager</h2>
        <button @click="emit('close')" class="text-gray-500 hover:text-white transition-colors">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-4">
        <div class="bg-gold-500/10 border border-gold-500/20 text-gold-400 text-sm px-4 py-3 rounded-lg flex items-start gap-2">
          <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Guarda estas credenciales. La contrasena no se puede recuperar, solo regenerar.</span>
        </div>

        <div class="space-y-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <div class="bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 text-white text-sm font-mono">
              {{ email }}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1">Contrasena</label>
            <div class="bg-navy-800 border border-navy-600 rounded-lg px-4 py-3 text-white text-sm font-mono">
              {{ password }}
            </div>
          </div>
        </div>

        <div class="flex gap-3 pt-2">
          <BaseButton
            variant="secondary"
            class="flex-1"
            @click="copyCredentials(email, password)"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {{ copied ? 'Copiado' : 'Copiar Credenciales' }}
          </BaseButton>
          <BaseButton @click="emit('close')" class="flex-1">
            Cerrar
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
