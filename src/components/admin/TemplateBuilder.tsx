'use client'

import { useState } from 'react'
import { createTemplate } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface TemplateItem {
  id: string;
  name: string;
  price: number;
}

export function TemplateBuilder() {
  const [name, setName] = useState('')
  const [items, setItems] = useState<TemplateItem[]>([
    { id: '1', name: '', price: 0 }
  ])
  const [loading, setLoading] = useState(false)

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', price: 0 }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof TemplateItem, value: string | number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSave = async () => {
    if (!name) {
      toast.error('Lütfen şablon adını girin.')
      return
    }
    
    const validItems = items.filter(i => i.name.trim() !== '' && i.price > 0)
    if (validItems.length === 0) {
      toast.error('Lütfen en az bir geçerli ürün girin (isim ve fiyat).')
      return
    }

    setLoading(true)
    const res = await createTemplate(name, validItems)
    setLoading(false)

    if (res.success) {
      toast.success('Şablon başarıyla oluşturuldu!')
      setName('')
      setItems([{ id: Date.now().toString(), name: '', price: 0 }])
    } else {
      toast.error(res.error || 'Bir hata oluştu.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yeni Şablon Oluştur</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="template_name">Şablon Adı</Label>
          <Input 
            id="template_name" 
            placeholder="Örn: 2024 Kırtasiye Standı" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <Label>Ürünler (Butonlar)</Label>
          {items.map((item, index) => (
            <div key={item.id} className="flex gap-3 items-start">
              <div className="grid grid-cols-2 gap-3 flex-1">
                <Input 
                  placeholder="Ürün Adı (Örn: Y.Boyası)" 
                  value={item.name}
                  onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                />
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder="Fiyat" 
                    value={item.price || ''}
                    onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-2 text-sm text-muted-foreground">TL</span>
                </div>
              </div>
              <Button 
                variant="destructive" 
                size="icon" 
                onClick={() => removeItem(item.id)}
                disabled={items.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addItem} className="w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" />
            Yeni Ürün Ekle
          </Button>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Şablonu Kaydet
        </Button>
      </CardContent>
    </Card>
  )
}
