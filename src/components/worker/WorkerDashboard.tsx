'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recordTransaction, getTodayStats } from '@/app/actions/worker'
import { workerLogout } from '@/app/actions/auth'
import { SpecialSaleDialog } from '@/components/worker/SpecialSaleDialog'
import { Button } from '@/components/ui/button'
import { LogOut, ShoppingBag, Loader2, UserCircle2, Plus, Clock, Store, CreditCard, Banknote as BanknoteIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'

interface TemplateItem {
  id: string
  name: string
  price: number
  category?: string
}

interface WorkerDashboardProps {
  workerName: string
  assignment: any
  availableStands?: any[]
  initialStats: { totalRevenue: number; totalCount: number }
  initialItemCounts?: Record<string, number>
}

export function WorkerDashboard({
  workerName,
  assignment,
  availableStands = [],
  initialStats,
  initialItemCounts = {},
}: WorkerDashboardProps) {
  const router = useRouter()
  const [stats, setStats] = useState(initialStats)
  // Local item counts — updated instantly on tap for snappy UX
  const [itemCounts, setItemCounts] = useState<Record<string, number>>(initialItemCounts)
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [startingStandId, setStartingStandId] = useState<string | null>(null)
  
  // Payment Popup State
  const [paymentItem, setPaymentItem] = useState<TemplateItem | null>(null)

  const templateItems: TemplateItem[] = assignment?.fair?.template?.items || assignment?.template?.items || []

  async function refreshStats() {
    const res = await getTodayStats(assignment.id)
    if (res.success && res.stats) {
      setStats(res.stats)
      if (res.itemCounts) setItemCounts(res.itemCounts)
    }
  }

  async function handleSaleClick(item: TemplateItem) {
    if (loadingItemId) return
    // Show payment pop-up instead of immediate recording
    setPaymentItem(item)
    if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(50)
  }

  async function handleConfirmSale(method: 'Nakit' | 'IBAN') {
    if (!paymentItem) return
    const item = paymentItem
    setPaymentItem(null)
    setLoadingItemId(item.id)

    // Optimistic update
    setItemCounts(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))
    setStats(prev => ({ totalRevenue: prev.totalRevenue + item.price, totalCount: prev.totalCount + 1 }))

    const res = await recordTransaction(assignment.id, item.id, item.name, item.price, method, item.category || 'Genel')
    setLoadingItemId(null)

    if (res.success) {
      toast.success(`${item.name} (${method}) eklendi`, { description: `+${item.price} ₺` })
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate(100)
    } else {
      // Revert optimistic update on failure
      setItemCounts(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 1) - 1) }))
      setStats(prev => ({ totalRevenue: prev.totalRevenue - item.price, totalCount: prev.totalCount - 1 }))
      toast.error('Hata', { description: res.error })
      if (typeof window !== 'undefined' && navigator.vibrate) navigator.vibrate([100, 50, 100])
    }
  }

  async function handleStartShift(standId: string, templateId: string) {
    if (!templateId) {
      toast.error('Bu stantta bir satış çizelgesi (şablon) tanımlı değil.')
      return
    }
    setStartingStandId(standId)
    const { startAssignment } = await import('@/app/actions/worker')
    const res = await startAssignment(standId, templateId)
    setStartingStandId(null)
    if (res.success) {
      toast.success('Mesai başladı!')
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  async function handleEndShift() {
    if (!confirm('Mesaiyi bitirmek istediğinize emin misiniz?')) return
    setIsLoggingOut(true) // To show loading state
    const { endAssignmentWorker } = await import('@/app/actions/worker')
    const res = await endAssignmentWorker(assignment.id)
    setIsLoggingOut(false)
    if (res.success) {
      toast.success('Mesai bitti.')
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true)
    await workerLogout()
    router.push('/worker-login')
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col selection:bg-indigo-500/30">
        <header className="bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-900 sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <UserCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-medium text-zinc-100 truncate">{workerName}</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest truncate">Stant Seçimi</p>
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

        <main className="flex-1 p-5 flex flex-col gap-4">
          <h2 className="text-lg font-medium text-zinc-100 flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-indigo-400" />
            Aktif Stantlar
          </h2>
          
          {availableStands.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-3xl p-8 text-center text-zinc-500">
              Şu anda açık stant bulunmuyor.
            </div>
          ) : (
            availableStands.map(stand => (
              <div key={stand.id} className="p-5 rounded-3xl bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700/60 transition-colors flex flex-col gap-4">
                <div>
                  <h3 className="text-xl font-medium text-zinc-100">{stand.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    {stand.template ? `Çizelge: ${stand.template.name}` : 'Çizelge atanmamış'}
                  </p>
                </div>
                <Button 
                  onClick={() => handleStartShift(stand.id, stand.template_id)}
                  disabled={startingStandId === stand.id || !stand.template_id}
                  className="w-full h-12 rounded-xl text-md font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]"
                >
                  {startingStandId === stand.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Mesaiyi Başlat'}
                </Button>
              </div>
            ))
          )}
        </main>
      </div>
    )
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
          onClick={handleEndShift}
          disabled={isLoggingOut}
          className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-full"
          title="Mesaiyi Bitir"
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
          const count = itemCounts[item.id] || 0
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

        <div className="mt-2">
          <SpecialSaleDialog assignmentId={assignment.id} onSuccess={refreshStats} />
        </div>
      </main>

      {/* Payment Method Pop-up */}
      <Dialog open={!!paymentItem} onOpenChange={(open) => !open && setPaymentItem(null)}>
        <DialogContent className="sm:max-w-xs rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 p-0 overflow-hidden">
          <div className="p-6 text-center border-b border-zinc-800/60 bg-zinc-900/30">
            <h3 className="text-xl font-medium text-zinc-100">{paymentItem?.name}</h3>
            <p className="text-sm text-zinc-400 mt-1">{paymentItem?.price} ₺</p>
          </div>
          <div className="flex p-4 gap-4">
            <Button
              className="flex-1 h-16 flex flex-col gap-1 items-center justify-center rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100"
              onClick={() => handleConfirmSale('Nakit')}
            >
              <BanknoteIcon className="w-5 h-5 text-emerald-400" />
              <span>Nakit</span>
            </Button>
            <Button
              className="flex-1 h-16 flex flex-col gap-1 items-center justify-center rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100"
              onClick={() => handleConfirmSale('IBAN')}
            >
              <CreditCard className="w-5 h-5 text-indigo-400" />
              <span>IBAN</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
