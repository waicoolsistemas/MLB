import api from './api'

export interface LoginPayload {
  email: string
  password: string
}

export type UserRole = 'super_admin' | 'admin' | 'manager' | 'player'

export interface RegisterPayload {
  email: string
  password: string
  full_name: string
  role?: 'manager' | 'player'
}

export interface AuthUser {
  id: string
  email: string
  full_name: string
  role: UserRole
}

export interface AuthResponse {
  user: AuthUser
  access_token: string
  refresh_token: string
}

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/api/auth/login', payload)
    return data
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const { data } = await api.post<AuthResponse>('/api/auth/register', payload)
    return data
  },

  async logout(refreshToken: string): Promise<void> {
    await api.post('/api/auth/logout', { refresh_token: refreshToken })
  },

  async getMe(): Promise<AuthUser> {
    const { data } = await api.get<{ user: AuthUser }>('/api/auth/me')
    return data.user
  },
}
