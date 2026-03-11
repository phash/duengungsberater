import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { NUTRIENT_TYPES } from '@/constants/nutrients'
import type { NutrientType, CropNutrientDemand } from '@/types'

export async function getNutrientTypes(): Promise<NutrientType[]> {
  const offlineFallback = async () => {
    const cached = await db.nutrientTypes.toArray()
    return cached.length > 0 ? cached : NUTRIENT_TYPES
  }

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('nutrient_types')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error

    const types = data as NutrientType[]
    await db.nutrientTypes.bulkPut(types)
    return types
  } catch {
    return offlineFallback()
  }
}

// Admin: Nährstoffwerte (CropNutrientDemand) pflegen

export async function createNutrientDemand(
  demand: Omit<CropNutrientDemand, 'id'>,
): Promise<CropNutrientDemand> {
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
  const { error } = await supabase.from('crop_nutrient_demands').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function getAllNutrientDemands(): Promise<CropNutrientDemand[]> {
  const { data, error } = await supabase
    .from('crop_nutrient_demands')
    .select('*')
    .order('crop_id')
  if (error) throw new Error(error.message)
  return data as CropNutrientDemand[]
}
