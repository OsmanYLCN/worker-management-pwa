'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  createFair, createTemplate, updateTemplate,
  deleteTemplate, createWorker, payWorker, deleteWorker, updateWorker
} from '@/app/actions/admin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Plus, Calendar, FileJson, ChevronRight,
  Trash2, Edit2, Users, Clock, Banknote, CheckCircle2, X, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

// ---------- helpers ----------
function calcWorkerPayment(worker: any) {
  const hourlyWage = Number(worker.hourly_wage ?? 0)
  const assignments: any[] = worker.assignments ?? []

  // sadece bitmiş + ödenmemiş görevler
  const unpaid = assignments.filter((a: any) => a.end_time && !a.is_paid)

  let totalMinutes = 0
  for (const a of unpaid) {
    const start = new Date(a.start_time).getTime()
    const end = new Date(a.end_time).getTime()
    totalMinutes += Math.max(0, (end - start) / 60000)
  }
  const totalHours = totalMinutes / 60
  const totalPayment = totalHours * hourlyWage

  return { totalHours: Math.round(totalHours * 10) / 10, totalPayment: Math.round(totalPayment) }
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} dk`
  if (m === 0) return `${h} sa`
  return `${h} sa ${m} dk`
}

// ---------- component ----------
export function AdminDashboardHub({
  fairs, templates, workers
}: {
  fairs: any[], templates: any[], workers: any[]
}) {
  const [fairOpen, setFairOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [workerOpen, setWorkerOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Worker detail & edit modals
  const [detailWorker, setDetailWorker] = useState<any | null>(null)
  const [editWorker, setEditWorker] = useState<any | null>(null)
  const [editName, setEditName] = useState('')
  const [editPin, setEditPin] = useState('')
  const [editWage, setEditWage] = useState('')

  // Template state
  const [templateItems, setTemplateItems] = useState([{ id: '1', name: '', price: 0 }])
  const [templateName, setTemplateName] = useState('')
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)

  // ---- Fair ----
  const handleCreateFair = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const res = await createFair(new FormData(e.currentTarget))
    setLoading(false)
    if (res.success) { toast.success('Fuar oluşturuldu!'); setFairOpen(false) }
    else toast.error(res.error)
  }

  // ---- Template ----
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = templateItems.filter(i => i.name.trim() !== '' && i.price > 0)
    if (!templateName || validItems.length === 0) {
      toast.error('İsim ve en az bir geçerli ürün giriniz.'); return
    }
    setLoading(true)
    const res = editingTemplateId
      ? await updateTemplate(editingTemplateId, templateName, validItems)
      : await createTemplate(templateName, validItems)
    setLoading(false)
    if (res.success) { toast.success(editingTemplateId ? 'Çizelge güncellendi!' : 'Çizelge oluşturuldu!'); resetTemplateForm() }
    else toast.error(res.error)
  }

  const resetTemplateForm = () => {
    setTemplateName(''); setTemplateItems([{ id: '1', name: '', price: 0 }])
    setEditingTemplateId(null); setTemplateOpen(false)
  }

  const openEditTemplate = (t: any) => {
    setTemplateName(t.name)
    setTemplateItems(t.items.map((i: any, idx: number) => ({ id: idx.toString(), name: i.name, price: i.price })))
    setEditingTemplateId(t.id); setTemplateOpen(true)
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Bu çizelgeyi silmek istediğinize emin misiniz?')) return
    const res = await deleteTemplate(id)
    if (res.success) toast.success('Çizelge silindi.'); else toast.error(res.error)
  }

  // ---- Worker ----
  const handleCreateWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    const res = await createWorker(new FormData(e.currentTarget))
    setLoading(false)
    if (res.success) { toast.success('Çalışan eklendi!'); setWorkerOpen(false) }
    else toast.error(res.error)
  }

  const handlePayWorker = async (workerId: string, workerName: string) => {
    if (!confirm(`${workerName} adlı çalışanın birikmiş ödemelerini ödendi olarak işaretlemek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return
    const res = await payWorker(workerId)
    if (res.success) toast.success('Ödeme yapıldı ve sıfırlandı!')
    else toast.error(res.error)
  }

  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (!confirm(`${workerName} adlı çalışanı silmek istediğinize emin misiniz? Tüm kayıtları silinecek.`)) return
    const res = await deleteWorker(workerId)
    if (res.success) toast.success('Çalışan silindi.')
    else toast.error(res.error)
  }

  const openEdit = (worker: any) => {
    setEditWorker(worker)
    setEditName(worker.name)
    setEditPin(worker.pin || '')
    setEditWage(worker.hourly_wage ? String(worker.hourly_wage) : '')
  }

  const handleUpdateWorker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editWorker) return
    setLoading(true)
    const res = await updateWorker(editWorker.id, {
      name: editName,
      pin: editPin,
      hourly_wage: editWage ? Number(editWage) : null,
    })
    setLoading(false)
    if (res.success) {
      toast.success('Çalışan güncellendi!')
      setEditWorker(null)
    } else toast.error(res.error)
  }

  const workerStats = useMemo(() =>
    workers.map(w => ({ ...w, ...calcWorkerPayment(w) })),
    [workers]
  )

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* FAIRS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-zinc-100 tracking-tight">Mevcut Fuarlar</h2>
          <Dialog open={fairOpen} onOpenChange={setFairOpen}>
            <DialogTrigger render={<Button className="rounded-full shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] bg-indigo-600 hover:bg-indigo-500 text-white transition-all h-10 px-5" />}>
              <Plus className="w-4 h-4 mr-2" /> Yeni Fuar
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium">Yeni Fuar Başlat</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateFair} className="space-y-5 mt-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Fuar Adı</Label>
                  <Input name="name" placeholder="Örn: İzmir Kitap Fuarı" required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Tarih</Label>
                  <Input name="event_date" type="date" required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 [color-scheme:dark]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Başlangıç Saati</Label>
                    <Input name="start_time" type="time" required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 [color-scheme:dark]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-400">Bitiş Saati</Label>
                    <Input name="end_time" type="time" required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 [color-scheme:dark]" />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl mt-4 h-12 text-md font-medium bg-indigo-600 hover:bg-indigo-500 text-white">
                  {loading ? 'Oluşturuluyor...' : 'Fuarı Oluştur'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {fairs.length === 0 ? (
            <div className="col-span-full p-12 text-center text-zinc-500 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800/50">
              Henüz fuar bulunmuyor. Yeni bir fuar başlatın.
            </div>
          ) : (
            fairs.map((fair) => (
              <Link key={fair.id} href={`/admin/fairs/${fair.id}`}>
                <Card className="group cursor-pointer rounded-3xl border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md shadow-lg hover:shadow-indigo-500/10 hover:border-zinc-700 transition-all overflow-hidden relative">
                  <CardHeader className="bg-zinc-900/20 pb-5 border-b border-zinc-800/60">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium shadow-sm">
                        Aktif
                      </Badge>
                    </div>
                    <CardTitle className="text-xl mt-5 font-medium text-zinc-100 line-clamp-1">{fair.name}</CardTitle>
                    <CardDescription className="text-xs font-light text-zinc-500 flex gap-2 mt-1.5">
                      {fair.event_date ? (
                        <>
                          <span>{new Date(fair.event_date + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                          {(fair.start_time || fair.end_time) && (
                            <span className="text-zinc-600">· {fair.start_time?.slice(0,5)} – {fair.end_time?.slice(0,5)}</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span>{fair.start_date ? new Date(fair.start_date).toLocaleDateString('tr-TR') : '-'}</span>
                          <span>-</span>
                          <span>{fair.end_date ? new Date(fair.end_date).toLocaleDateString('tr-TR') : '-'}</span>
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5 flex items-center justify-between text-sm text-zinc-400 font-light group-hover:text-zinc-200 transition-colors">
                    <span>Kontrol Merkezine Git</span>
                    <div className="w-8 h-8 rounded-full bg-zinc-800/50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>

      {/* TEMPLATES SECTION */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-medium text-zinc-100 tracking-tight">Çizelgeler (Şablonlar)</h2>
          <Dialog open={templateOpen} onOpenChange={(open) => { if (!open) resetTemplateForm(); setTemplateOpen(open) }}>
            <DialogTrigger render={<Button variant="outline" className="rounded-full border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all h-10 px-5" />}>
              <Plus className="w-4 h-4 mr-2" /> Yeni Çizelge
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 max-h-[85vh] overflow-y-auto custom-scrollbar">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium">{editingTemplateId ? 'Çizelgeyi Düzenle' : 'Yeni Çizelge Hazırla'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTemplate} className="space-y-5 mt-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Çizelge Adı</Label>
                  <Input placeholder="Örn: 2024 Genel Stand" value={templateName} onChange={e => setTemplateName(e.target.value)} className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-4 pt-2">
                  <Label className="text-zinc-400">Satış Kalemleri (Butonlar)</Label>
                  {templateItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <Input placeholder="Ürün (Boyama vb.)" value={item.name}
                        onChange={(e) => setTemplateItems(items => items.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                        className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 flex-1" />
                      <div className="relative w-28">
                        <Input type="number" placeholder="Fiyat" value={item.price || ''}
                          onChange={(e) => setTemplateItems(items => items.map(i => i.id === item.id ? { ...i, price: Number(e.target.value) } : i))}
                          className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 w-full pr-8" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₺</span>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-xl w-10 h-10 shrink-0"
                        onClick={() => { if (templateItems.length > 1) setTemplateItems(items => items.filter(i => i.id !== item.id)) }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" className="w-full rounded-xl border-dashed border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-colors h-12"
                    onClick={() => setTemplateItems([...templateItems, { id: Date.now().toString(), name: '', price: 0 }])}>
                    <Plus className="w-4 h-4 mr-2" /> Kalem Ekle
                  </Button>
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl mt-6 h-12 text-md font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
                  {loading ? 'Kaydediliyor...' : 'Çizelgeyi Kaydet'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full p-12 text-center text-zinc-500 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800/50">
              Henüz çizelge bulunmuyor.
            </div>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md shadow-sm hover:border-zinc-700 transition-all relative group overflow-hidden">
                <CardHeader className="bg-zinc-900/20 pb-5 flex flex-row items-start justify-between border-b border-zinc-800/60">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 flex items-center justify-center mb-4">
                      <FileJson className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg font-medium text-zinc-100">{template.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full" onClick={() => openEditTemplate(template)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-full" onClick={() => handleDeleteTemplate(template.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-2">
                    {template.items?.map((item: any, i: number) => (
                      <Badge key={i} variant="secondary" className="rounded-lg bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 font-light px-2.5 py-1">
                        {item.name} <span className="text-zinc-500 ml-1.5 font-medium">{item.price}₺</span>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* WORKERS SECTION */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-medium text-zinc-100 tracking-tight">Çalışanlar</h2>
            <Badge variant="secondary" className="rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
              {workers.length} kişi
            </Badge>
          </div>
          <Dialog open={workerOpen} onOpenChange={setWorkerOpen}>
            <DialogTrigger render={<Button variant="outline" className="rounded-full border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all h-10 px-5" />}>
              <Plus className="w-4 h-4 mr-2" /> Yeni Çalışan
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100">
              <DialogHeader>
                <DialogTitle className="text-xl font-medium">Sisteme Çalışan Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateWorker} className="space-y-5 mt-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400">Ad Soyad</Label>
                  <Input name="name" placeholder="Örn: Osman Yılmaz" required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">PIN Kodu (4 haneli)</Label>
                  <Input name="pin" placeholder="Örn: 1234" maxLength={4} required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500" />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400">Saatlik Ücret (₺)</Label>
                  <div className="relative">
                    <Input name="hourly_wage" type="number" placeholder="Örn: 150" className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 pr-8" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₺</span>
                  </div>
                  <p className="text-xs text-zinc-600">Boş bırakabilirsiniz. Sonradan düzenlenebilir.</p>
                </div>
                <Button type="submit" disabled={loading} className="w-full rounded-xl mt-4 h-12 text-md font-medium bg-indigo-600 hover:bg-indigo-500 text-white">
                  {loading ? 'Ekleniyor...' : 'Çalışanı Kaydet'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workerStats.length === 0 ? (
            <div className="col-span-full p-12 text-center text-zinc-500 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800/50">
              Henüz çalışan eklenmemiş. &quot;Yeni Çalışan&quot; butonuna tıklayın.
            </div>
          ) : (
            workerStats.map((worker) => (
              <Card
                key={worker.id}
                className="rounded-3xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md shadow-sm hover:border-zinc-700 transition-all relative group overflow-hidden cursor-pointer"
                onClick={() => setDetailWorker(worker)}
              >
                {/* Card Header */}
                <CardHeader className="bg-zinc-900/20 pb-4 flex flex-row items-start justify-between border-b border-zinc-800/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-medium text-zinc-100">{worker.name}</CardTitle>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {worker.hourly_wage ? `${Number(worker.hourly_wage).toLocaleString('tr-TR')} ₺/saat` : 'Ücret tanımlanmamış'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full"
                      onClick={(e) => { e.stopPropagation(); openEdit(worker) }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-full"
                      onClick={(e) => { e.stopPropagation(); handleDeleteWorker(worker.id, worker.name) }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>

                {/* Stats */}
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/60 rounded-2xl p-3 border border-zinc-800/50">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1.5">
                        <Clock className="w-3 h-3" /> Ödenmemiş Süre
                      </div>
                      <p className="text-xl font-medium text-zinc-100">
                        {worker.totalHours} <span className="text-sm text-zinc-500 font-normal">sa</span>
                      </p>
                    </div>
                    <div className="bg-zinc-900/60 rounded-2xl p-3 border border-zinc-800/50">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1.5">
                        <Banknote className="w-3 h-3" /> Hakediş
                      </div>
                      <p className="text-xl font-medium text-indigo-400">
                        {worker.totalPayment.toLocaleString('tr-TR')} <span className="text-sm font-normal">₺</span>
                      </p>
                    </div>
                  </div>

                  {worker.totalPayment > 0 ? (
                    <Button
                      onClick={(e) => { e.stopPropagation(); handlePayWorker(worker.id, worker.name) }}
                      className="w-full h-11 rounded-2xl bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-500/30 transition-all text-sm font-medium"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Öde ve Sıfırla ({worker.totalPayment.toLocaleString('tr-TR')} ₺)
                    </Button>
                  ) : (
                    <div className="w-full h-11 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex items-center justify-center text-zinc-600 text-sm">
                      Birikmiş ödeme yok
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {/* WORKER DETAIL MODAL */}
      <Dialog open={!!detailWorker} onOpenChange={(o) => !o && setDetailWorker(null)}>
        <DialogContent className="sm:max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100 max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {detailWorker && (() => {
            const hw = Number(detailWorker.hourly_wage ?? 0)
            const allA: any[] = detailWorker.assignments ?? []
            const unpaid = allA.filter((a: any) => a.end_time && !a.is_paid)
            const paid = allA.filter((a: any) => a.end_time && a.is_paid)
            const renderRow = (a: any, isPaid: boolean) => {
              const mins = Math.max(0, (new Date(a.end_time).getTime() - new Date(a.start_time).getTime()) / 60000)
              const hrs = mins / 60
              const earned = Math.round(hrs * hw)
              return (
                <div key={a.id} className={`flex items-start justify-between px-4 py-3 rounded-xl border transition-colors ${isPaid ? 'bg-zinc-900/20 border-zinc-800/30 opacity-60' : 'bg-zinc-900/50 border-zinc-800/60'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{a.fairs?.name ?? 'Fuar Bilgisi Yok'}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {new Date(a.start_time).toLocaleDateString('tr-TR')} &nbsp;·&nbsp;
                      {formatMinutes(mins)} çalıştı
                    </p>
                    {a.templates?.name && <p className="text-[11px] text-zinc-600">{a.templates.name}</p>}
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className={`text-sm font-semibold ${isPaid ? 'text-zinc-500' : 'text-indigo-400'}`}>{earned.toLocaleString('tr-TR')} ₺</p>
                    <p className="text-[10px] text-zinc-600">{Math.round(hrs * 10) / 10} sa × {hw} ₺</p>
                    {isPaid && <span className="text-[10px] text-emerald-600">✔ ödendi</span>}
                  </div>
                </div>
              )
            }
            return (
              <>
                <div className="p-6 border-b border-zinc-800/60 bg-zinc-900/40">
                  <DialogTitle className="text-xl font-medium text-zinc-100 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </span>
                    {detailWorker.name}
                  </DialogTitle>
                  <div className="flex gap-5 mt-4">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Saatlik Üret</p>
                      <p className="text-base font-medium text-zinc-200">{hw > 0 ? `${hw} ₺/sa` : 'Tanımlanmamış'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ödenmemiş Hakediş</p>
                      <p className="text-base font-semibold text-indigo-400">{detailWorker.totalPayment?.toLocaleString('tr-TR') ?? 0} ₺</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Ödenmemiş Süre</p>
                      <p className="text-base font-medium text-zinc-300">{detailWorker.totalHours ?? 0} sa</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                  {unpaid.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Ödenmemiş Görevler ({unpaid.length})</p>
                      {unpaid.map((a: any) => renderRow(a, false))}
                    </div>
                  )}
                  {paid.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">Ödenen Görevler ({paid.length})</p>
                      {paid.map((a: any) => renderRow(a, true))}
                    </div>
                  )}
                  {allA.filter((a:any)=>a.end_time).length === 0 && (
                    <p className="text-zinc-600 text-center py-8">Henüz tamamlanmış görev yok.</p>
                  )}
                  {unpaid.length > 0 && (
                    <button
                      onClick={() => { handlePayWorker(detailWorker.id, detailWorker.name); setDetailWorker(null) }}
                      className="w-full h-11 rounded-2xl bg-emerald-600/80 hover:bg-emerald-500 text-white border border-emerald-500/30 transition-all text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Tümünü Öde ve Sıfırla ({detailWorker.totalPayment?.toLocaleString('tr-TR')} ₺)
                    </button>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* WORKER EDIT MODAL */}
      <Dialog open={!!editWorker} onOpenChange={(o) => !o && setEditWorker(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">Çalışanı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateWorker} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label className="text-zinc-400">Ad Soyad</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">PIN Kodu</Label>
              <Input value={editPin} onChange={e => setEditPin(e.target.value)} maxLength={4} required className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500" />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Saatlik Üret (₺)</Label>
              <div className="relative">
                <Input type="number" value={editWage} onChange={e => setEditWage(e.target.value)} placeholder="Örn: 150" className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 pr-8" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₺</span>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium">
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
