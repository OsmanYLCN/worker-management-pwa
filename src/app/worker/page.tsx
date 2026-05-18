import { getActiveAssignment, getTodayStats, getAllActiveStands } from '@/app/actions/worker'
import { getWorkerSession } from '@/lib/auth'
import { WorkerDashboard } from '@/components/worker/WorkerDashboard'
import { workerLogout } from '@/app/actions/auth'
import { LogOut, AlertCircle, UserCircle2 } from 'lucide-react'

export default async function WorkerPage() {
  const session = await getWorkerSession()
  if (!session) {
    return null // Middleware handles redirect
  }

  const workerName = session.worker?.name ?? session.name ?? 'Çalışan'

  const { success, assignment, error } = await getActiveAssignment()

  if (!success || !assignment) {
    const { stands } = await getAllActiveStands()
    return (
      <WorkerDashboard
        workerName={workerName}
        assignment={null}
        availableStands={stands || []}
        initialStats={{ totalRevenue: 0, totalCount: 0 }}
        initialItemCounts={{}}
      />
    )
  }

  const todayData = await getTodayStats(assignment.id)

  return (
    <WorkerDashboard
      workerName={workerName}
      assignment={assignment}
      availableStands={[]}
      initialStats={todayData.stats || { totalRevenue: 0, totalCount: 0 }}
      initialItemCounts={todayData.itemCounts || {}}
    />
  )
}
