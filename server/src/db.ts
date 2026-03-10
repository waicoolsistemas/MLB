import { createClient } from '@supabase/supabase-js'
import { Agent, setGlobalDispatcher } from 'undici'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') })
}

setGlobalDispatcher(new Agent({
  pipelining: 0,
  connections: 20,
  keepAliveTimeout: 1_000,
  keepAliveMaxTimeout: 5_000,
  connect: { timeout: 30_000 },
  bodyTimeout: 30_000,
  headersTimeout: 30_000,
}))

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = (err.message || '') + (err.name || '')
    if (
      msg.includes('UND_ERR_SOCKET') ||
      msg.includes('other side closed') ||
      msg.includes('ECONNRESET') ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ETIMEDOUT') ||
      msg.includes('SocketError')
    ) return true
    if (msg.includes('fetch failed') && 'cause' in err && err.cause) {
      return isRetryableError(err.cause)
    }
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    if (['UND_ERR_SOCKET', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT'].includes(code)) return true
  }
  return false
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const maxRetries = 3
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(input, init)
    } catch (err: unknown) {
      if (!isRetryableError(err) || attempt === maxRetries) throw err
      const delay = 200 * Math.pow(2, attempt)
      console.warn(`[fetchWithRetry] attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('fetchWithRetry: unreachable')
}

export const db = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
  global: {
    fetch: fetchWithRetry,
  },
})
