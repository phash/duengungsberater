import type { FertilizerProduct } from '@/types'

// Initiale Düngerprodukte — werden später in Supabase Admin-pflegbar
// Affiliate-Links: Dünger-Shop.de via adseed GmbH (15% Commission, 90 Tage Cookie)

export const FERTILIZER_PRODUCTS: FertilizerProduct[] = [
  {
    id: 'fp-kas',
    name: 'Kalkammonsalpeter (KAS) 27% N',
    n_pct: 27, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 4, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',  // TODO: Affiliate-Link nach Freischaltung eintragen
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-harnstoff',
    name: 'Harnstoff 46% N',
    n_pct: 46, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-dap',
    name: 'DAP 18/46',
    n_pct: 18, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-triplephosphat',
    name: 'Triple-Superphosphat 46% P2O5',
    n_pct: 0, p2o5_pct: 46, k2o_pct: 0, mgo_pct: 0, s_pct: 0,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-kornkali',
    name: 'Kornkali 40% K2O + 6% MgO',
    n_pct: 0, p2o5_pct: 0, k2o_pct: 40, mgo_pct: 6, s_pct: 4,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-npk-15-15-15',
    name: 'NPK 15-15-15',
    n_pct: 15, p2o5_pct: 15, k2o_pct: 15, mgo_pct: 2, s_pct: 8,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-ass',
    name: 'Ammonsulfatsalpeter (ASS) 26% N + 13% S',
    n_pct: 26, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 0, s_pct: 13,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
  {
    id: 'fp-kieserit',
    name: 'Kieserit 25% MgO + 20% S',
    n_pct: 0, p2o5_pct: 0, k2o_pct: 0, mgo_pct: 25, s_pct: 20,
    form: 'mineral',
    affiliate_url: '',
    shop_name: 'Dünger-Shop.de',
    active: true,
  },
]
