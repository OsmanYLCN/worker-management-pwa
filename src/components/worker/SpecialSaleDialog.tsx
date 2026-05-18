'use client'

import { useState } from 'react'
import { recordTransaction } from '@/app/actions/worker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Banknote, CreditCard } from 'lucide-react'

interface SpecialSaleDialogProps {
  assignmentId: string;
  onSuccess: () => void;
}

export function SpecialSaleDialog({ assignmentId, onSuccess }: SpecialSaleDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  const [paymentMethod, setPaymentMethod] = useState<'Nakit' | 'IBAN'>('Nakit')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || isNaN(Number(amount))) {
      toast.error('Geçerli bir tutar giriniz')
      return
    }

    setLoading(true)
    const res = await recordTransaction(
      assignmentId,
      'special-sale',
      'Özel Satış',
      Number(amount),
      paymentMethod,
      'Özel Satış',
      description
    )

    setLoading(false)
    if (res?.success) {
      toast.success('Özel satış başarıyla kaydedildi!')
      // Vibrate if supported
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(200)
      }
      setAmount('')
      setDescription('')
      setOpen(false)
      onSuccess()
    } else {
      toast.error(res?.error || 'Bir hata oluştu')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full h-16 text-lg font-medium bg-zinc-900/50 hover:bg-zinc-800 text-zinc-100 rounded-3xl border border-zinc-800 backdrop-blur-md transition-all active:scale-[0.98]" />}>
        <Banknote className="mr-3 h-5 w-5 text-indigo-400" />
        Farklı Tutar / Özel Satış
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-3xl bg-zinc-950 border border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="text-xl font-medium">Özel Satış</DialogTitle>
          <DialogDescription className="text-zinc-500 font-light">
            Şablonda bulunmayan ürünler için manuel tutar ve açıklama girin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-zinc-400">Tutar</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-lg py-6 pl-4 pr-12"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₺</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-zinc-400">Açıklama (Ne Satıldı?)</Label>
              <Input
                id="description"
                placeholder="Örn: 3'lü Paket Oyuncak"
                className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 h-12"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-zinc-400">Ödeme Yöntemi</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={`flex-1 h-12 rounded-xl border-zinc-800 flex gap-2 items-center ${paymentMethod === 'Nakit' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900 text-zinc-400'}`}
                  onClick={() => setPaymentMethod('Nakit')}
                >
                  <Banknote className="w-4 h-4" /> Nakit
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className={`flex-1 h-12 rounded-xl border-zinc-800 flex gap-2 items-center ${paymentMethod === 'IBAN' ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900 text-zinc-400'}`}
                  onClick={() => setPaymentMethod('IBAN')}
                >
                  <CreditCard className="w-4 h-4" /> IBAN
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="ghost" className="rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800" onClick={() => setOpen(false)}>İptal</Button>
            <Button type="submit" disabled={loading} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-8">
              {loading ? 'Kaydediliyor...' : 'Satışı Onayla'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
