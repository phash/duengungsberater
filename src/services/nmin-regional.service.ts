import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
import type { NminRegionalValue, NminCropGroupMapping } from '@/types'

// --- Nmin-Richtwerte laden & cachen ---

export async function getNminRegionalValues(year: number = CURRENT_NMIN_YEAR): Promise<NminRegionalValue[]> {
  const offlineFallback = async () => {
    return db.nminRegionalValues.where('year').equals(year).toArray()
  }

  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('nmin_regional_values')
      .select('*')
      .eq('year', year)

    if (error) throw error

    const values = data as NminRegionalValue[]
    if (values.length > 0) {
      await db.nminRegionalValues.bulkPut(values)
    }
    return values
  } catch {
    return offlineFallback()
  }
}

export async function getNminCropGroupMappings(): Promise<NminCropGroupMapping[]> {
  const offlineFallback = async () => {
    return db.nminCropGroupMapping.toArray()
  }

  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('nmin_crop_group_mapping')
      .select('*')

    if (error) throw error

    const mappings = data as NminCropGroupMapping[]
    if (mappings.length > 0) {
      await db.nminCropGroupMapping.bulkPut(mappings)
    }
    return mappings
  } catch {
    return offlineFallback()
  }
}

// --- Lookup ---

export const CURRENT_NMIN_YEAR = 2026

export function lookupNmin(
  values: NminRegionalValue[],
  mappings: NminCropGroupMapping[],
  cropId: string,
  region: string,
  depthCm: number,
  year: number = CURRENT_NMIN_YEAR,
): number | null {
  const sonstigeGroup =
    depthCm === 60 ? 'Sonstige Fruchtarten (60)' : 'Sonstige Fruchtarten (90)'

  const mapping = mappings.find((m) => m.crop_id === cropId)
  // Fallback to "Sonstige Fruchtarten" for unmapped crops
  const cropGroup = mapping?.crop_group ?? sonstigeGroup

  const findMatch = (group: string): number | null => {
    const match = values.find(
      (v) =>
        v.crop_group === group &&
        v.region === region &&
        v.depth_cm === depthCm &&
        v.year === year,
    )
    return match?.value_kg_ha ?? null
  }

  const direct = findMatch(cropGroup)
  if (direct != null) return direct

  // Zweistufiger Fallback: gemappte Crop ohne regionalen Wert → "Sonstige Fruchtarten"
  // (besser ein regionaler Richtwert als gar kein Nmin → sonst Überdüngungs-Empfehlung)
  if (cropGroup !== sonstigeGroup) {
    return findMatch(sonstigeGroup)
  }

  return null
}
