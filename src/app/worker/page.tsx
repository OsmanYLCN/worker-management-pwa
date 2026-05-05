import { getActiveAssignment, getTodayStats } from '@/app/actions/worker'
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
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col selection:bg-indigo-500/30">
        {/* Header */}
        <header className="bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UserCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-medium text-zinc-100 truncate">Hoşgeldin, {workerName}</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Çalışan Paneli</p>
            </div>
          </div>
          <form action={workerLogout}>
            <button
              type="submit"
              className="flex items-center gap-2 text-zinc-500 hover:text-red-400 transition-colors px-3 py-2 rounded-full hover:bg-red-950/30"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </header>

        {/* No Assignment Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-3xl p-8 text-center space-y-5 backdrop-blur-md">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-zinc-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-medium text-zinc-100">Aktif Görev Yok</h2>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {error || 'Şu anda size atanmış aktif bir fuar görevlendirmesi bulunmamaktadır. Lütfen yöneticinizle iletişime geçin.'}
                </p>
              </div>
              <form action={workerLogout} className="pt-2">
                <button
                  type="submit"
                  className="w-full h-12 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all text-sm font-medium"
                >
                  Çıkış Yap
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const todayData = await getTodayStats(assignment.id)

  return (
    <WorkerDashboard
      workerName={workerName}
      assignment={assignment}
      initialStats={todayData.stats || { totalRevenue: 0, totalCount: 0 }}
      initialItemCounts={todayData.itemCounts || {}}
    />
  )
}
