import { supabase } from './supabase'
import { db } from '@/db/dexie'
import { useAuthStore } from '@/stores/auth.store'
import { FERTILIZER_PRODUCTS } from '@/constants/fertilizer-products'
import type { FertilizerProduct } from '@/types'

export async function getProducts(): Promise<FertilizerProduct[]> {
  const offlineFallback = async () => {
    const cached = await db.fertilizerProducts.toArray()
    return cached.length > 0 ? cached : FERTILIZER_PRODUCTS
  }

  const auth = useAuthStore()
  if (auth.isGuest || !navigator.onLine) return offlineFallback()

  try {
    const { data, error } = await supabase
      .from('fertilizer_products')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true })

    if (error) throw error

    const products = data as FertilizerProduct[]
    await db.fertilizerProducts.bulkPut(products)
    return products
  } catch {
    return offlineFallback()
  }
}

// --- Admin-CRUD ---

export async function getAllProducts(): Promise<FertilizerProduct[]> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase
    .from('fertilizer_products')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data as FertilizerProduct[]
}

export async function createProduct(
  product: Omit<FertilizerProduct, 'id'>,
): Promise<FertilizerProduct> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase
    .from('fertilizer_products')
    .insert(product)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as FertilizerProduct
}

export async function updateProduct(
  id: string,
  updates: Partial<FertilizerProduct>,
): Promise<FertilizerProduct> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { data, error } = await supabase
    .from('fertilizer_products')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as FertilizerProduct
}

export async function deleteProduct(id: string): Promise<void> {
  const auth = useAuthStore()
  if (auth.isGuest) throw new Error('Nicht verfügbar im Gastmodus')
  const { error } = await supabase.from('fertilizer_products').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
