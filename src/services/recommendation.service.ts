import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
import type { Recommendation, RecommendationValue } from '@/types'

/**
 * Lokale Aufräum-Kaskade (Dexie): löscht Empfehlungen + deren Werte für die
 * übergebenen Plan-IDs. Serverseitig erledigt das FK ON DELETE CASCADE — lokal
 * müssen wir Waisen-Einträge selbst entfernen, sonst bleiben sie in IndexedDB.
 */
export async function deleteLocalRecommendationsForPlans(planIds: string[]): Promise<void> {
  if (planIds.length === 0) return
  const recs = await db.recommendations.where('field_crop_plan_id').anyOf(planIds).toArray()
  const recIds = recs.map((r) => r.id)
  if (recIds.length === 0) return
  await db.recommendationValues.where('recommendation_id').anyOf(recIds).delete()
  await db.recommendations.bulkDelete(recIds)
}

export async function saveRecommendation(
  fieldCropPlanId: string,
  values: Omit<RecommendationValue, 'id' | 'recommendation_id'>[],
  offline: boolean,
): Promise<Recommendation> {
  const auth = useAuthStore()
  const recommendation: Recommendation = {
    id: crypto.randomUUID(),
    field_crop_plan_id: fieldCropPlanId,
    calculated_at: new Date().toISOString(),
    calculated_offline: offline,
  }

  const saveOffline = async () => {
    await db.recommendations.put(recommendation)
    const recValues = values.map((v) => ({
      ...v,
      id: crypto.randomUUID(),
      recommendation_id: recommendation.id,
    }))
    await db.recommendationValues.bulkPut(recValues)
    return recommendation
  }

  if (auth.isGuest || !navigator.onLine || offline) return saveOffline()

  try {
    const { data: recData, error: recError } = await supabase
      .from('recommendations')
      .insert({
        field_crop_plan_id: fieldCropPlanId,
        calculated_offline: false,
      })
      .select()
      .single()

    if (recError) throw recError

    const savedRec = recData as Recommendation
    const recValues = values.map((v) => ({
      ...v,
      recommendation_id: savedRec.id,
    }))

    const { error: valError } = await supabase.from('recommendation_values').insert(recValues)

    if (valError) throw valError

    await db.recommendations.put(savedRec)
    return savedRec
  } catch {
    return saveOffline()
  }
}

export async function getRecommendation(
  fieldCropPlanId: string,
): Promise<{ recommendation: Recommendation; values: RecommendationValue[] } | null> {
  // Zuerst lokal schauen
  const local = await db.recommendations.where('field_crop_plan_id').equals(fieldCropPlanId).last()

  if (local) {
    const values = await db.recommendationValues
      .where('recommendation_id')
      .equals(local.id)
      .toArray()
    return { recommendation: local, values }
  }

  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) return null

  const { data, error } = await supabase
    .from('recommendations')
    .select('*, recommendation_values(*)')
    .eq('field_crop_plan_id', fieldCropPlanId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data) return null

  const rec = data as Recommendation & { recommendation_values: RecommendationValue[] }
  await db.recommendations.put({
    id: rec.id,
    field_crop_plan_id: rec.field_crop_plan_id,
    calculated_at: rec.calculated_at,
    calculated_offline: rec.calculated_offline,
  })
  await db.recommendationValues.bulkPut(rec.recommendation_values)

  return { recommendation: rec, values: rec.recommendation_values }
}
