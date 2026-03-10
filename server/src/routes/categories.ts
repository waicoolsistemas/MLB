import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional().default(''),
  registration_fee: z.number().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
})

async function canManageSeason(userId: string, role: string, seasonId: string): Promise<boolean> {
  if (role === 'super_admin') return true

  const { data: season } = await db
    .from('seasons')
    .select('league_id')
    .eq('id', seasonId)
    .maybeSingle()

  if (!season) return false

  const { data: adminRecord } = await db
    .from('league_admins')
    .select('id')
    .eq('league_id', season.league_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return !!adminRecord
}

router.get('/seasons/:seasonId/categories', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageSeason(req.user!.sub, req.user!.role, req.params.seasonId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: categories, error } = await db
      .from('categories')
      .select('*')
      .eq('season_id', req.params.seasonId)
      .order('name')

    if (error) throw error

    return res.json({ categories: categories || [] })
  } catch (err) {
    console.error('List categories error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/seasons/:seasonId/categories', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageSeason(req.user!.sub, req.user!.role, req.params.seasonId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = categorySchema.parse(req.body)

    const { data: category, error } = await db
      .from('categories')
      .insert({
        season_id: req.params.seasonId,
        name: data.name,
        description: data.description,
        registration_fee: data.registration_fee,
        is_active: data.is_active,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({ category })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create category error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/categories/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: category } = await db
      .from('categories')
      .select('season_id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!category) return res.status(404).json({ error: 'Category not found' })

    const allowed = await canManageSeason(req.user!.sub, req.user!.role, category.season_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = categorySchema.partial().parse(req.body)

    const { data: updated, error } = await db
      .from('categories')
      .update(data)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error

    return res.json({ category: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update category error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
