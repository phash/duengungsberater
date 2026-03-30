import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
import { CROPS, CROP_NUTRIENT_DEMANDS } from '@/constants/crops'
import type { Crop, CropNutrientDemand } from '@/types'

export async function getCrops(): Promise<Crop[]> {
  const offlineFallback = async () => {
    const cached = await db.crops.toArray()
    return cached.length > 0 ? cached : CROPS
  }

  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('crops')
      .select('*')
      .order('category', { ascending: true })
      .order('name_de', { ascending: true })

    if (error) throw error

    const crops = data as Crop[]
    if (crops.length > 0) {
      await db.crops.bulkPut(crops)
      return crops
    }
    return CROPS
  } catch {
    return offlineFallback()
  }
}

export function mergeDemandsWithUserOverrides(
  lflDemands: CropNutrientDemand[],
  userDemands: CropNutrientDemand[],
): CropNutrientDemand[] {
  const merged = [...lflDemands]
  for (const ud of userDemands) {
    const idx = merged.findIndex((d) => d.nutrient_type_id === ud.nutrient_type_id)
    if (idx >= 0) {
      merged[idx] = ud
    }
  }
  return merged
}

export async function getNutrientDemands(
  cropId: string,
  userId?: string,
): Promise<CropNutrientDemand[]> {
  const offlineFallback = async () => {
    const all = await db.cropNutrientDemands.where('crop_id').equals(cropId).toArray()
    const lfl = all.filter((d) => d.source === 'lfl')
    // Fallback to hardcoded constants (LfL only — constants never contain source: 'user')
    const lflBase =
      lfl.length > 0
        ? lfl
        : CROP_NUTRIENT_DEMANDS.filter((d) => d.crop_id === cropId && d.source === 'lfl')
    if (!userId) return lflBase
    const userDemands = all.filter((d) => d.source === 'user' && d.user_id === userId)
    return mergeDemandsWithUserOverrides(lflBase, userDemands)
  }

  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) return offlineFallback()

  try {
    // LfL-Demands laden
    const { data: lflData, error: lflError } = await supabase
      .from('crop_nutrient_demands')
      .select('*')
      .eq('crop_id', cropId)
      .eq('source', 'lfl')

    if (lflError) throw lflError
    const fetched = (lflData ?? []) as CropNutrientDemand[]
    const lflDemands =
      fetched.length > 0
        ? fetched
        : CROP_NUTRIENT_DEMANDS.filter((d) => d.crop_id === cropId && d.source === 'lfl')
    if (fetched.length > 0) await db.cropNutrientDemands.bulkPut(fetched)

    if (!userId) return lflDemands

    // User-Demands laden und mergen
    const { data: userData, error: userError } = await supabase
      .from('crop_nutrient_demands')
      .select('*')
      .eq('crop_id', cropId)
      .eq('source', 'user')
      .eq('user_id', userId)

    if (userError) throw userError
    const userDemands = (userData ?? []) as CropNutrientDemand[]
    await db.cropNutrientDemands.bulkPut(userDemands)

    return mergeDemandsWithUserOverrides(lflDemands, userDemands)
  } catch {
    return offlineFallback()
  }
}

// --- Admin-CRUD ---

export async function createCrop(crop: Omit<Crop, 'id'>): Promise<Crop> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase.from('crops').insert(crop).select().single()
  if (error) throw new Error(error.message)
  return data as Crop
}

export async function updateCrop(id: string, updates: Partial<Crop>): Promise<Crop> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase
    .from('crops')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Crop
}

export async function deleteCrop(id: string): Promise<void> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { error } = await supabase.from('crops').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
