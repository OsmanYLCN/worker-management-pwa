'use server'

import { createClient } from '@/lib/supabase/server'
import { setWorkerSession, clearWorkerSession } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function adminLogin(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Lütfen tüm alanları doldurun.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/admin')
}

export async function adminLogout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin-login')
}

export async function workerLogin(pin: string) {
  if (!pin || pin.length !== 4) {
    return { error: 'Geçersiz PIN formatı.' }
  }

  const supabase = await createClient()

  const { data: worker, error } = await supabase
    .from('workers')
    .select('id, name, is_active')
    .eq('pin', pin)
    .single()

  if (error || !worker) {
    return { error: 'Hatalı PIN kodu.' }
  }

  if (!worker.is_active) {
    return { error: 'Hesabınız pasif durumdadır. Yöneticinizle iletişime geçin.' }
  }

  // Set JWT Cookie
  await setWorkerSession({ id: worker.id, name: worker.name })

  redirect('/worker')
}

export async function workerLogout() {
  await clearWorkerSession()
  redirect('/worker-login')
}
