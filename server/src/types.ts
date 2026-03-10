export type UserRole = 'super_admin' | 'admin' | 'manager' | 'player'

export interface User {
  id: string
  email: string
  password_hash: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PublicUser {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface RefreshToken {
  id: string
  user_id: string
  token: string
  expires_at: string
  revoked: boolean
  created_at: string
}

export interface JwtPayload {
  sub: string
  email: string
  role: string
  full_name: string
  iat?: number
  exp?: number
}

export interface League {
  id: string
  name: string
  description: string
  logo_url: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface LeagueAdmin {
  id: string
  league_id: string
  user_id: string
  is_active: boolean
  assigned_at: string
  assigned_by: string
}

export interface Season {
  id: string
  league_id: string
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  season_id: string
  name: string
  description: string
  registration_fee: number
  is_active: boolean
  fixture_generated: boolean
  created_at: string
  updated_at: string
}

export interface TeamFee {
  id: string
  team_id: string
  amount: number
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  team_id: string
  category_id: string
  amount: number
  payment_date: string
  payment_method: string
  notes: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Team {
  id: string
  category_id: string
  name: string
  logo_url: string
  manager_name: string
  is_active: boolean
  created_at: string
  updated_at: string
}
