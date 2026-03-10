import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const phoneRegex = /^\d{10}$/

const playerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  curp: z.string().optional().default(''),
  birth_date: z.string().nullable().optional(),
  phone: z.string().optional().default('').refine(
    (v) => v === '' || phoneRegex.test(v),
    { message: 'Phone must be 10 digits' }
  ),
})

const updatePlayerSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  curp: z.string().optional(),
  birth_date: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  phone: z.string().optional().refine(
    (v) => v === undefined || v === '' || phoneRegex.test(v),
    { message: 'Phone must be 10 digits' }
  ),
  photo_url: z.string().optional(),
})

async function canManageTeam(userId: string, role: string, teamId: string): Promise<{ allowed: boolean; team?: { category_id: string } }> {
  if (role === 'super_admin') {
    const { data: team } = await db
      .from('teams')
      .select('category_id')
      .eq('id', teamId)
      .maybeSingle()
    return { allowed: !!team, team: team || undefined }
  }

  if (role === 'manager') {
    const { data: team } = await db
      .from('teams')
      .select('category_id')
      .eq('id', teamId)
      .eq('manager_user_id', userId)
      .maybeSingle()
    return { allowed: !!team, team: team || undefined }
  }

  const { data: team } = await db
    .from('teams')
    .select('category_id')
    .eq('id', teamId)
    .maybeSingle()

  if (!team) return { allowed: false }

  const { data: category } = await db
    .from('categories')
    .select('season_id')
    .eq('id', team.category_id)
    .maybeSingle()

  if (!category) return { allowed: false }

  const { data: season } = await db
    .from('seasons')
    .select('league_id')
    .eq('id', category.season_id)
    .maybeSingle()

  if (!season) return { allowed: false }

  const { data: adminRecord } = await db
    .from('league_admins')
    .select('id')
    .eq('league_id', season.league_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return { allowed: !!adminRecord, team }
}

router.get('/teams/:teamId/players', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, req.params.teamId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: players, error } = await db
      .from('players')
      .select('*')
      .eq('team_id', req.params.teamId)
      .order('full_name')

    if (error) throw error

    return res.json({ players: players || [] })
  } catch (err) {
    console.error('List players error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/teams/:teamId/players', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, req.params.teamId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = playerSchema.parse(req.body)

    const { data: player, error } = await db
      .from('players')
      .insert({
        team_id: req.params.teamId,
        full_name: data.full_name,
        curp: data.curp,
        birth_date: data.birth_date || null,
        phone: data.phone,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({ player })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create player error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/players/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: existing } = await db
      .from('players')
      .select('team_id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Player not found' })

    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, existing.team_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = updatePlayerSchema.parse(req.body)

    const { data: updated, error } = await db
      .from('players')
      .update(data)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error

    return res.json({ player: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update player error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/players/:id/photo', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: existing } = await db
      .from('players')
      .select('team_id, photo_url')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Player not found' })

    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, existing.team_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { base64, content_type } = req.body
    if (!base64 || !content_type) {
      return res.status(400).json({ error: 'base64 and content_type are required' })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(content_type)) {
      return res.status(400).json({ error: 'Only JPEG, PNG and WebP images are allowed' })
    }

    const buffer = Buffer.from(base64, 'base64')
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be smaller than 2MB' })
    }

    const ext = content_type.split('/')[1] === 'jpeg' ? 'jpg' : content_type.split('/')[1]
    const filePath = `${req.params.id}.${ext}`

    if (existing.photo_url) {
      const oldPath = existing.photo_url.split('/player-photos/')[1]
      if (oldPath && oldPath !== filePath) {
        await db.storage.from('player-photos').remove([oldPath])
      }
    }

    const { error: uploadError } = await db.storage
      .from('player-photos')
      .upload(filePath, buffer, { contentType: content_type, upsert: true })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = db.storage.from('player-photos').getPublicUrl(filePath)

    const photoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

    const { data: updated, error: updateError } = await db
      .from('players')
      .update({ photo_url: photoUrl })
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.json({ player: updated })
  } catch (err) {
    console.error('Upload player photo error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

const parentSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional().default('').refine(
    (v) => v === '' || phoneRegex.test(v),
    { message: 'Phone must be 10 digits' }
  ),
  address: z.string().optional().default(''),
})

const updateParentSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  phone: z.string().optional().refine(
    (v) => v === undefined || v === '' || phoneRegex.test(v),
    { message: 'Phone must be 10 digits' }
  ),
  address: z.string().optional(),
})

router.get('/players/:playerId/parents', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: player } = await db
      .from('players')
      .select('team_id')
      .eq('id', req.params.playerId)
      .maybeSingle()

    if (!player) return res.status(404).json({ error: 'Player not found' })

    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, player.team_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: parents, error } = await db
      .from('player_parents')
      .select('*')
      .eq('player_id', req.params.playerId)
      .order('created_at')

    if (error) throw error

    return res.json({ parents: parents || [] })
  } catch (err) {
    console.error('List player parents error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/players/:playerId/parents', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: player } = await db
      .from('players')
      .select('team_id')
      .eq('id', req.params.playerId)
      .maybeSingle()

    if (!player) return res.status(404).json({ error: 'Player not found' })

    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, player.team_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = parentSchema.parse(req.body)

    const { data: parent, error } = await db
      .from('player_parents')
      .insert({
        player_id: req.params.playerId,
        full_name: data.full_name,
        phone: data.phone,
        address: data.address,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({ parent })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create player parent error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/parents/:parentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: existing } = await db
      .from('player_parents')
      .select('id, player_id')
      .eq('id', req.params.parentId)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Parent not found' })

    const { data: player } = await db
      .from('players')
      .select('team_id')
      .eq('id', existing.player_id)
      .maybeSingle()

    if (!player) return res.status(404).json({ error: 'Player not found' })

    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, player.team_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = updateParentSchema.parse(req.body)

    const { data: updated, error } = await db
      .from('player_parents')
      .update(data)
      .eq('id', req.params.parentId)
      .select('*')
      .single()

    if (error) throw error

    return res.json({ parent: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update player parent error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/parents/:parentId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: existing } = await db
      .from('player_parents')
      .select('id, player_id')
      .eq('id', req.params.parentId)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Parent not found' })

    const { data: player } = await db
      .from('players')
      .select('team_id')
      .eq('id', existing.player_id)
      .maybeSingle()

    if (!player) return res.status(404).json({ error: 'Player not found' })

    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, player.team_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { error } = await db
      .from('player_parents')
      .delete()
      .eq('id', req.params.parentId)

    if (error) throw error

    return res.json({ success: true })
  } catch (err) {
    console.error('Delete player parent error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/players/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: existing } = await db
      .from('players')
      .select('team_id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Player not found' })

    const { allowed } = await canManageTeam(req.user!.sub, req.user!.role, existing.team_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { error } = await db
      .from('players')
      .update({ is_active: false })
      .eq('id', req.params.id)

    if (error) throw error

    return res.json({ success: true })
  } catch (err) {
    console.error('Delete player error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
