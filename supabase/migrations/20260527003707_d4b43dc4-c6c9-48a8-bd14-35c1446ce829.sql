
ALTER TABLE public.control_vacunas
  ADD COLUMN IF NOT EXISTS estado_tratamiento text NOT NULL DEFAULT 'aplicado';

ALTER TABLE public.control_vacunas
  DROP CONSTRAINT IF EXISTS control_vacunas_estado_tratamiento_check;

ALTER TABLE public.control_vacunas
  ADD CONSTRAINT control_vacunas_estado_tratamiento_check
  CHECK (estado_tratamiento IN ('aplicado','programado'));

ALTER TABLE public.control_vacunas
  ALTER COLUMN fecha DROP NOT NULL;
