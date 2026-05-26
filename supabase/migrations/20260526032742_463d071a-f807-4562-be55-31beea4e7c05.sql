ALTER TABLE public.animal_events  DROP CONSTRAINT IF EXISTS animal_events_vaca_numero_fkey;
ALTER TABLE public.control_vacunas DROP CONSTRAINT IF EXISTS control_vacunas_vaca_numero_fkey;
ALTER TABLE public.historial      DROP CONSTRAINT IF EXISTS historial_vaca_numero_fkey;