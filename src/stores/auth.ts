import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authService, type AuthUser, type LoginPayload, type RegisterPayload } from '@/services/authService'
import { setAuthToken } from '@/services/api'
import { useMyLeagueStore } from '@/stores/myLeague'
import { useManagerStore } from '@/stores/manager'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(
    JSON.parse(localStorage.getItem('user') || 'null')
  )
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isManager = computed(() => user.value?.role === 'manager')

  function initializeToken() {
    const token = localStorage.getItem('access_token')
    if (token) {
      setAuthToken(token)
      accessToken.value = token
    }
  }

  function persistSession(token: string, refreshToken: string, userData: AuthUser) {
    accessToken.value = token
    user.value = userData
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    setAuthToken(token)
  }

  function clearSession() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setAuthToken(null)
  }

  async function login(payload: LoginPayload) {
    isLoading.value = true
    error.value = null
    try {
      const response = await authService.login(payload)
      persistSession(response.access_token, response.refresh_token, response.user)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      const serverMsg = e.response?.data?.error
      if (serverMsg === 'Invalid credentials') {
        error.value = 'Correo o contrasena incorrectos'
      } else if (serverMsg === 'Account is deactivated') {
        error.value = 'Tu cuenta ha sido desactivada'
      } else {
        error.value = serverMsg || 'Error al iniciar sesion'
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function register(payload: RegisterPayload) {
    isLoading.value = true
    error.value = null
    try {
      const response = await authService.register(payload)
      persistSession(response.access_token, response.refresh_token, response.user)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      const serverMsg = e.response?.data?.error
      if (serverMsg === 'Email already registered') {
        error.value = 'Este correo ya esta registrado'
      } else {
        error.value = serverMsg || 'Error al registrarse'
      }
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    const refreshToken = localStorage.getItem('refresh_token')
    try {
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch {
    } finally {
      clearSession()
      const myLeagueStore = useMyLeagueStore()
      myLeagueStore.clear()
      const managerStore = useManagerStore()
      managerStore.clear()
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    accessToken,
    isLoading,
    error,
    isAuthenticated,
    isSuperAdmin,
    isAdmin,
    isManager,
    initializeToken,
    login,
    register,
    logout,
    clearError,
  }
})
