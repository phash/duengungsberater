import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
import { DEFAULT_CORRECTIONS, DEFAULT_CORRECTION_VALUES } from '@/constants/corrections'
import type { Correction, CorrectionValue } from '@/types'

// --- Read (3-Tier-Fallback: Supabase → Dexie → Constants) ---

export async function getCorrections(): Promise<Correction[]> {
  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) {
    const cached = await db.corrections.toArray()
    return cached.length > 0 ? cached : DEFAULT_CORRECTIONS
  }
  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('corrections')
        .select('*')
        .order('type')
        .order('sort_order')

      if (error) throw error
      await db.corrections.bulkPut(data)
      return data as Correction[]
    } catch {
      // fall through to Dexie
    }
  }

  const cached = await db.corrections.toArray()
  if (cached.length > 0) return cached

  return DEFAULT_CORRECTIONS
}

export async function getCorrectionValues(correctionIds: string[]): Promise<CorrectionValue[]> {
  if (correctionIds.length === 0) return []

  const auth = useAuthStore()
  if (auth.isGuest) {
    const cached = await db.correctionValues.where('correction_id').anyOf(correctionIds).toArray()
    return cached.length > 0 ? cached : DEFAULT_CORRECTION_VALUES.filter((cv) => correctionIds.includes(cv.correction_id))
  }

  if (navigator.onLine) {
    try {
      const { data, error } = await supabase
        .from('correction_values')
        .select('*')
        .in('correction_id', correctionIds)

      if (error) throw error
      return data as CorrectionValue[]
    } catch {
      // fall through to Dexie
    }
  }

  const cached = await db.correctionValues.where('correction_id').anyOf(correctionIds).toArray()
  if (cached.length > 0) return cached

  return DEFAULT_CORRECTION_VALUES.filter((cv) => correctionIds.includes(cv.correction_id))
}

// --- Admin CRUD (nur Supabase, kein Offline-Support) ---

export async function createCorrection(
  correction: Omit<Correction, 'id'>,
  values: Omit<CorrectionValue, 'id' | 'correction_id'>[],
): Promise<Correction> {
  const { data, error } = await supabase
    .from('corrections')
    .insert({
      type: correction.type,
      label_de: correction.label_de,
      sort_order: correction.sort_order,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const newCorrection = data as Correction

  if (values.length > 0) {
    const { error: valError } = await supabase.from('correction_values').insert(
      values.map((v) => ({
        correction_id: newCorrection.id,
        nutrient_type_id: v.nutrient_type_id,
        value_kg_ha: v.value_kg_ha,
      })),
    )
    if (valError) throw new Error(valError.message)
  }

  return newCorrection
}

export async function updateCorrection(
  id: string,
  correction: Partial<Pick<Correction, 'label_de' | 'type' | 'sort_order'>>,
  values: Omit<CorrectionValue, 'id' | 'correction_id'>[],
): Promise<void> {
  const { error } = await supabase.from('corrections').update(correction).eq('id', id)

  if (error) throw new Error(error.message)

  // Replace values: delete all, re-insert
  const { error: delError } = await supabase
    .from('correction_values')
    .delete()
    .eq('correction_id', id)

  if (delError) throw new Error(delError.message)

  if (values.length > 0) {
    const { error: insError } = await supabase.from('correction_values').insert(
      values.map((v) => ({
        correction_id: id,
        nutrient_type_id: v.nutrient_type_id,
        value_kg_ha: v.value_kg_ha,
      })),
    )
    if (insError) throw new Error(insError.message)
  }
}

export async function deleteCorrection(id: string): Promise<void> {
  const { error } = await supabase.from('corrections').delete().eq('id', id)

  if (error) throw new Error(error.message)
}
