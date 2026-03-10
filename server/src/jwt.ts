import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import type { JwtPayload } from './types.js'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'softball-access-secret-change-in-production'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'softball-refresh-secret-change-in-production'

export const ACCESS_TOKEN_EXPIRY = '15m'
export const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex')
}

export function getRefreshTokenExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS)
}
