
ALTER TABLE public.historial
  ADD COLUMN IF NOT EXISTS tipo_servicio TEXT NOT NULL DEFAULT 'monta_natural',
  ADD COLUMN IF NOT EXISTS estado_servicio TEXT NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS fecha_probable_parto DATE,
  ADD COLUMN IF NOT EXISTS cria_animal_id UUID;

ALTER TABLE public.historial
  DROP CONSTRAINT IF EXISTS historial_tipo_servicio_check,
  DROP CONSTRAINT IF EXISTS historial_estado_servicio_check;

ALTER TABLE public.historial
  ADD CONSTRAINT historial_tipo_servicio_check
    CHECK (tipo_servicio IN ('monta_natural','inseminacion')),
  ADD CONSTRAINT historial_estado_servicio_check
    CHECK (estado_servicio IN ('pendiente','prenada','vacia','parida'));

-- Backfill
UPDATE public.historial
  SET estado_servicio = CASE WHEN fecha_parto IS NOT NULL THEN 'parida' ELSE 'pendiente' END,
      fecha_probable_parto = COALESCE(fecha_probable_parto, fecha_monta + INTERVAL '283 days')::date
  WHERE fecha_probable_parto IS NULL OR estado_servicio = 'pendiente';
