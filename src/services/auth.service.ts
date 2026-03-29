import { supabase } from './supabase'

export interface AuthResult {
  success: boolean
  error?: string
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

export function onAuthStateChange(callback: (userId: string | null) => void) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user?.id ?? null)
  })
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.email ?? null
}

export async function isAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getUser()
  return data.user?.app_metadata?.role === 'admin'
}

export async function resendConfirmation(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resend({ type: 'signup', email })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function resetPasswordForEmail(email: string, redirectTo?: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo ?? `${window.location.origin}/login?reset=true`,
  })
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

export async function verifyEmail(
  params: { tokenHash: string; type: string } | { token: string; type: string },
): Promise<{ success: boolean; error?: string }> {
  if ('tokenHash' in params) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.type as 'signup' | 'recovery' | 'email_change',
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  // Server-side verify via GoTrue API
  const res = await fetch(`/auth/v1/verify?token=${params.token}&type=${params.type}`, {
    redirect: 'manual',
  })
  // 303/302/200 = success (GoTrue redirects after verification)
  if (res.status === 303 || res.status === 200 || res.status === 302) {
    return { success: true }
  }
  // Token might already be consumed by email link scanner — account is likely verified
  return { success: false, error: 'Token bereits verwendet oder abgelaufen' }
}

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_user')
  if (error) throw new Error(error.message)
  await supabase.auth.signOut()
}
