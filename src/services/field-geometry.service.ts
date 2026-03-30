import { supabase } from './supabase'
import { useAuthStore } from '@/stores/auth.store'
import type { FieldGeometry } from '@/types'

export async function getGeometriesForUser(userId: string): Promise<FieldGeometry[]> {
  const auth = useAuthStore()
  if (auth.isGuest) return []

  const { data, error } = await supabase
    .from('field_geometries')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data as FieldGeometry[]
}

export async function createFieldGeometry(
  payload: Pick<FieldGeometry, 'field_id' | 'user_id' | 'geometry' | 'source'>,
): Promise<FieldGeometry> {
  const auth = useAuthStore()
  if (auth.isGuest) {
    // Geometry is already rendered from import parser, no persistence needed for guests
    return { ...payload, id: crypto.randomUUID(), created_at: new Date().toISOString() } as FieldGeometry
  }

  const { data, error } = await supabase
    .from('field_geometries')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as FieldGeometry
}

export async function deleteFieldGeometry(id: string): Promise<void> {
  const auth = useAuthStore()
  if (auth.isGuest) return

  const { error } = await supabase.from('field_geometries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
