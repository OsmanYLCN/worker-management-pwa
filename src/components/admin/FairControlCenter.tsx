'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addWorkerToFair, endAssignment, deleteLastTransaction } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Minus, Users, ArrowLeft, StopCircle, FileJson } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export function FairControlCenter({ 
  fair, 
  initialAssignments, 
  templates, 
  allWorkers,
  initialTransactions 
}: { 
  fair: any, 
  initialAssignments: any[], 
  templates: any[], 
  allWorkers: any[],
  initialTransactions: any[]
}) {
  const [assignments, setAssignments] = useState(initialAssignments)
  const [transactions, setTransactions] = useState(initialTransactions)

  const [addWorkerOpen, setAddWorkerOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [selectedWorkerId, setSelectedWorkerId] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  // Detay Modalı State'i
  const [selectedStandId, setSelectedStandId] = useState<string | null>(null)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)

  // Gerçek zamanlı saat
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Fuar aktif mi? event_date ve saat aralığına göre
  const fairStatus = useMemo(() => {
    if (!fair.event_date || !fair.start_time || !fair.end_time) return 'legacy'
    const dateStr = fair.event_date // 'YYYY-MM-DD'
    const startDt = new Date(`${dateStr}T${fair.start_time}:00`)
    const endDt = new Date(`${dateStr}T${fair.end_time}:00`)
    if (now < startDt) return 'upcoming'
    if (now > endDt) return 'ended'
    return 'live'
  }, [fair, now])

  const supabase = createClient()

  useEffect(() => {
    // Realtime Listener
    const fetchTransactionDetails = async (newTx: any) => {
      // Find if this transaction belongs to one of our active workers in this fair
      const activeWorkerIds = assignments.filter(a => !a.end_time).map(a => a.worker_id)
      
      if (activeWorkerIds.includes(newTx.worker_id)) {
        const mappedTx = { ...newTx }
        
        setTransactions((prev: any[]) => [mappedTx, ...prev])
        
        // Add a small vibration if on supported device
        if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    }

    const channel = supabase
      .channel(`public:transactions`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        fetchTransactionDetails(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, assignments])

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorkerId) {
      toast.error('Lütfen bir çalışan seçin.')
      return
    }
    if (!selectedTemplateId) {
      toast.error('Lütfen bir çizelge seçin.')
      return
    }

    setLoading(true)
    const res = await addWorkerToFair(fair.id, selectedTemplateId, { id: selectedWorkerId })
    setLoading(false)

    if (res.success) {
      toast.success('Çalışan fuara atandı!')
      setAddWorkerOpen(false)
      window.location.reload()
    } else {
      toast.error(res.error)
    }
  }

  const handleStopWorker = async (assignmentId: string) => {
    if (!confirm('Bu çalışanı sahadan çekmek istediğinize emin misiniz?')) return
    const res = await endAssignment(assignmentId)
    if (res.success) {
      toast.success('Çalışan sahadan çekildi.')
      setAssignments(prev => prev.map(a => a.id === assignmentId ? { ...a, end_time: new Date().toISOString() } : a))
    } else toast.error(res.error)
  }

  // Calculate Worker Stats
  const activeAssignments = useMemo(() => assignments.filter(a => !a.end_time), [assignments])
  
  const workerStats = useMemo(() => {
    return activeAssignments.map(assignment => {
      const workerTxs = transactions.filter(tx => tx.worker_id === assignment.worker_id)
      const totalRevenue = workerTxs.reduce((sum, tx) => sum + Number(tx.amount), 0)
      
      // Parse template items to create tallies
      // Assuming templates has the full object somewhere. Since we populated `templates(name)` we might not have `items`!
      // Wait, we need `items` from template! Let's get it from the full `templates` array passed as prop!
      const templateData = templates.find(t => t.id === assignment.template_id)
      const itemTallies = templateData?.items?.map((item: any) => {
        const count = workerTxs.filter(tx => tx.item_name === item.name).length
        return { name: item.name, price: item.price, count, total: count * item.price }
      }) || []

      return {
        ...assignment,
        totalRevenue,
        itemTallies,
        totalItemsSold: workerTxs.length,
        transactions: workerTxs
      }
    })
  }, [activeAssignments, transactions, templates])

  const totalFairRevenue = workerStats.reduce((sum, w) => sum + w.totalRevenue, 0)
  
  const selectedStand = workerStats.find(w => w.id === selectedStandId)

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-900">
        <div className="space-y-4">
          <Link href="/admin" className="inline-flex items-center text-zinc-500 hover:text-zinc-100 transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Fuarlara Dön
          </Link>
          <div>
            <h1 className="text-3xl md:text-5xl font-medium tracking-tight text-zinc-100">{fair.name}</h1>
            <div className="flex items-center gap-3 mt-3">
              {/* Gerçek zamanlı durum badge */}
              {fairStatus === 'live' && (
                <span className="flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2" />
                  CANLI
                </span>
              )}
              {fairStatus === 'upcoming' && (
                <span className="flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-2" />
                  BAŞLAMADI
                </span>
              )}
              {fairStatus === 'ended' && (
                <span className="flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-700/50 text-zinc-500 border border-zinc-700">
                  SONA EERDİ
                </span>
              )}
              {fairStatus === 'legacy' && (
                <span className="flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse mr-2" />
                  CANLI TAKİP
                </span>
              )}
              {/* Tarih/saat bilgisi */}
              {fair.event_date ? (
                <p className="text-zinc-500 text-sm">
                  {new Date(fair.event_date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {fair.start_time && <> &nbsp;·&nbsp; {fair.start_time.slice(0,5)} – {fair.end_time?.slice(0,5)}</>}
                </p>
              ) : (
                <p className="text-zinc-500 text-sm">
                  {fair.start_date ? new Date(fair.start_date).toLocaleDateString('tr-TR') : ''}
                  {fair.end_date ? ` - ${new Date(fair.end_date).toLocaleDateString('tr-TR')}` : ''}
                </p>
              )}
              {/* Saatlik güncellenen dijital saat */}
              <span className="text-zinc-600 text-xs font-mono">{now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>
        </div>

        <div className="text-left md:text-right">
          <p className="text-zinc-500 font-medium mb-1 text-sm uppercase tracking-wider">Fuar Cirosu</p>
          <div className="text-4xl md:text-5xl font-light text-zinc-100 tracking-tight">
            {totalFairRevenue.toLocaleString('tr-TR')} <span className="text-zinc-600">₺</span>
          </div>
        </div>
      </div>

      {/* Stand/Worker Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-500" />
            Aktif Standlar
          </h2>
          
          <Dialog open={addWorkerOpen} onOpenChange={setAddWorkerOpen}>
            <DialogTrigger render={<Button className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white h-10 px-5 shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all" />}>
              <Plus className="w-4 h-4 mr-2" /> Stand / Çalışan Ekle
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium">Sahaya Çalışan Sür</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddWorker} className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Sistemdeki Çalışan</Label>
                  <Select onValueChange={(val: any) => setSelectedWorkerId(val)}>
                    <SelectTrigger className="rounded-xl bg-zinc-900 border-zinc-800"><SelectValue placeholder="Çalışan seçin..." /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {allWorkers.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                  <Label className="text-indigo-400">Hangi Çizelge İle Satış Yapacak?</Label>
                  <Select onValueChange={(val: any) => setSelectedTemplateId(val)}>
                    <SelectTrigger className="rounded-xl bg-zinc-900 border-zinc-800"><SelectValue placeholder="Çizelge Seçin..." /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
                      {templates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-md font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all">
                  {loading ? 'Ekleniyor...' : 'Çalışanı Ata'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {workerStats.length === 0 ? (
          <div className="w-full py-24 flex flex-col items-center justify-center text-center bg-zinc-900/30 rounded-3xl border border-zinc-800/50 border-dashed">
            <Users className="w-12 h-12 text-zinc-700 mb-4" />
            <p className="text-zinc-400 text-lg">Sahada kimse yok.</p>
            <p className="text-zinc-600 text-sm mt-1">Sağ üstten bir çalışan ve stand ekleyin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {workerStats.map((worker) => (
              <div key={worker.id} className="relative group bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/60 overflow-hidden hover:border-zinc-700 transition-colors">
                {/* Worker Card Header */}
                <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/20 flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-medium text-zinc-100 mb-1">{worker.workers?.name}</h3>
                    <p className="text-xs text-zinc-500 flex items-center gap-1.5">
                      <FileJson className="w-3.5 h-3.5" /> {worker.templates?.name}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800" onClick={() => setSelectedStandId(worker.id)}>
                      İncele
                    </Button>
                    <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-full w-8 h-8" onClick={() => handleStopWorker(worker.id)} title="Standı Kapat">
                      <StopCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Worker Content (Tallies) */}
                <div className="p-6">
                  <div className="space-y-4">
                    {worker.itemTallies.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between group/item">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${item.count > 0 ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800 text-zinc-500'}`}>
                            {item.count}
                          </div>
                          <div>
                            <p className={`text-sm ${item.count > 0 ? 'text-zinc-200' : 'text-zinc-500'} transition-colors`}>{item.name}</p>
                            <p className="text-[10px] text-zinc-600">{item.price} ₺ / adet</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${item.count > 0 ? 'text-indigo-400' : 'text-zinc-600'} transition-colors`}>
                            {item.total.toLocaleString('tr-TR')} ₺
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Worker Footer */}
                <div className="p-6 bg-zinc-900/40 border-t border-zinc-800/60 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">Stand Cirosu</p>
                    <p className="text-2xl font-light text-zinc-100">{worker.totalRevenue.toLocaleString('tr-TR')} <span className="text-zinc-600 text-lg">₺</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-500 mb-0.5">İşlem</p>
                    <p className="text-zinc-300">{worker.totalItemsSold}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stand Detay Modalı */}
      <Dialog open={!!selectedStandId} onOpenChange={(open) => !open && setSelectedStandId(null)}>
        <DialogContent className="sm:max-w-2xl rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedStand && (() => {
            // Bugünün başlangıcı
            const todayStart = new Date(); todayStart.setHours(0,0,0,0)
            const todayTxs = selectedStand.transactions.filter(
              (tx: any) => new Date(tx.created_at) >= todayStart
            )
            // Bugünkü item sayımı
            const todayItemCounts: Record<string, number> = {}
            for (const tx of todayTxs) {
              todayItemCounts[tx.item_name] = (todayItemCounts[tx.item_name] || 0) + 1
            }
            const todayRevenue = todayTxs.reduce((s: number, t: any) => s + Number(t.amount), 0)

            const handleDelete = async (itemName: string) => {
              setDeletingItem(itemName)
              const res = await deleteLastTransaction(selectedStand.id, itemName)
              setDeletingItem(null)
              if (res.success) {
                // Remove the latest tx with this item_name from local state
                setTransactions((prev: any[]) => {
                  const idx = prev.findIndex(
                    (t) => t.assignment_id === selectedStand.id && t.item_name === itemName
                  )
                  if (idx === -1) return prev
                  const next = [...prev]
                  next.splice(idx, 1)
                  return next
                })
                toast.success(`${itemName} — son işlem silindi`)
              } else {
                toast.error(res.error)
              }
            }

            return (
              <>
                {/* Header */}
                <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/40">
                  <DialogTitle className="text-xl font-medium text-zinc-100 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </span>
                    {selectedStand.workers?.name}
                  </DialogTitle>
                  <div className="flex gap-6 mt-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Bugün Ciro</p>
                      <p className="text-lg font-medium text-indigo-400">{todayRevenue.toLocaleString('tr-TR')} ₺</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Bugün İşlem</p>
                      <p className="text-lg font-medium text-zinc-300">{todayTxs.length}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Toplam Ciro</p>
                      <p className="text-lg font-medium text-zinc-400">{selectedStand.totalRevenue.toLocaleString('tr-TR')} ₺</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {/* Çizelge */}
                  <div className="p-5 border-b border-zinc-800/60">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-3">Bugünkü Satışlar</p>
                    {/* Column labels */}
                    <div className="flex items-center px-3 mb-2">
                      <span className="flex-1 text-[10px] text-zinc-600 uppercase tracking-widest">Ürün</span>
                      <span className="w-20 text-center text-[10px] text-zinc-600 uppercase tracking-widest">Fiyat</span>
                      <span className="w-16 text-center text-[10px] text-zinc-600 uppercase tracking-widest">Adet</span>
                      <span className="w-12" />
                    </div>
                    <div className="space-y-2">
                      {selectedStand.itemTallies.map((item: any) => {
                        const todayCount = todayItemCounts[item.name] || 0
                        const isDeleting = deletingItem === item.name
                        return (
                          <div key={item.name} className="flex items-center gap-2 px-3 py-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-zinc-100 truncate">{item.name}</p>
                            </div>
                            <div className="w-20 text-center">
                              <span className="text-sm text-zinc-400">{item.price} ₺</span>
                            </div>
                            <div className="w-16 flex justify-center">
                              {todayCount > 0 ? (
                                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
                                  {todayCount}
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-zinc-800/40 text-zinc-600">
                                  0
                                </span>
                              )}
                            </div>
                            <div className="w-12 flex justify-center">
                              <button
                                onClick={() => handleDelete(item.name)}
                                disabled={isDeleting || todayCount === 0}
                                title="Son işlemi sil"
                                className="w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-800 hover:bg-red-950/60 hover:border-red-800/50 border border-zinc-700/50 text-zinc-500 hover:text-red-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* İşlem Logu */}
                  <div className="p-5 space-y-2">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-3">Tüm İşlem Logu</p>
                    {selectedStand.transactions.length === 0 ? (
                      <p className="text-zinc-600 text-center py-6">Henüz satış yapılmamış.</p>
                    ) : (
                      selectedStand.transactions.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40 hover:bg-zinc-900/70 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 shrink-0" />
                            <div>
                              <p className="text-sm text-zinc-200">{tx.item_name}</p>
                              <p className="text-[11px] text-zinc-600">
                                {new Date(tx.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                {' · '}
                                {new Date(tx.created_at).toLocaleDateString('tr-TR')}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-emerald-400">+{Number(tx.amount).toLocaleString('tr-TR')} ₺</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
