ALTER TABLE public.control_vacunas
  ADD COLUMN IF NOT EXISTS tipo_tratamiento TEXT NOT NULL DEFAULT 'vacuna',
  ADD COLUMN IF NOT EXISTS fecha_proxima_dosis DATE;

ALTER TABLE public.control_vacunas
  DROP CONSTRAINT IF EXISTS control_vacunas_tipo_tratamiento_check;

ALTER TABLE public.control_vacunas
  ADD CONSTRAINT control_vacunas_tipo_tratamiento_check
  CHECK (tipo_tratamiento IN ('vacuna', 'vitamina', 'desparasitante', 'tratamiento_medico'));