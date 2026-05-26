-- Add animal_id (uuid) to event tables and backfill from numero.
-- Phase A: nullable + indexed, vaca_numero remains for legacy compatibility.

ALTER TABLE public.animal_events
  ADD COLUMN IF NOT EXISTS animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE;

ALTER TABLE public.control_vacunas
  ADD COLUMN IF NOT EXISTS animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE;

ALTER TABLE public.historial
  ADD COLUMN IF NOT EXISTS animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE;

-- Backfill: prefer animal activo; si no hay, el más reciente con ese numero.
WITH ranked AS (
  SELECT id, numero,
         ROW_NUMBER() OVER (
           PARTITION BY numero
           ORDER BY (estado_actual = 'activa') DESC, created_at DESC
         ) AS rn
  FROM public.animals
)
UPDATE public.animal_events e
   SET animal_id = r.id
  FROM ranked r
 WHERE e.animal_id IS NULL
   AND r.numero = e.vaca_numero
   AND r.rn = 1;

WITH ranked AS (
  SELECT id, numero,
         ROW_NUMBER() OVER (
           PARTITION BY numero
           ORDER BY (estado_actual = 'activa') DESC, created_at DESC
         ) AS rn
  FROM public.animals
)
UPDATE public.control_vacunas v
   SET animal_id = r.id
  FROM ranked r
 WHERE v.animal_id IS NULL
   AND r.numero = v.vaca_numero
   AND r.rn = 1;

WITH ranked AS (
  SELECT id, numero,
         ROW_NUMBER() OVER (
           PARTITION BY numero
           ORDER BY (estado_actual = 'activa') DESC, created_at DESC
         ) AS rn
  FROM public.animals
)
UPDATE public.historial h
   SET animal_id = r.id
  FROM ranked r
 WHERE h.animal_id IS NULL
   AND r.numero = h.vaca_numero
   AND r.rn = 1;

CREATE INDEX IF NOT EXISTS idx_animal_events_animal_id ON public.animal_events(animal_id);
CREATE INDEX IF NOT EXISTS idx_control_vacunas_animal_id ON public.control_vacunas(animal_id);
CREATE INDEX IF NOT EXISTS idx_historial_animal_id ON public.historial(animal_id);