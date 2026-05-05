import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Building2, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-zinc-100">
            Fuar & Çalışan Yönetimi
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-light">
            Sisteme giriş yapmak istediğiniz rolü seçin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Worker Login Card */}
          <Link href="/worker-login" className="group">
            <div className="h-full flex flex-col items-center p-10 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 group-hover:border-indigo-500/50 group-hover:bg-zinc-900 transition-all duration-300">
              <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Users className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-medium text-zinc-100 mb-3">Çalışan Girişi</h2>
              <p className="text-zinc-500 mb-8 font-light leading-relaxed">
                Size verilen PIN kodu ile sahada satış yapmak için giriş yapın.
              </p>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-12 mt-auto">
                Giriş Yap
              </Button>
            </div>
          </Link>

          {/* Admin Login Card */}
          <Link href="/admin-login" className="group">
            <div className="h-full flex flex-col items-center p-10 bg-zinc-900/50 rounded-3xl border border-zinc-800/50 group-hover:border-zinc-700/50 group-hover:bg-zinc-900 transition-all duration-300">
              <div className="w-16 h-16 bg-zinc-800/50 text-zinc-300 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-medium text-zinc-100 mb-3">Yönetici Girişi</h2>
              <p className="text-zinc-500 mb-8 font-light leading-relaxed">
                Fuarları, şablonları ve çalışanları yönetmek için giriş yapın.
              </p>
              <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl h-12 mt-auto">
                Yönetici Paneli
              </Button>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}
