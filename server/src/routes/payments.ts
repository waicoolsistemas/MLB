import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import { authenticateToken } from '../middleware.js'
import type { AuthRequest } from '../middleware.js'

const router = Router()

const paymentSchema = z.object({
  team_id: z.string().uuid(),
  amount: z.number().positive('Amount must be greater than 0'),
  payment_date: z.string().optional(),
  payment_method: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})

const updatePaymentSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0').optional(),
  payment_date: z.string().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
})

const teamFeeSchema = z.object({
  amount: z.number().min(0, 'Amount must be 0 or greater'),
})

async function canManageCategory(userId: string, role: string, categoryId: string): Promise<boolean> {
  if (role === 'super_admin') return true

  const { data: category } = await db
    .from('categories')
    .select('season_id, seasons!inner(league_id)')
    .eq('id', categoryId)
    .maybeSingle()

  if (!category) return false

  const leagueId = (category.seasons as unknown as { league_id: string }).league_id

  const { data: adminRecord } = await db
    .from('league_admins')
    .select('id')
    .eq('league_id', leagueId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  return !!adminRecord
}

router.get('/categories/:categoryId/payments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { data: category } = await db
      .from('categories')
      .select('registration_fee')
      .eq('id', req.params.categoryId)
      .maybeSingle()

    if (!category) return res.status(404).json({ error: 'Category not found' })

    const { data: teams, error: teamsError } = await db
      .from('teams')
      .select('*')
      .eq('category_id', req.params.categoryId)
      .order('name')

    if (teamsError) throw teamsError

    const { data: payments, error: paymentsError } = await db
      .from('payments')
      .select('*')
      .eq('category_id', req.params.categoryId)
      .order('payment_date', { ascending: false })

    if (paymentsError) throw paymentsError

    const { data: teamFees, error: feesError } = await db
      .from('team_fees')
      .select('*')
      .in('team_id', (teams || []).map(t => t.id))

    if (feesError) throw feesError

    const feesMap = new Map((teamFees || []).map(f => [f.team_id, f]))
    const paymentsMap = new Map<string, typeof payments>()
    for (const p of (payments || [])) {
      if (!paymentsMap.has(p.team_id)) paymentsMap.set(p.team_id, [])
      paymentsMap.get(p.team_id)!.push(p)
    }

    const registrationFee = Number(category.registration_fee)

    const summary = (teams || []).map(team => {
      const teamPayments = paymentsMap.get(team.id) || []
      const customFee = feesMap.get(team.id)
      const effectiveFee = customFee ? Number(customFee.amount) : registrationFee
      const totalPaid = teamPayments.reduce((sum, p) => sum + Number(p.amount), 0)
      const balance = effectiveFee - totalPaid

      return {
        team,
        custom_fee: customFee ? Number(customFee.amount) : null,
        effective_fee: effectiveFee,
        payments: teamPayments,
        total_paid: totalPaid,
        balance: Math.max(0, balance),
        is_settled: totalPaid >= effectiveFee && effectiveFee > 0,
      }
    })

    return res.json({
      registration_fee: registrationFee,
      summary,
    })
  } catch (err) {
    console.error('List payments error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.post('/categories/:categoryId/payments', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const allowed = await canManageCategory(req.user!.sub, req.user!.role, req.params.categoryId)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = paymentSchema.parse(req.body)

    const { data: team } = await db
      .from('teams')
      .select('id')
      .eq('id', data.team_id)
      .eq('category_id', req.params.categoryId)
      .maybeSingle()

    if (!team) return res.status(404).json({ error: 'Team not found in this category' })

    const { data: payment, error } = await db
      .from('payments')
      .insert({
        team_id: data.team_id,
        category_id: req.params.categoryId,
        amount: data.amount,
        payment_date: data.payment_date || new Date().toISOString().split('T')[0],
        payment_method: data.payment_method,
        notes: data.notes,
        created_by: req.user!.sub,
      })
      .select('*')
      .single()

    if (error) throw error

    return res.status(201).json({ payment })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Create payment error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/payments/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: existing } = await db
      .from('payments')
      .select('category_id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Payment not found' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, existing.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = updatePaymentSchema.parse(req.body)

    const { data: updated, error } = await db
      .from('payments')
      .update(data)
      .eq('id', req.params.id)
      .select('*')
      .single()

    if (error) throw error

    return res.json({ payment: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Update payment error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/payments/:id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: existing } = await db
      .from('payments')
      .select('category_id')
      .eq('id', req.params.id)
      .maybeSingle()

    if (!existing) return res.status(404).json({ error: 'Payment not found' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, existing.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { error } = await db
      .from('payments')
      .delete()
      .eq('id', req.params.id)

    if (error) throw error

    return res.json({ success: true })
  } catch (err) {
    console.error('Delete payment error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.put('/teams/:teamId/fee', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: team } = await db
      .from('teams')
      .select('category_id')
      .eq('id', req.params.teamId)
      .maybeSingle()

    if (!team) return res.status(404).json({ error: 'Team not found' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, team.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const data = teamFeeSchema.parse(req.body)

    const { data: existing } = await db
      .from('team_fees')
      .select('id')
      .eq('team_id', req.params.teamId)
      .maybeSingle()

    let fee
    if (existing) {
      const { data: updated, error } = await db
        .from('team_fees')
        .update({ amount: data.amount })
        .eq('team_id', req.params.teamId)
        .select('*')
        .single()
      if (error) throw error
      fee = updated
    } else {
      const { data: created, error } = await db
        .from('team_fees')
        .insert({ team_id: req.params.teamId, amount: data.amount })
        .select('*')
        .single()
      if (error) throw error
      fee = created
    }

    return res.json({ fee })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: err.errors })
    }
    console.error('Set team fee error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

router.delete('/teams/:teamId/fee', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { data: team } = await db
      .from('teams')
      .select('category_id')
      .eq('id', req.params.teamId)
      .maybeSingle()

    if (!team) return res.status(404).json({ error: 'Team not found' })

    const allowed = await canManageCategory(req.user!.sub, req.user!.role, team.category_id)
    if (!allowed) return res.status(403).json({ error: 'Insufficient permissions' })

    const { error } = await db
      .from('team_fees')
      .delete()
      .eq('team_id', req.params.teamId)

    if (error) throw error

    return res.json({ success: true })
  } catch (err) {
    console.error('Remove team fee error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

