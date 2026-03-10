import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken, requireRole } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const leagueSchema = z.object({
  name: z.string().min(3, 'League name must be at least 3 characters'),
  description: z.string().optional().default(''),
  logo_url: z.string().optional().default(''),
  sport_type: z.enum(['baseball', 'softball']),
})

const leagueUpdateSchema = z.object({
  name: z.string().min(3, 'League name must be at least 3 characters').optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
})

const assignAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
})

router.get('/my-league', authenticateToken, requireRole('admin', 'super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data, error } = await db.rpc('get_my_league', {
      p_user_id: req.user!.sub,
    })

    if (error) {
      if (error.message?.includes('NO_LEAGUE_ASSIGNED')) {
        return res.status(404).json({ error: 'No league assigned to this admin' })
      }
      if (error.message?.includes('LEAGUE_NOT_FOUND')) {
        return res.status(404).json({ error: 'League not found' })
      }
      throw error
    }

    return res.json({ league: data })
  } catch (err) {
    console.error('Get my league error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data: leagues, error } = await db
      .from('leagues')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const leaguesWithInfo = await Promise.all(
      (leagues || []).map(async (league) => {
        const { data: admin } = await db
          .from('league_admins')
          .select('user_id')
          .eq('league_id', league.id)
          .eq('is_active', true)
          .maybeSingle()

        let adminUser = null
        if (admin) {
          const { data: user } = await db
            .from('users')
            .select('id, email, full_name')
            .eq('id', admin.user_id)
            .maybeSingle()
          adminUser = user
        }

        const { count: seasonCount } = await db
          .from('seasons')
          .select('id', { count: 'exact', head: true })
          .eq('league_id', league.id)
          .eq('is_active', true)

        return {
          ...league,
          admin: adminUser,
          active_seasons_count: seasonCount || 0,
        }
      })
    )

    return res.json({ leagues: leaguesWithInfo })
  } catch (err) {
    console.error('List leagues error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:id', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data: league, error } = await db
      .from('leagues')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle()

    if (error) throw error
    if (!league) return res.status(404).json({ error: 'League not found' })

    const { data: adminRecord } = await db
      .from('league_admins')
      .select('*')
      .eq('league_id', league.id)
      .eq('is_active', true)
      .maybeSingle()

    let admin = null
    if (adminRecord) {
      const { data: user } = await db
        .from('users')
        .select('id, email, full_name, is_active, created_at')
        .eq('id', adminRecord.user_id)
        .maybeSingle()
      admin = user
    }

    const { data: seasons } = await db
      .from('seasons')
      .select('*')
      .eq('league_id', league.id)
      .order('created_at', { ascending: false })

    const seasonsWithCategories = await Promise.all(
      (seasons || []).map(async (season) => {
        const { data: categories } = await db
          .from('categories')
          .select('*')
          .eq('season_id', season.id)
          .order('name')

        const categoriesWithCount = await Promise.all(
          (categories || []).map(async (cat) => {
            const { count } = await db
              .from('teams')
              .select('id', { count: 'exact', head: true })
              .eq('category_id', cat.id)

            return { ...cat, teams_count: count || 0 }
          })
        )

        return { ...season, categories: categoriesWithCount }
      })
    )

    return res.json({
      league: {
        ...league,
        admin,
        seasons: seasonsWithCategories,
      },
    })
  } catch (err) {
    console.error('Get league error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const data = leagueSchema.parse(req.body)

    const { data: existing } = await db
      .from('leagues')
      .select('id')
      .eq('name', data.name)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ error: 'A league with this name already exists' })
    }

    const { data: league, error } = await db
      .from('leagues')
      .insert({
        name: data.name,
        description: data.description,
        logo_url: data.logo_url,
        sport_type: data.sport_type,
        created_by: req.user!.sub,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({ league })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create league error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/:id', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const data = leagueUpdateSchema.parse(req.body)

    const { data: existing } = await db
      .from('leagues')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'League not found' })

    if (data.name) {
      const { data: duplicate } = await db
        .from('leagues')
        .select('id')
        .eq('name', data.name)
        .neq('id', req.params.id)
        .maybeSingle()

      if (duplicate) {
        return res.status(409).json({ error: 'A league with this name already exists' })
      }
    }

    const { data: league, error } = await db
      .from('leagues')
      .update(data)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error

    return res.json({ league })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update league error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:id/logo', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data: league } = await db
      .from('leagues')
      .select('id, logo_url')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!league) return res.status(404).json({ error: 'League not found' })

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

    if (league.logo_url) {
      const oldPath = league.logo_url.split('/league-logos/')[1]?.split('?')[0]
      if (oldPath && oldPath !== filePath) {
        await db.storage.from('league-logos').remove([oldPath])
      }
    }

    const { error: uploadError } = await db.storage
      .from('league-logos')
      .upload(filePath, buffer, { contentType: content_type, upsert: true })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = db.storage.from('league-logos').getPublicUrl(filePath)
    const logoUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`

    const { data: updated, error: updateError } = await db
      .from('leagues')
      .update({ logo_url: logoUrl })
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.json({ league: updated })
  } catch (err) {
    console.error('Upload league logo error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:id/logo', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data: league } = await db
      .from('leagues')
      .select('id, logo_url')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!league) return res.status(404).json({ error: 'League not found' })

    if (league.logo_url) {
      const oldPath = league.logo_url.split('/league-logos/')[1]?.split('?')[0]
      if (oldPath) {
        await db.storage.from('league-logos').remove([oldPath])
      }
    }

    const { data: updated, error: updateError } = await db
      .from('leagues')
      .update({ logo_url: '' })
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    return res.json({ league: updated })
  } catch (err) {
    console.error('Delete league logo error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/:leagueId/admin', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const data = assignAdminSchema.parse(req.body)

    const { data: league } = await db
      .from('leagues')
      .select('id')
      .eq('id', req.params.leagueId)
      .maybeSingle()

    if (!league) return res.status(404).json({ error: 'League not found' })

    const { data: existingAdmin } = await db
      .from('league_admins')
      .select('id')
      .eq('league_id', req.params.leagueId)
      .eq('is_active', true)
      .maybeSingle()

    if (existingAdmin) {
      return res.status(409).json({ error: 'This league already has an admin assigned' })
    }

    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists' })
    }

    const password_hash = await bcrypt.hash(data.password, 12)

    const { data: newUser, error: userError } = await db
      .from('users')
      .insert({
        email: data.email,
        password_hash,
        full_name: data.full_name,
        role: 'admin',
      })
      .select('id, email, full_name, role')
      .single()

    if (userError) throw userError

    const { error: assignError } = await db
      .from('league_admins')
      .insert({
        league_id: req.params.leagueId,
        user_id: newUser.id,
        assigned_by: req.user!.sub,
      })

    if (assignError) throw assignError

    return res.status(201).json({ admin: newUser })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Assign admin error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.get('/:leagueId/admin', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data: adminRecord } = await db
      .from('league_admins')
      .select('*')
      .eq('league_id', req.params.leagueId)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRecord) return res.json({ admin: null })

    const { data: user } = await db
      .from('users')
      .select('id, email, full_name, is_active, created_at')
      .eq('id', adminRecord.user_id)
      .maybeSingle()

    return res.json({ admin: user })
  } catch (err) {
    console.error('Get league admin error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/:leagueId/admin', authenticateToken, requireRole('super_admin'), async (req: AuthRequest, res) => {
  try {
    const { data: adminRecord } = await db
      .from('league_admins')
      .select('id')
      .eq('league_id', req.params.leagueId)
      .eq('is_active', true)
      .maybeSingle()

    if (!adminRecord) {
      return res.status(404).json({ error: 'No active admin found for this league' })
    }

    await db
      .from('league_admins')
      .update({ is_active: false })
      .eq('id', adminRecord.id)

    return res.json({ message: 'Admin removed from league' })
  } catch (err) {
    console.error('Remove league admin error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
