import { createClient } from '@/lib/supabase/server'
import { getTemplates, getWorkers } from '@/app/actions/admin'
import { FairControlCenter } from '@/components/admin/FairControlCenter'
import { notFound } from 'next/navigation'

export default async function FairPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // 1. Get Fair details
  const { data: fair } = await supabase
    .from('fairs')
    .select('*, template:templates(*)')
    .eq('id', resolvedParams.id)
    .single()

  if (!fair) {
    notFound()
  }

  // 2. Get active assignments for this fair
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id, worker_id, template_id, start_time, end_time,
      workers(name),
      templates(name)
    `)
    .eq('fair_id', fair.id)
    .order('start_time', { ascending: false })

  const activeAssignments = assignments || []

  // 3. Get transactions for these assignments (since start of fair or today, let's get all for simplicity for this fair's active workers)
  // Actually, we should get transactions that belong to this fair.
  // The simplest way: fetch transactions whose worker_id is in activeAssignments and created_at > assignment.start_time
  // But for simple demo, just fetch all transactions for the workers in this fair where created_at > fair.start_date
  const assignmentIds = activeAssignments.map((a: any) => a.id)
  
  let transactions: any[] = []
  if (assignmentIds.length > 0) {
    const { data: txs } = await supabase
      .from('transactions')
      .select('*')
      .in('assignment_id', assignmentIds)
      .order('created_at', { ascending: false })
      
    // Map worker names to transactions
    transactions = txs?.map(tx => {
      const wName = (activeAssignments.find((a: any) => a.worker_id === tx.worker_id)?.workers as any)?.name || 'Bilinmiyor'
      return { ...tx, worker_name: wName }
    }) || []
  }

  // 4. Get templates and all workers for the "Add Worker" dialog
  const [templatesRes, workersRes] = await Promise.all([
    getTemplates(),
    getWorkers()
  ])

  return (
    <FairControlCenter 
      fair={fair}
      initialAssignments={activeAssignments}
      templates={templatesRes.data || []}
      allWorkers={workersRes.data || []}
      initialTransactions={transactions}
    />
  )
}
