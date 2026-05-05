'use client'

import { useState } from 'react'
import { adminLogin } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const result = await adminLogin(formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 selection:bg-indigo-500/30">
      
      {/* Geri Dön Butonu */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800/50 transition-all font-medium text-sm backdrop-blur-md">
          <ArrowLeft className="w-4 h-4" /> Ana Ekran
        </Link>
      </div>

      <Card className="w-full max-w-md bg-zinc-900/50 backdrop-blur-md border border-zinc-800 shadow-2xl rounded-3xl p-2">
        <CardHeader className="space-y-1 pt-6 pb-4">
          <CardTitle className="text-2xl font-medium text-zinc-100">Yönetici Girişi</CardTitle>
          <CardDescription className="text-zinc-500 font-light">
            Fuar ve çalışan yönetim paneline erişmek için giriş yapın.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-zinc-400">E-posta</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  placeholder="admin@ornek.com" 
                  required 
                  className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-zinc-100 h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-zinc-400">Şifre</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  required 
                  className="rounded-xl bg-zinc-900 border-zinc-800 focus-visible:ring-indigo-500 text-zinc-100 h-12"
                />
              </div>
              <div className="h-5">
                {error && <span className="text-sm text-red-400 font-light animate-in fade-in">{error}</span>}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-4 pt-2">
            <Button className="w-full h-12 text-md font-medium rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] transition-all" type="submit" disabled={loading}>
              {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
