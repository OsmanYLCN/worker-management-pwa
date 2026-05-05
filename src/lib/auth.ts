import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = process.env.JWT_SECRET_KEY || 'default_super_secret_key_change_this'
const key = new TextEncoder().encode(SECRET_KEY)

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(key)
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  })
  return payload
}

export async function setWorkerSession(worker: { id: string; name: string }) {
  const session = await encrypt({ worker, role: 'worker' })
  const cookieStore = await cookies()
  
  cookieStore.set('worker_session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 hours
  })
}

export async function getWorkerSession() {
  const cookieStore = await cookies()
  const session = cookieStore.get('worker_session')?.value
  if (!session) return null
  try {
    return await decrypt(session)
  } catch (error) {
    return null
  }
}

export async function clearWorkerSession() {
  const cookieStore = await cookies()
  cookieStore.delete('worker_session')
}
