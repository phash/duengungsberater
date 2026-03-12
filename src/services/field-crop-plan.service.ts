import { supabase } from './supabase'
import { db } from '@/db/dexie'
import type { FieldCropPlan } from '@/types'

export async function getPlansForField(fieldId: string): Promise<FieldCropPlan[]> {
  const offlineFallback = () => db.fieldCropPlans.where('field_id').equals(fieldId).toArray()

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('field_crop_plans')
      .select('*')
      .eq('field_id', fieldId)
      .order('season_year', { ascending: false })

    if (error) throw error

    const plans = data as FieldCropPlan[]
    await db.fieldCropPlans.bulkPut(plans)
    return plans
  } catch {
    return offlineFallback()
  }
}

export async function createPlan(
  plan: Pick<FieldCropPlan, 'field_id' | 'crop_id' | 'season_year' | 'expected_yield_dt_ha'>,
): Promise<FieldCropPlan> {
  const offlinePlan: FieldCropPlan = {
    ...plan,
    id: crypto.randomUUID(),
    vorfrucht_correction_id: null,
    zwischenfrucht_correction_id: null,
    humus_correction_id: null,
    synced: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (!navigator.onLine) {
    await db.fieldCropPlans.add(offlinePlan)
    return offlinePlan
  }

  try {
    const { data, error } = await supabase
      .from('field_crop_plans')
      .insert({
        field_id: plan.field_id,
        crop_id: plan.crop_id,
        season_year: plan.season_year,
        expected_yield_dt_ha: plan.expected_yield_dt_ha,
      })
      .select()
      .single()

    if (error) throw error

    const newPlan = { ...data, synced: true } as FieldCropPlan
    await db.fieldCropPlans.put(newPlan)
    return newPlan
  } catch {
    // Netzwerkfehler → Offline-Pfad
    await db.fieldCropPlans.add(offlinePlan)
    return offlinePlan
  }
}

export async function updatePlan(
  id: string,
  updates: Partial<
    Pick<
      FieldCropPlan,
      | 'crop_id'
      | 'season_year'
      | 'expected_yield_dt_ha'
      | 'vorfrucht_correction_id'
      | 'zwischenfrucht_correction_id'
      | 'humus_correction_id'
    >
  >,
): Promise<FieldCropPlan> {
  const offlineUpdate = async () => {
    await db.fieldCropPlans.update(id, {
      ...updates,
      synced: false,
      updated_at: new Date().toISOString(),
    })
    return (await db.fieldCropPlans.get(id))!
  }

  if (!navigator.onLine) return offlineUpdate()

  try {
    const { data, error } = await supabase
      .from('field_crop_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    const updated = { ...data, synced: true } as FieldCropPlan
    await db.fieldCropPlans.put(updated)
    return updated
  } catch {
    return offlineUpdate()
  }
}

export async function deletePlan(id: string): Promise<void> {
  if (navigator.onLine) {
    const { error } = await supabase.from('field_crop_plans').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }
  await db.fieldCropPlans.delete(id)
}
