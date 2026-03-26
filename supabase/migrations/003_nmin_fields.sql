ALTER TABLE public.fields
  ADD COLUMN IF NOT EXISTS nmin_0_30 numeric,
  ADD COLUMN IF NOT EXISTS nmin_30_60 numeric,
  ADD COLUMN IF NOT EXISTS nmin_60_90 numeric;
