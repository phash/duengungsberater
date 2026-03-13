import { supabase } from './supabase'
import type { FieldGeometry } from '@/types'

export async function getGeometriesForUser(userId: string): Promise<FieldGeometry[]> {
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
  const { data, error } = await supabase
    .from('field_geometries')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data as FieldGeometry
}

export async function deleteFieldGeometry(id: string): Promise<void> {
  const { error } = await supabase.from('field_geometries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
