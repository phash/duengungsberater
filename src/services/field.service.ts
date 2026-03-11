import { supabase } from './supabase'
import { db } from '@/db/dexie'
import type { Field } from '@/types'

export async function getFields(userId: string): Promise<Field[]> {
  if (!navigator.onLine) {
    return db.fields.where('user_id').equals(userId).toArray()
  }

  try {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const fields = data as Field[]
    await db.fields.bulkPut(fields)
    return fields
  } catch {
    // Netzwerkfehler → Offline-Pfad
    return db.fields.where('user_id').equals(userId).toArray()
  }
}

export async function createField(
  field: Pick<Field, 'name' | 'size_ha' | 'user_id'>,
): Promise<Field> {
  const offlineField: Field = {
    ...field,
    id: crypto.randomUUID(),
    synced: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    await db.fields.add(offlineField)
    return offlineField
  }

  try {
    const { data, error } = await supabase
      .from('fields')
      .insert({ name: field.name, size_ha: field.size_ha })
      .select()
      .single()

    if (error) throw error

    const newField = { ...data, synced: true } as Field
    await db.fields.put(newField)
    return newField
  } catch {
    // Netzwerkfehler → Offline-Pfad (Richtlinie: nie als Fehlerdialog)
    await db.fields.add(offlineField)
    return offlineField
  }
}

export async function updateField(id: string, updates: Partial<Pick<Field, 'name' | 'size_ha'>>): Promise<Field> {
  const offlineUpdate = async () => {
    await db.fields.update(id, { ...updates, synced: false, updated_at: new Date().toISOString() })
    return (await db.fields.get(id))!
  }

  if (!navigator.onLine) return offlineUpdate()

  try {
    const { data, error } = await supabase
      .from('fields')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const updated = { ...data, synced: true } as Field
    await db.fields.put(updated)
    return updated
  } catch {
    return offlineUpdate()
  }
}

export async function deleteField(id: string): Promise<void> {
  if (navigator.onLine) {
    const { error } = await supabase.from('fields').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
  await db.fields.delete(id)
  await db.fieldCropPlans.where('field_id').equals(id).delete()
}
