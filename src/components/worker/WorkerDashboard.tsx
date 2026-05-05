'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordTransaction, getTodayStats } from '@/app/actions/worker'
import { workerLogout } from '@/app/actions/auth'
import { SpecialSaleDialog } from '@/components/worker/SpecialSaleDialog'
import { Button } from '@/components/ui/button'
import { LogOut, ShoppingBag, Loader2, UserCircle2, Plus } from 'lucide-react'
import { toast } from 'sonner'

interface TemplateItem {
  id: string
  name: string
  price: number
}

interface WorkerDashboardProps {
  workerName: string
  assignment: any
  initialStats: { totalRevenue: number; totalCount: number }
  initialItemCounts?: Record<string, number>
}

export function WorkerDashboard({
  workerName,
  assignment,
  initialStats,
  initialItemCounts = {},
}: WorkerDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState(initialStats)
  // Local item counts — updated instantly on tap for snappy UX
  const [itemCounts, setItemCounts] = useState<Record<string, number>>(initialItemCounts)
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const templateItems: TemplateItem[] = assignment.template.items || []

  async function refreshStats() {
    const res = await getTodayStats(assignment.id)
    if (res.success && res.stats) {
      setStats(res.stats)
      if (res.itemCounts) setItemCounts(res.itemCounts)
    }
  }

  async function handleSaleClick(item: TemplateItem) {
    if (loadingItemId) return
    setLoadingItemId(item.id)

    // Haptic
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(50)

    // Optimistic update
    setItemCounts(prev => ({ ...prev, [item.name]: (prev[item.name] || 0) + 1 }))
    setStats(prev => ({ totalRevenue: prev.totalRevenue + item.price, totalCount: prev.totalCount + 1 }))

    const res = await recordTransaction(assignment.id, item.id, item.name, item.price)
    setLoadingItemId(null)

    if (res.success) {
      toast.success(`${item.name} eklendi`, { description: `+${item.price} ₺` })
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(100)
    } else {
      // Revert optimistic update on failure
      setItemCounts(prev => ({ ...prev, [item.name]: Math.max(0, (prev[item.name] || 1) - 1) }))
      setStats(prev => ({ totalRevenue: prev.totalRevenue - item.price, totalCount: prev.totalCount - 1 }))
      toast.error('Hata', { description: res.error })
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100])
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    await workerLogout()
    router.push('/worker-login')
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UserCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-zinc-100 truncate">{workerName}</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">{assignment.fair.name}</p>
          </div>
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-full"
        >
          {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
        </Button>
      </header>

      {/* Stats Board */}
      <div className="px-5 py-5 border-b border-zinc-900">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mb-1">Stand Ciro</p>
            <div className="text-4xl font-light text-zinc-100 tracking-tight">
              {stats.totalRevenue.toLocaleString('tr-TR')} <span className="text-xl text-zinc-600">₺</span>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider mb-1">Satış</p>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-medium text-sm">
              <ShoppingBag className="w-4 h-4" />
              {stats.totalCount}
            </div>
          </div>
        </div>
      </div>

      {/* Item List — Spreadsheet Style */}
      <main className="flex-1 p-4 flex flex-col gap-3">
        {/* Column header */}
        <div className="flex items-center px-4 py-1">
          <span className="flex-1 text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Ürün</span>
          <span className="w-20 text-center text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Fiyat</span>
          <span className="w-16 text-center text-[10px] font-medium text-zinc-600 uppercase tracking-widest">Adet</span>
          <span className="w-12" />
        </div>

        {templateItems.map((item) => {
          const count = itemCounts[item.name] || 0
          const isLoading = loadingItemId === item.id
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors"
            >
              {/* Item name + price */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-zinc-100 truncate">{item.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{item.price.toLocaleString('tr-TR')} ₺ / adet</p>
              </div>

              {/* Unit price badge */}
              <div className="w-20 text-center">
                <span className="text-sm font-medium text-zinc-400">{item.price} ₺</span>
              </div>

              {/* Count */}
              <div className="w-16 flex justify-center">
                {count > 0 ? (
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold text-base">
                    {count}
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-800/50 text-zinc-600 text-base">
                    0
                  </span>
                )}
              </div>

              {/* + Button */}
              <div className="w-12 flex justify-center">
                <button
                  onClick={() => handleSaleClick(item)}
                  disabled={isLoading}
                  className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    bg-indigo-600 hover:bg-indigo-500 active:scale-90
                    text-white transition-all duration-150
                    disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-[0_0_12px_-4px_rgba(99,102,241,0.6)]
                  `}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                  )}
                </button>
              </div>
            </div>
          )
        })}

        {/* Special Sale Row */}
        <div className="mt-2">
          <SpecialSaleDialog assignmentId={assignment.id} onSuccess={refreshStats} />
        </div>
      </main>
    </div>
  )
}
