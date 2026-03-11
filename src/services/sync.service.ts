import { supabase } from './supabase'
import { db } from '@/db/dexie'

export async function syncAll(): Promise<{ synced: number; errors: number }> {
  if (!navigator.onLine) return { synced: 0, errors: 0 }

  let synced = 0
  let errors = 0

  // 1. Felder synchronisieren
  const unsyncedFields = await db.fields.where('synced').equals(0).toArray()
  for (const field of unsyncedFields) {
    try {
      const { data, error } = await supabase
        .from('fields')
        .upsert({
          id: field.id,
          name: field.name,
          size_ha: field.size_ha,
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

  // 2. Anbauplanungen synchronisieren
  const unsyncedPlans = await db.fieldCropPlans.where('synced').equals(0).toArray()
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

export async function cacheStammdaten(): Promise<void> {
  if (!navigator.onLine) return

  const [
    { data: nutrients },
    { data: crops },
    { data: demands },
    { data: corrections },
    { data: products },
  ] = await Promise.all([
    supabase.from('nutrient_types').select('*'),
    supabase.from('crops').select('*'),
    supabase.from('crop_nutrient_demands').select('*'),
    supabase.from('n_corrections').select('*'),
    supabase.from('fertilizer_products').select('*').eq('active', true),
  ])

  if (nutrients) await db.nutrientTypes.bulkPut(nutrients)
  if (crops) await db.crops.bulkPut(crops)
  if (demands) await db.cropNutrientDemands.bulkPut(demands)
  if (corrections) await db.nCorrections.bulkPut(corrections)
  if (products) await db.fertilizerProducts.bulkPut(products)
}
