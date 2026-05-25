'use client'

import { useState } from 'react'
import { workerLogin } from '@/app/actions/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Delete, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function WorkerLoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num)
      setError(null)
    }
  }

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1))
    setError(null)
  }

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError('Lütfen 4 haneli PIN kodunu girin.')
      return
    }
    
    setLoading(true)
    const result = await workerLogin(pin)
    
    if (result?.error) {
      setError(result.error)
      setPin('')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 selection:bg-indigo-500/30 relative">
      
      {/* Geri Dön Butonu */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800/50 transition-all font-medium text-sm backdrop-blur-md">
          <ArrowLeft className="w-4 h-4" /> Ana Ekran
        </Link>
      </div>

      <Card className="w-full max-w-sm bg-zinc-900/50 backdrop-blur-md border border-zinc-800 shadow-2xl rounded-3xl p-2 z-10">
        <CardHeader className="text-center pb-2 pt-6">
          <CardTitle className="text-2xl font-medium text-zinc-100">Sahaya Giriş</CardTitle>
          <CardDescription className="text-zinc-500 font-light mt-1">Size özel 4 haneli PIN kodunu girin</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-8 pt-4">
          
          {/* PIN Dots */}
          <div className="flex space-x-6 mb-2">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  i < pin.length 
                    ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] scale-110' 
                    : 'bg-zinc-800'
                }`}
              />
            ))}
          </div>

          <div className="h-5 flex items-center justify-center w-full">
            {error && <span className="text-sm text-red-400 font-light animate-in fade-in">{error}</span>}
          </div>

          {/* NumPad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] relative z-20">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                className="flex items-center justify-center h-16 text-2xl font-light rounded-2xl transition-all bg-zinc-900 border border-zinc-800 text-zinc-100 active:bg-zinc-800 md:hover:bg-zinc-800 md:hover:text-white touch-manipulation cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
                onClick={() => handleNumberClick(num.toString())}
                disabled={loading || pin.length >= 4}
              >
                {num}
              </button>
            ))}
            <div className="flex items-center justify-center"></div>
            <button
              type="button"
              className="flex items-center justify-center h-16 text-2xl font-light rounded-2xl transition-all bg-zinc-900 border border-zinc-800 text-zinc-100 active:bg-zinc-800 md:hover:bg-zinc-800 md:hover:text-white touch-manipulation cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => handleNumberClick('0')}
              disabled={loading || pin.length >= 4}
            >
              0
            </button>
            <button
              type="button"
              className="flex items-center justify-center h-16 rounded-2xl transition-all text-zinc-500 active:bg-zinc-800/50 md:hover:text-zinc-300 md:hover:bg-zinc-800/50 touch-manipulation cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
              onClick={() => handleDelete()}
              disabled={loading || pin.length === 0}
            >
              <Delete className="w-7 h-7" />
            </button>
          </div>

          <button 
            type="button"
            className={`flex items-center justify-center w-full h-14 text-lg font-medium rounded-xl transition-all duration-300 touch-manipulation cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none relative z-20 ${pin.length === 4 && !loading ? 'bg-indigo-600 active:bg-indigo-700 md:hover:bg-indigo-500 text-white shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)]' : 'bg-zinc-800 text-zinc-500'}`} 
            onClick={handleSubmit}
            disabled={pin.length !== 4 || loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>

        </CardContent>
      </Card>
    </div>
  )
}
