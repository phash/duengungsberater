import { supabase } from './supabase'
import { db } from '@/db/dexie'

export async function syncAll(): Promise<{ synced: number; errors: number }> {
  if (!navigator.onLine) return { synced: 0, errors: 0 }

  let synced = 0
  let errors = 0

  // 1. Felder synchronisieren
  const unsyncedFields = await db.fields.filter((f) => !f.synced).toArray()
  for (const field of unsyncedFields) {
    try {
      const { data, error } = await supabase
        .from('fields')
        .upsert({
          id: field.id,
          name: field.name,
          size_ha: field.size_ha,
          nmin_0_30: field.nmin_0_30,
          nmin_30_60: field.nmin_30_60,
          nmin_60_90: field.nmin_60_90,
        })
        .select()
        .single()

      if (error) throw error
      await db.fields.update(field.id, { synced: true, ...data })
      synced++
    } catch {
      errors++
    }
  }

  // 2. Anbauplanungen synchronisieren (inkl. Korrektur-FKs)
  const unsyncedPlans = await db.fieldCropPlans.filter((p) => !p.synced).toArray()
  for (const plan of unsyncedPlans) {
    try {
      const { data, error } = await supabase
        .from('field_crop_plans')
        .upsert({
          id: plan.id,
          field_id: plan.field_id,
          crop_id: plan.crop_id,
          season_year: plan.season_year,
          expected_yield_dt_ha: plan.expected_yield_dt_ha,
          vorfrucht_correction_id: plan.vorfrucht_correction_id,
          zwischenfrucht_correction_id: plan.zwischenfrucht_correction_id,
          humus_correction_id: plan.humus_correction_id,
        })
        .select()
        .single()

      if (error) throw error
      await db.fieldCropPlans.update(plan.id, { synced: true, ...data })
      synced++
    } catch {
      errors++
    }
  }

  return { synced, errors }
}

export async function cacheStammdaten(userId?: string): Promise<void> {
  if (!navigator.onLine) return

  const baseQueries = Promise.all([
    supabase.from('nutrient_types').select('*'),
    supabase.from('crops').select('*'),
    supabase.from('crop_nutrient_demands').select('*').eq('source', 'lfl'),
    supabase.from('corrections').select('*'),
    supabase.from('correction_values').select('*'),
    supabase.from('fertilizer_products').select('*').eq('active', true),
  ])

  const userDemandsQuery = userId
    ? supabase.from('crop_nutrient_demands').select('*').eq('source', 'user').eq('user_id', userId)
    : Promise.resolve({ data: null })

  const [baseResults, userResult] = await Promise.all([baseQueries, userDemandsQuery])
  const [
    { data: nutrients },
    { data: crops },
    { data: lflDemands },
    { data: corrections },
    { data: correctionValues },
    { data: products },
  ] = baseResults

  if (nutrients) await db.nutrientTypes.bulkPut(nutrients)
  if (crops) await db.crops.bulkPut(crops)
  if (lflDemands) await db.cropNutrientDemands.bulkPut(lflDemands)
  if (corrections) await db.corrections.bulkPut(corrections)
  if (correctionValues) await db.correctionValues.bulkPut(correctionValues)
  if (products) await db.fertilizerProducts.bulkPut(products)
  if (userResult.data) await db.cropNutrientDemands.bulkPut(userResult.data)
}
