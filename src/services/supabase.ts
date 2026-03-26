import { createClient } from '@supabase/supabase-js'

// Wenn VITE_SUPABASE_URL leer ist, nutzen wir window.location.origin —
// dann funktioniert der Vite-Proxy (/auth/v1, /rest/v1) automatisch,
// egal ob localhost oder Cloudflare-Tunnel.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder'

if (supabaseAnonKey === 'placeholder' && import.meta.env.DEV) {
  console.warn('[Supabase] VITE_SUPABASE_ANON_KEY nicht gesetzt — Auth wird nicht funktionieren.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
