<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BaseInput from '@/components/BaseInput.vue'
import BaseButton from '@/components/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const fullName = ref('')
const email = ref('')
const password = ref('')
const role = ref<'manager' | 'player'>('player')

async function handleRegister() {
  auth.clearError()
  try {
    await auth.register({
      full_name: fullName.value,
      email: email.value,
      password: password.value,
      role: role.value,
    })
    router.push('/')
  } catch {}
}
</script>

<template>
  <AuthLayout>
    <h2 class="text-xl font-bold text-white mb-1">Crear una cuenta</h2>
    <p class="text-gray-500 text-sm mb-6">Unete al Sistema de Administracion de Liga de Softball</p>

    <div v-if="auth.error" class="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">
      {{ auth.error }}
    </div>

    <form @submit.prevent="handleRegister" class="space-y-4">
      <BaseInput
        v-model="fullName"
        label="Nombre completo"
        type="text"
        placeholder="Juan Perez"
      />
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
        placeholder="Min. 8 caracteres"
      />

      <div class="space-y-1.5">
        <label class="block text-sm font-medium text-gray-300">Rol</label>
        <select
          v-model="role"
          class="input-field"
        >
          <option value="player">Jugador</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      <div class="pt-1">
        <BaseButton type="submit" :loading="auth.isLoading" :full-width="true">
          Crear Cuenta
        </BaseButton>
      </div>
    </form>

    <p class="text-center text-gray-500 text-sm mt-6">
      Ya tienes una cuenta?
      <RouterLink to="/login" class="text-cardinal-400 hover:text-cardinal-300 font-medium ml-1 transition-colors">
        Iniciar sesion
      </RouterLink>
    </p>
  </AuthLayout>
</template>
