import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
import { NUTRIENT_TYPES } from '@/constants/nutrients'
import type { NutrientType, CropNutrientDemand } from '@/types'

export async function getNutrientTypes(): Promise<NutrientType[]> {
  const offlineFallback = async () => {
    const cached = await db.nutrientTypes.toArray()
    return cached.length > 0 ? cached : NUTRIENT_TYPES
  }

  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('nutrient_types')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    const types = data as NutrientType[]
    if (types.length > 0) {
      await db.nutrientTypes.bulkPut(types)
      return types
    }
    return NUTRIENT_TYPES
  } catch {
    return offlineFallback()
  }
}

// Admin: Nährstoffwerte (CropNutrientDemand) pflegen

export async function createNutrientDemand(
  demand: Omit<CropNutrientDemand, 'id'>,
): Promise<CropNutrientDemand> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase
    .from('crop_nutrient_demands')
    .insert(demand)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CropNutrientDemand
}

export async function updateNutrientDemand(
  id: string,
  updates: Partial<CropNutrientDemand>,
): Promise<CropNutrientDemand> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase
    .from('crop_nutrient_demands')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as CropNutrientDemand
}

export async function deleteNutrientDemand(id: string): Promise<void> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { error } = await supabase.from('crop_nutrient_demands').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getAllNutrientDemands(): Promise<CropNutrientDemand[]> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase.from('crop_nutrient_demands').select('*').order('crop_id')
  if (error) throw new Error(error.message)
  return data as CropNutrientDemand[]
}

export async function upsertUserNutrientDemand(
  demand: Pick<
    CropNutrientDemand,
    | 'crop_id'
    | 'nutrient_type_id'
    | 'demand_kg_ha'
    | 'ref_yield_dt_ha'
    | 'per_yield_correction'
    | 'per_yield_correction_below'
  >,
  userId: string,
): Promise<CropNutrientDemand> {
  const payload = {
    crop_id: demand.crop_id,
    nutrient_type_id: demand.nutrient_type_id,
    demand_kg_ha: demand.demand_kg_ha,
    ref_yield_dt_ha: demand.ref_yield_dt_ha,
    per_yield_correction: demand.per_yield_correction,
    per_yield_correction_below: demand.per_yield_correction_below ?? null,
    source: 'user' as const,
    user_id: userId,
    valid_from: new Date().toISOString(),
  }

  // Check if user demand already exists
  const { data: existing } = await supabase
    .from('crop_nutrient_demands')
    .select('id')
    .eq('crop_id', demand.crop_id)
    .eq('nutrient_type_id', demand.nutrient_type_id)
    .eq('user_id', userId)
    .eq('source', 'user')
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from('crop_nutrient_demands')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const result = data as CropNutrientDemand
    await db.cropNutrientDemands.put(result)
    return result
  } else {
    const { data, error } = await supabase
      .from('crop_nutrient_demands')
      .insert(payload)
      .select()
      .single()
    if (error) throw new Error(error.message)
    const result = data as CropNutrientDemand
    await db.cropNutrientDemands.put(result)
    return result
  }
}

export async function deleteUserNutrientDemand(
  cropId: string,
  nutrientTypeId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('crop_nutrient_demands')
    .delete()
    .eq('crop_id', cropId)
    .eq('nutrient_type_id', nutrientTypeId)
    .eq('user_id', userId)
    .eq('source', 'user')

  if (error) throw new Error(error.message)

  // Auch aus Dexie löschen
  await db.cropNutrientDemands
    .filter(
      (d) =>
        d.crop_id === cropId &&
        d.nutrient_type_id === nutrientTypeId &&
        d.user_id === userId &&
        d.source === 'user',
    )
    .delete()
}
