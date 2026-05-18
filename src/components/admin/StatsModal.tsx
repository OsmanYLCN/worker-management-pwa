'use client'

import { useMemo, useState, useRef } from 'react'
import { X, Clock, TrendingUp, User, Package, Banknote, CreditCard, BarChart3, ChevronLeft, ChevronRight, CalendarDays, Wallet } from 'lucide-react'

interface StatsModalProps {
  open: boolean
  onClose: () => void
  fair: any
  assignments: any[]
  transactions: any[]
  initialFilterDate: string
  allWorkers: any[]
}

function toLocalDate(isoStr: string): string {
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayLocal(): string {
  return toLocalDate(new Date().toISOString())
}

/** Round to nearest 15 minutes (quarter hour) — same logic as AdminDashboardHub */
function roundToQuarterHour(hours: number): number {
  return Math.round(hours * 4) / 4
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0 && m === 0) return '0 dk'
  if (h === 0) return `${m} dk`
  if (m === 0) return `${h} sa`
  return `${h} sa ${m} dk`
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toLocalDate(d.toISOString())
}

function DonutChart({ nakit, iban }: { nakit: number; iban: number }) {
  const total = nakit + iban
  const r = 38
  const circ = 2 * Math.PI * r
  if (total === 0) {
    return (
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="16" />
        </svg>
        <div className="absolute text-center"><p className="text-xs text-zinc-500">Veri yok</p></div>
      </div>
    )
  }
  const nakitDash = (nakit / total) * circ
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="16" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#6366f1" strokeWidth="16"
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={0} strokeLinecap="round" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#10b981" strokeWidth="16"
          strokeDasharray={`${nakitDash} ${circ}`} strokeDashoffset={0} strokeLinecap="round" />
      </svg>
      <div className="absolute text-center">
        <p className="text-lg font-semibold text-zinc-100">{total.toLocaleString('tr-TR')}</p>
        <p className="text-[10px] text-zinc-500">₺ Toplam</p>
      </div>
    </div>
  )
}

export function StatsModal({ open, onClose, fair, assignments, transactions, initialFilterDate, allWorkers }: StatsModalProps) {
  const [filterDate, setFilterDate] = useState(initialFilterDate)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Sync when parent filter changes (e.g. user re-opens)
  // (initialFilterDate is only used as starting value; local state takes over)

  /** Worker hourly wage lookup */
  const workerWageMap = useMemo(() => {
    const map: Record<string, number> = {}
    allWorkers.forEach(w => { map[w.id] = Number(w.hourly_wage ?? 0) })
    return map
  }, [allWorkers])

  const filteredTx = useMemo(() => {
    if (filterDate === 'all') return transactions
    return transactions.filter(tx => toLocalDate(tx.created_at) === filterDate)
  }, [transactions, filterDate])

  const filteredAssignments = useMemo(() => {
    if (filterDate === 'all') return assignments
    return assignments.filter(a => {
      const startDate = toLocalDate(a.start_time)
      const endDate = a.end_time ? toLocalDate(a.end_time) : todayLocal()
      return startDate <= filterDate && endDate >= filterDate
    })
  }, [assignments, filterDate])

  /** Per-worker stats with rounding + earnings */
  const workerStats = useMemo(() => {
    const map: Record<string, {
      name: string; hourlyWage: number
      rawHours: number; roundedHours: number; earnings: number
      txCount: number; revenue: number; nakit: number; iban: number
      categories: Record<string, { category: string; count: number; total: number }>
    }> = {}

    filteredAssignments.forEach(a => {
      const wid = a.worker_id
      if (!map[wid]) {
        map[wid] = {
          name: a.workers?.name || 'Bilinmiyor',
          hourlyWage: workerWageMap[wid] || 0,
          rawHours: 0, roundedHours: 0, earnings: 0,
          txCount: 0, revenue: 0, nakit: 0, iban: 0, categories: {}
        }
      }

      // Clip hours to the selected day boundaries (local time)
      let start = new Date(a.start_time)
      let end = a.end_time ? new Date(a.end_time) : new Date()
      if (filterDate !== 'all') {
        const dayStart = new Date(filterDate + 'T00:00:00')
        const dayEnd   = new Date(filterDate + 'T23:59:59')
        if (start < dayStart) start = dayStart
        if (end   > dayEnd)   end   = dayEnd
      }
      const hrs = Math.max(0, (end.getTime() - start.getTime()) / 3600000)
      map[wid].rawHours += hrs
    })

    // Apply 15-min rounding + compute earnings
    Object.values(map).forEach(w => {
      w.roundedHours = roundToQuarterHour(w.rawHours)
      w.earnings = w.hourlyWage > 0 ? Math.round(w.roundedHours * w.hourlyWage) : 0
    })

    filteredTx.forEach(tx => {
      const wid = tx.worker_id
      if (!map[wid]) return
      map[wid].txCount++
      map[wid].revenue += Number(tx.amount)
      if (tx.payment_method === 'IBAN') map[wid].iban += Number(tx.amount)
      else map[wid].nakit += Number(tx.amount)
      const catRaw = tx.category || 'Genel'
      const cat = catRaw === 'Özel' ? 'Özel Satış' : catRaw
      if (!map[wid].categories[cat]) map[wid].categories[cat] = { category: cat, count: 0, total: 0 }
      map[wid].categories[cat].count++
      map[wid].categories[cat].total += Number(tx.amount)
    })

    return Object.values(map)
  }, [filteredAssignments, filteredTx, filterDate, workerWageMap])

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { category: string; count: number; nakit: number; iban: number; total: number }> = {
      'Boyama': { category: 'Boyama', count: 0, nakit: 0, iban: 0, total: 0 },
      'Peluş': { category: 'Peluş', count: 0, nakit: 0, iban: 0, total: 0 },
      'Balon': { category: 'Balon', count: 0, nakit: 0, iban: 0, total: 0 },
      'Taç': { category: 'Taç', count: 0, nakit: 0, iban: 0, total: 0 },
      'Özel Satış': { category: 'Özel Satış', count: 0, nakit: 0, iban: 0, total: 0 },
    }

    filteredTx.forEach(tx => {
      const catRaw = tx.category || 'Genel'
      const cat = catRaw === 'Özel' ? 'Özel Satış' : catRaw
      
      if (!map[cat]) map[cat] = { category: cat, count: 0, nakit: 0, iban: 0, total: 0 }
      
      map[cat].count++
      map[cat].total += Number(tx.amount)
      if (tx.payment_method === 'IBAN') map[cat].iban += Number(tx.amount)
      else map[cat].nakit += Number(tx.amount)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filteredTx])

  const totalRevenue  = filteredTx.reduce((s, t) => s + Number(t.amount), 0)
  const totalNakit    = filteredTx.filter(t => t.payment_method !== 'IBAN').reduce((s, t) => s + Number(t.amount), 0)
  const totalIban     = filteredTx.filter(t => t.payment_method === 'IBAN').reduce((s, t) => s + Number(t.amount), 0)
  const totalHours    = workerStats.reduce((s, w) => s + w.roundedHours, 0)
  const totalEarnings = workerStats.reduce((s, w) => s + w.earnings, 0)

  const dateLabel = filterDate === 'all'
    ? 'Tüm Zamanlar'
    : new Date(filterDate + 'T12:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl my-8 overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/60 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">{fair.name} — Detaylı İstatistikler</h2>
              <p className="text-xs text-zinc-500 mt-0.5">{dateLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Date Navigator ── */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-zinc-800/40 bg-zinc-900/20">
          <button
            onClick={() => setFilterDate(d => d === 'all' ? todayLocal() : addDays(d, -1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Calendar input (hidden, triggered by icon) */}
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date"
              value={filterDate === 'all' ? '' : filterDate}
              max={todayLocal()}
              onChange={e => e.target.value && setFilterDate(e.target.value)}
              className="absolute inset-0 opacity-0 w-full cursor-pointer"
            />
            <button
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
              {filterDate === 'all' ? 'Tüm Zamanlar' : new Date(filterDate + 'T12:00:00').toLocaleDateString('tr-TR')}
            </button>
          </div>

          <button
            onClick={() => setFilterDate(d => d === 'all' ? todayLocal() : addDays(d, 1))}
            disabled={filterDate !== 'all' && filterDate >= todayLocal()}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex gap-1 ml-auto">
            <button
              onClick={() => setFilterDate(todayLocal())}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterDate === todayLocal() ? 'bg-indigo-600 text-white' : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800'}`}
            >
              Bugün
            </button>
            <button
              onClick={() => setFilterDate('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filterDate === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800'}`}
            >
              Tümü
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">

          {/* ── KPI Row ── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Toplam Ciro',    value: `${totalRevenue.toLocaleString('tr-TR')} ₺`,   icon: TrendingUp,  color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/20' },
              { label: 'Nakit',          value: `${totalNakit.toLocaleString('tr-TR')} ₺`,     icon: Banknote,    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'IBAN',           value: `${totalIban.toLocaleString('tr-TR')} ₺`,      icon: CreditCard,  color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
              { label: 'Toplam Çalışma', value: formatHours(totalHours),                       icon: Clock,       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
              { label: 'Toplam Hakediş', value: totalEarnings > 0 ? `${totalEarnings.toLocaleString('tr-TR')} ₺` : '—', icon: Wallet, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
            ].map(kpi => (
              <div key={kpi.label} className={`p-3 rounded-2xl border ${kpi.bg}`}>
                <div className={`flex items-center gap-1.5 mb-1.5 ${kpi.color}`}>
                  <kpi.icon className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wider">{kpi.label}</span>
                </div>
                <p className={`text-base font-semibold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* ── Donut + Payment Breakdown ── */}
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-indigo-500 inline-block" />Ödeme Dağılımı
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <DonutChart nakit={totalNakit} iban={totalIban} />
              <div className="flex-1 space-y-3 w-full">
                {totalRevenue > 0 ? (
                  <>
                    {[
                      { label: 'Nakit', value: totalNakit, color: 'emerald', pct: (totalNakit / totalRevenue * 100).toFixed(1) },
                      { label: 'IBAN',  value: totalIban,  color: 'indigo',  pct: (totalIban  / totalRevenue * 100).toFixed(1) },
                    ].map(row => (
                      <div key={row.label} className={`flex items-center justify-between p-3 rounded-xl bg-${row.color}-500/10 border border-${row.color}-500/20`}>
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full bg-${row.color}-500`} />
                          <span className={`text-sm font-medium text-${row.color}-400`}>{row.label}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-base font-semibold text-${row.color}-400`}>{row.value.toLocaleString('tr-TR')} ₺</p>
                          <p className="text-[11px] text-zinc-500">%{row.pct}</p>
                        </div>
                      </div>
                    ))}
                    <div>
                      <div className="w-full h-2 rounded-full bg-indigo-500/30 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${(totalNakit / totalRevenue) * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-600 mt-1"><span>Nakit</span><span>IBAN</span></div>
                    </div>
                  </>
                ) : (
                  <p className="text-zinc-500 text-sm text-center py-4">Bu dönem için işlem yok.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Category Breakdown ── */}
          {categoryBreakdown.length > 0 && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-amber-500 inline-block" />Kategori Bazlı Satış
              </h3>
              <div className="space-y-2">
                {categoryBreakdown.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/40 hover:border-zinc-700/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <Package className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{p.category}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-emerald-500/70">{p.nakit.toLocaleString('tr-TR')} ₺ Nakit</span>
                          <span className="text-zinc-700 text-[10px]">|</span>
                          <span className="text-[11px] text-indigo-400/70">{p.iban.toLocaleString('tr-TR')} ₺ IBAN</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-semibold text-zinc-100">{p.total.toLocaleString('tr-TR')} ₺</p>
                      <p className="text-[11px] text-zinc-500">{p.count} adet</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Per-Worker Stats ── */}
          {workerStats.length > 0 && (
            <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-emerald-500 inline-block" />Çalışan Detayları
              </h3>
              <div className="space-y-4">
                {workerStats.map((w, i) => {
                  const workerPct = totalRevenue > 0 ? (w.revenue / totalRevenue * 100).toFixed(1) : '0'
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/50">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-zinc-100">{w.name}</p>
                            <p className="text-[11px] text-zinc-500">
                              Ciro katkısı: %{workerPct}
                              {w.hourlyWage > 0 && <span className="ml-2 text-zinc-600">· {w.hourlyWage} ₺/sa</span>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-400">{w.revenue.toLocaleString('tr-TR')} ₺</p>
                          <p className="text-[11px] text-zinc-500">{w.txCount} işlem</p>
                        </div>
                      </div>

                      {/* KPI grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                        <div className="p-2.5 rounded-xl bg-zinc-800/60 text-center">
                          <Clock className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                          <p className="text-sm font-semibold text-amber-400">{formatHours(w.roundedHours)}</p>
                          {w.rawHours !== w.roundedHours && (
                            <p className="text-[9px] text-zinc-600">({formatHours(w.rawHours)} → yuvarlandı)</p>
                          )}
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mt-0.5">Çalışma</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-800/60 text-center">
                          <Wallet className="w-3.5 h-3.5 text-violet-400 mx-auto mb-1" />
                          <p className="text-sm font-semibold text-violet-400">
                            {w.hourlyWage > 0 ? `${w.earnings.toLocaleString('tr-TR')} ₺` : '—'}
                          </p>
                          {w.hourlyWage > 0 && (
                            <p className="text-[9px] text-zinc-600">{w.roundedHours} sa × {w.hourlyWage} ₺</p>
                          )}
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mt-0.5">Hakediş</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-800/60 text-center">
                          <Banknote className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                          <p className="text-sm font-semibold text-emerald-400">{w.nakit.toLocaleString('tr-TR')} ₺</p>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mt-0.5">Nakit</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-zinc-800/60 text-center">
                          <CreditCard className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                          <p className="text-sm font-semibold text-blue-400">{w.iban.toLocaleString('tr-TR')} ₺</p>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-wider mt-0.5">IBAN</p>
                        </div>
                      </div>

                      {/* Sold categories */}
                      {Object.values(w.categories).length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Sattığı Kategoriler</p>
                          {(Object.values(w.categories) as any[]).sort((a, b) => b.total - a.total).map((catItem, j) => (
                            <div key={j} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800/30">
                              <span className="text-xs text-zinc-300">{catItem.category}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-zinc-500">{catItem.count} adet</span>
                                <span className="text-xs font-medium text-indigo-400">{catItem.total.toLocaleString('tr-TR')} ₺</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {workerStats.length === 0 && categoryBreakdown.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Bu dönem için istatistik verisi bulunmuyor.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
