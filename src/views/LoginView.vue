<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')

async function handleLogin() {
  auth.clearError()
  try {
    await auth.login({ email: email.value, password: password.value })
    router.push('/')
  } catch {}
}
</script>

<template>
  <AuthLayout>
    <h2 class="text-xl font-bold text-white mb-1">Bienvenido de nuevo</h2>
    <p class="text-gray-500 text-sm mb-6">Inicia sesion en tu cuenta para continuar</p>

    <div v-if="auth.error" class="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
      {{ auth.error }}
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <BaseInput
        v-model="email"
        label="Correo electronico"
        type="email"
        placeholder="tu@ejemplo.com"
      />
      <BaseInput
        v-model="password"
        label="Contrasena"
        type="password"
        placeholder="Ingresa tu contrasena"
      />

      <div class="pt-1">
        <BaseButton type="submit" :loading="auth.isLoading" :full-width="true">
          Iniciar Sesion
        </BaseButton>
      </div>
    </form>

    <p class="text-center text-gray-500 text-sm mt-6">
      No tienes una cuenta?
      <RouterLink to="/register" class="text-cardinal-400 hover:text-cardinal-300 font-medium ml-1 transition-colors">
        Crear una
      </RouterLink>
    </p>
  </AuthLayout>
</template>
