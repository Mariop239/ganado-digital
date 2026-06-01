ALTER TABLE public.control_vacunas ADD COLUMN batch_id uuid NULL;
CREATE INDEX idx_control_vacunas_batch_id ON public.control_vacunas(batch_id);