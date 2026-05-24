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
      fair:fairs(id, name, template_id, template:templates(id, name, items))
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
  paymentMethod: string,
  category: string,
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
      payment_method: paymentMethod,
      category: category,
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

  // Bu assignment'ın ait olduğu fair_id'yi bul
  const { data: assignment } = await supabase
    .from('assignments')
    .select('fair_id')
    .eq('id', assignmentId)
    .single()

  if (!assignment) return { success: false, error: 'Assignment bulunamadı' }

  // Aynı stant'ta (fair_id) çalışan TÜM aktif assignment'ları bul
  const { data: fairAssignments } = await supabase
    .from('assignments')
    .select('id')
    .eq('fair_id', assignment.fair_id)
    .is('end_time', null)

  const allAssignmentIds = fairAssignments?.map(a => a.id) || [assignmentId]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Stanttaki TÜM çalışanların bugünkü işlemlerini çek (ortak kasa)
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select('amount, item_id')
    .in('assignment_id', allAssignmentIds)
    .gte('created_at', today.toISOString())

  if (error) {
    return { success: false, error: 'İstatistikler alınamadı' }
  }

  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount), 0)
  const totalCount = transactions.length

  const itemCounts: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.item_id) {
      itemCounts[tx.item_id] = (itemCounts[tx.item_id] || 0) + 1
    }
  }

  return { success: true, stats: { totalRevenue, totalCount }, itemCounts }
}

export async function getAllActiveStands() {
  const supabase = await createClient()

  // 1. Tüm aktif assignment'ları (end_time null) çalışan adlarıyla birlikte çek
  const { data: activeAssignments } = await supabase
    .from('assignments')
    .select('fair_id, workers(name)')
    .is('end_time', null)

  // 2. Tüm stantları çek (şimdi HEPSİ gösterilecek, aktif olanlar da)
  const { data: stands, error } = await supabase
    .from('fairs')
    .select(`
      id,
      name,
      template_id,
      template:templates(id, name, items)
    `)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: 'Stantlar alınamadı.' }

  // 3. Her stanta o anda içeride çalışanları ekle
  const standsWithWorkers = (stands || []).map(stand => {
    const activeWorkers = (activeAssignments || [])
      .filter(a => a.fair_id === stand.id)
      .map(a => (a.workers as any)?.name)
      .filter(Boolean)
    return { ...stand, activeWorkers }
  })

  return { success: true, stands: standsWithWorkers }
}

export async function startAssignment(fairId: string, templateId: string) {
  const workerSession = await getWorkerSession()
  if (!workerSession) return { success: false, error: 'Oturum bulunamadı' }

  const supabase = await createClient()

  // Kapatılmamış varsa kapat
  await supabase
    .from('assignments')
    .update({ end_time: new Date().toISOString() })
    .eq('worker_id', workerSession.worker.id)
    .is('end_time', null)

  const { error } = await supabase
    .from('assignments')
    .insert({
      worker_id: workerSession.worker.id,
      fair_id: fairId,
      template_id: templateId,
      start_time: new Date().toISOString()
    })

  if (error) return { success: false, error: 'Mesai başlatılamadı' }
  return { success: true }
}

export async function endAssignmentWorker(assignmentId: string) {
  const workerSession = await getWorkerSession()
  if (!workerSession) return { success: false, error: 'Oturum bulunamadı' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('assignments')
    .update({ end_time: new Date().toISOString() })
    .eq('id', assignmentId)
    .eq('worker_id', workerSession.worker.id)

  if (error) return { success: false, error: 'Mesai sonlandırılamadı' }
  return { success: true }
}
