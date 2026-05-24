CREATE TABLE public.control_vacunas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaca_numero TEXT NOT NULL REFERENCES public.vacas(numero) ON DELETE CASCADE ON UPDATE CASCADE,
  fecha DATE NOT NULL,
  vacuna_aplicada TEXT NOT NULL,
  enfermedad_a_prevenir TEXT NOT NULL DEFAULT '',
  gasto NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (gasto >= 0),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cv_vaca ON public.control_vacunas(vaca_numero);
CREATE INDEX idx_cv_fecha ON public.control_vacunas(fecha DESC);

ALTER TABLE public.control_vacunas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver vacunas"
  ON public.control_vacunas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados pueden crear vacunas"
  ON public.control_vacunas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden editar vacunas"
  ON public.control_vacunas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar vacunas"
  ON public.control_vacunas FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_cv_updated_at
  BEFORE UPDATE ON public.control_vacunas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();