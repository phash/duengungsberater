import Dexie, { type Table } from 'dexie'
import type {
  NutrientType,
  Crop,
  CropNutrientDemand,
  Correction,
  CorrectionValue,
  FertilizerProduct,
  Field,
  FieldCropPlan,
  Recommendation,
  RecommendationValue,
} from '@/types'

export class DuengerDB extends Dexie {
  // Stammdaten (gecacht von Supabase)
  nutrientTypes!: Table<NutrientType, string>
  crops!: Table<Crop, string>
  cropNutrientDemands!: Table<CropNutrientDemand, string>
  corrections!: Table<Correction, string>
  correctionValues!: Table<CorrectionValue, string>
  fertilizerProducts!: Table<FertilizerProduct, string>

  // Landwirt-Daten (offline-fähig)
  fields!: Table<Field, string>
  fieldCropPlans!: Table<FieldCropPlan, string>
  recommendations!: Table<Recommendation, string>
  recommendationValues!: Table<RecommendationValue, string>

  constructor() {
    super('duengungsberater')

    this.version(1).stores({
      nutrientTypes: 'id, code',
      crops: 'id, category',
      cropNutrientDemands: 'id, crop_id, nutrient_type_id, [crop_id+nutrient_type_id]',
      nCorrections: 'id, type',
      fertilizerProducts: 'id, active',
      fields: 'id, user_id, synced',
      fieldCropPlans: 'id, field_id, synced',
      recommendations: 'id, field_crop_plan_id',
      recommendationValues: 'id, recommendation_id',
    })

    this.version(2).stores({
      nCorrections: null,
      corrections: 'id, type',
      correctionValues: 'id, correction_id',
    })

    this.version(3).stores({
      cropNutrientDemands: 'id, crop_id, nutrient_type_id, source, user_id, [crop_id+nutrient_type_id], [crop_id+source]',
    })
  }
}

export const db = new DuengerDB()
