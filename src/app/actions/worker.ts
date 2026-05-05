'use server'

import { createClient } from '@/lib/supabase/server'
import { getWorkerSession } from '@/lib/auth'

export async function getActiveAssignment() {
  const workerSession = await getWorkerSession()
  if (!workerSession) {
    return { success: false, error: 'Oturum bulunamadı' }
  }

  const supabase = await createClient()

  // Find active assignment (end_time is null or in the future)
  const { data: assignment, error } = await supabase
    .from('assignments')
    .select(`
      id,
      start_time,
      end_time,
      fair:fairs(id, name),
      template:templates(id, name, items)
    `)
    .eq('worker_id', workerSession.worker.id)
    .is('end_time', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !assignment) {
    return { success: false, error: 'Aktif bir fuar görevlendirmeniz bulunmamaktadır.' }
  }

  return { success: true, assignment }
}

export async function recordTransaction(
  assignmentId: string,
  itemId: string,
  itemName: string,
  amount: number,
  description?: string
) {
  const workerSession = await getWorkerSession()
  if (!workerSession) {
    return { success: false, error: 'Oturum bulunamadı' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('transactions')
    .insert({
      assignment_id: assignmentId,
      worker_id: workerSession.worker.id,
      item_id: itemId,
      item_name: itemName,
      amount: amount,
      description: description || null
    })

  if (error) {
    console.error('Transaction Error:', error)
    return { success: false, error: 'Satış kaydedilirken bir hata oluştu' }
  }

  return { success: true }
}

export async function getTodayStats(assignmentId: string) {
  const workerSession = await getWorkerSession()
  if (!workerSession) {
    return { success: false, error: 'Oturum bulunamadı' }
  }

  const supabase = await createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, item_name')
    .eq('assignment_id', assignmentId)
    .eq('worker_id', workerSession.worker.id)
    .gte('created_at', today.toISOString())

  if (error) {
    return { success: false, error: 'İstatistikler alınamadı' }
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalCount = transactions.length

  // Per-item count: { 'Yüz Boyası': 3, 'El Boyası': 1, ... }
  const itemCounts: Record<string, number> = {}
  for (const tx of transactions) {
    itemCounts[tx.item_name] = (itemCounts[tx.item_name] || 0) + 1
  }

  return { success: true, stats: { totalRevenue, totalCount }, itemCounts }
}
