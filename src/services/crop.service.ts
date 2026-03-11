import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { CROPS, CROP_NUTRIENT_DEMANDS } from '@/constants/crops'
import type { Crop, CropNutrientDemand } from '@/types'

export async function getCrops(): Promise<Crop[]> {
  const offlineFallback = async () => {
    const cached = await db.crops.toArray()
    return cached.length > 0 ? cached : CROPS
  }

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('category', { ascending: true })
      .order('name_de', { ascending: true })

    if (error) throw error

    const crops = data as Crop[]
    await db.crops.bulkPut(crops)
    return crops
  } catch {
    return offlineFallback()
  }
}

export async function getNutrientDemands(cropId: string): Promise<CropNutrientDemand[]> {
  const offlineFallback = async () => {
    const cached = await db.cropNutrientDemands.where('crop_id').equals(cropId).toArray()
    return cached.length > 0 ? cached : CROP_NUTRIENT_DEMANDS.filter(d => d.crop_id === cropId)
  }

  if (!navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('crop_nutrient_demands')
      .select('*')
      .eq('crop_id', cropId)

    if (error) throw error

    const demands = data as CropNutrientDemand[]
    await db.cropNutrientDemands.bulkPut(demands)
    return demands
  } catch {
    return offlineFallback()
  }
}

// --- Admin-CRUD ---

export async function createCrop(crop: Omit<Crop, 'id'>): Promise<Crop> {
  const { data, error } = await supabase.from('crops').insert(crop).select().single()
  if (error) throw new Error(error.message)
  return data as Crop
}

export async function updateCrop(id: string, updates: Partial<Crop>): Promise<Crop> {
  const { data, error } = await supabase.from('crops').update(updates).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Crop
}

export async function deleteCrop(id: string): Promise<void> {
  const { error } = await supabase.from('crops').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
