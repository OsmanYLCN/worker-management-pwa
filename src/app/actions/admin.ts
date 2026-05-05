'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// --- WORKERS ---
export async function getWorkers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function getWorkersWithStats() {
  const supabase = await createClient()

  const { data: workers, error } = await supabase
    .from('workers')
    .select(`
      id, name, pin, hourly_wage, is_active, created_at,
      assignments(
        id, start_time, end_time, is_paid,
        fairs(id, name, event_date, start_time, end_time),
        templates(id, name)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: workers }
}

export async function createWorker(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const pin = formData.get('pin') as string
  const hourly_wage = formData.get('hourly_wage') ? Number(formData.get('hourly_wage')) : null
  const fixed_salary = formData.get('fixed_salary') ? Number(formData.get('fixed_salary')) : null

  if (!name || !pin) return { success: false, error: 'İsim ve PIN zorunludur' }

  const { error } = await supabase
    .from('workers')
    .insert({ name, pin, hourly_wage, fixed_salary })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/admin')
  return { success: true }
}

export async function updateWorker(id: string, data: { name?: string; pin?: string; hourly_wage?: number | null }) {
  const supabase = await createClient()
  if (!id) return { success: false, error: 'ID eksik' }

  const { error } = await supabase
    .from('workers')
    .update(data)
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function toggleWorkerStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('workers')
    .update({ is_active: !currentStatus })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// --- TEMPLATES ---
export async function getTemplates() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function createTemplate(name: string, items: any[]) {
  const supabase = await createClient()
  if (!name || !items.length) return { success: false, error: 'İsim ve en az 1 ürün zorunludur' }

  const { error } = await supabase
    .from('templates')
    .insert({ name, items })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/admin')
  return { success: true }
}

export async function updateTemplate(id: string, name: string, items: any[]) {
  const supabase = await createClient()
  if (!id || !name || !items.length) return { success: false, error: 'Eksik bilgi' }

  const { error } = await supabase
    .from('templates')
    .update({ name, items })
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteTemplate(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}


// --- FAIRS ---
export async function getFairs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fairs')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function createFair(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const event_date = formData.get('event_date') as string
  const start_time = formData.get('start_time') as string
  const end_time = formData.get('end_time') as string

  if (!name || !event_date || !start_time || !end_time) return { success: false, error: 'Tüm alanlar zorunludur' }

  const { error } = await supabase
    .from('fairs')
    .insert({ name, event_date, start_time, end_time })

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

// --- ASSIGNMENTS ---
export async function getAssignments(workerId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('assignments')
    .select(`
      id, start_time, end_time,
      fairs(id, name),
      templates(id, name),
      workers(id, name)
    `)
    .order('start_time', { ascending: false })

  if (workerId) {
    query = query.eq('worker_id', workerId)
  }

  const { data, error } = await query
  
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function assignWorker(workerId: string, fairId: string, templateId: string) {
  const supabase = await createClient()
  
  // Önce aktif görevlendirmesi var mı kontrol et, varsa kapat
  await supabase
    .from('assignments')
    .update({ end_time: new Date().toISOString() })
    .eq('worker_id', workerId)
    .is('end_time', null)

  // Yeni görevlendirme ekle
  const { error } = await supabase
    .from('assignments')
    .insert({
      worker_id: workerId,
      fair_id: fairId,
      template_id: templateId,
      start_time: new Date().toISOString()
    })

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/admin')
  return { success: true }
}

export async function endAssignment(assignmentId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('assignments')
    .update({ end_time: new Date().toISOString() })
    .eq('id', assignmentId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function addWorkerToFair(fairId: string, templateId: string, workerData: { id?: string, name?: string, pin?: string }) {
  const supabase = await createClient()
  let finalWorkerId = workerData.id

  // Eğer yeni çalışan yaratılıyorsa
  if (!finalWorkerId && workerData.name && workerData.pin) {
    const { data: newWorker, error: wError } = await supabase
      .from('workers')
      .insert({ name: workerData.name, pin: workerData.pin })
      .select('id')
      .single()
      
    if (wError) return { success: false, error: wError.message }
    finalWorkerId = newWorker.id
  }

  if (!finalWorkerId) return { success: false, error: 'Çalışan bilgisi eksik.' }

  // Varsa eski görevini bitir
  await supabase
    .from('assignments')
    .update({ end_time: new Date().toISOString() })
    .eq('worker_id', finalWorkerId)
    .is('end_time', null)

  // Yeni fuara ata
  const { error: aError } = await supabase
    .from('assignments')
    .insert({
      worker_id: finalWorkerId,
      fair_id: fairId,
      template_id: templateId,
      start_time: new Date().toISOString()
    })

  if (aError) return { success: false, error: aError.message }
  
  revalidatePath(`/admin/fairs/${fairId}`)
  return { success: true }
}

export async function payWorker(workerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('assignments')
    .update({ is_paid: true })
    .eq('worker_id', workerId)
    .not('end_time', 'is', null) // sadece bitmiş görevler
    .eq('is_paid', false)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}

export async function deleteWorker(workerId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('workers')
    .delete()
    .eq('id', workerId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteLastTransaction(assignmentId: string, itemName: string) {
  const supabase = await createClient()

  // Find the most recent transaction for this item in this assignment
  const { data: tx, error: findError } = await supabase
    .from('transactions')
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('item_name', itemName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (findError || !tx) return { success: false, error: 'Silinecek işlem bulunamadı.' }

  const { error } = await supabase.from('transactions').delete().eq('id', tx.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin')
  return { success: true }
}
