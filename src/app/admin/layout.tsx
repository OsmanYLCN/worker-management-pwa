import { adminLogout } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Premium Minimalist Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3 group transition-opacity hover:opacity-80">
            <div className="w-9 h-9 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-medium text-zinc-100 leading-none">Yönetim</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] mt-1">Merkezi</p>
            </div>
          </Link>

          <form action={adminLogout}>
            <Button variant="ghost" size="sm" type="submit" className="text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-full px-4 transition-all">
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 pb-32">
        {children}
      </main>
    </div>
  )
}
