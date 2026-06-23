import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
import { deleteLocalRecommendationsForPlans } from './recommendation.service'
import type { Field } from '@/types'

export async function getFields(userId: string): Promise<Field[]> {
  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) {
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
  field: Pick<Field, 'name' | 'size_ha' | 'region' | 'nmin_0_30' | 'nmin_30_60' | 'nmin_60_90' | 'user_id'>,
): Promise<Field> {
  if (field.size_ha <= 0 || field.size_ha > 10000) {
    throw new Error('Feldgröße muss zwischen 0,01 und 10.000 ha liegen')
  }

  const auth = useAuthStore()
  const offlineField: Field = {
    ...field,
    id: crypto.randomUUID(),
    region: field.region ?? null,
    nmin_0_30: field.nmin_0_30 ?? null,
    nmin_30_60: field.nmin_30_60 ?? null,
    nmin_60_90: field.nmin_60_90 ?? null,
    synced: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (auth.isGuest || !navigator.onLine) {
    await db.fields.add(offlineField)
    return offlineField
  }

  try {
    const { data, error } = await supabase
      .from('fields')
      .insert({
        user_id: field.user_id,
        name: field.name,
        size_ha: field.size_ha,
        region: field.region,
        nmin_0_30: field.nmin_0_30,
        nmin_30_60: field.nmin_30_60,
        nmin_60_90: field.nmin_60_90,
      })
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

export async function updateField(
  id: string,
  updates: Partial<Pick<Field, 'name' | 'size_ha' | 'region' | 'nmin_0_30' | 'nmin_30_60' | 'nmin_60_90'>>,
): Promise<Field> {
  const auth = useAuthStore()
  const offlineUpdate = async () => {
    await db.fields.update(id, { ...updates, synced: false, updated_at: new Date().toISOString() })
    const updated = await db.fields.get(id)
    if (!updated) throw new Error(`Feld ${id} nicht gefunden`)
    return updated
  }

  if (updates.size_ha !== undefined && (updates.size_ha <= 0 || updates.size_ha > 10000)) {
    throw new Error('Feldgröße muss zwischen 0,01 und 10.000 ha liegen')
  }

  if (auth.isGuest || !navigator.onLine) return offlineUpdate()

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
  const auth = useAuthStore()
  if (!auth.isGuest && navigator.onLine) {
    const { error } = await supabase.from('fields').delete().eq('id', id)
    if (error) throw new Error(error.message)
  } else if (!auth.isGuest) {
    // Queue delete for sync when back online (registered users only)
    await db.pendingDeletes.add({ table: 'fields', recordId: id })
  }
  // Lokale Kaskade: Pläne → Empfehlungen → Werte (Server: FK ON DELETE CASCADE)
  const planIds = (await db.fieldCropPlans.where('field_id').equals(id).toArray()).map((p) => p.id)
  await deleteLocalRecommendationsForPlans(planIds)
  await db.fieldCropPlans.where('field_id').equals(id).delete()
  await db.fields.delete(id)
}
