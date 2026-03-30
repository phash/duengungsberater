import { supabase } from './supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { AdminUser } from '@/types'

export async function getAdminUsers(): Promise<AdminUser[]> {
  const auth = useAuthStore()
  if (auth.isGuest || !auth.isAdminUser) throw new Error('Zugriff verweigert')
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw new Error(error.message)
  return data as AdminUser[]
}

export async function banUser(targetId: string): Promise<void> {
  const auth = useAuthStore()
  if (auth.isGuest || !auth.isAdminUser) throw new Error('Zugriff verweigert')
  const { error } = await supabase.rpc('admin_ban_user', { target_id: targetId })
  if (error) throw new Error(error.message)
}

export async function unbanUser(targetId: string): Promise<void> {
  const auth = useAuthStore()
  if (auth.isGuest || !auth.isAdminUser) throw new Error('Zugriff verweigert')
  const { error } = await supabase.rpc('admin_unban_user', { target_id: targetId })
  if (error) throw new Error(error.message)
}

export async function adminDeleteUser(targetId: string): Promise<void> {
  const auth = useAuthStore()
  if (auth.isGuest || !auth.isAdminUser) throw new Error('Zugriff verweigert')
  const { error } = await supabase.rpc('admin_delete_user', { target_id: targetId })
  if (error) throw new Error(error.message)
}
