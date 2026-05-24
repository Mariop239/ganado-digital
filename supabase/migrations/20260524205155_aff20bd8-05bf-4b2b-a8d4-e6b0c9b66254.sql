
-- Función genérica de updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabla vacas
CREATE TABLE public.vacas (
  numero TEXT PRIMARY KEY,
  dueno TEXT NOT NULL DEFAULT '',
  nombre TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  raza TEXT NOT NULL DEFAULT '',
  padre TEXT NOT NULL DEFAULT '',
  madre TEXT NOT NULL DEFAULT '',
  fecha_egreso DATE,
  motivo_egreso TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vacas_nombre ON public.vacas (nombre);
CREATE INDEX idx_vacas_activas ON public.vacas (fecha_egreso) WHERE fecha_egreso IS NULL;

ALTER TABLE public.vacas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver vacas"
  ON public.vacas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden crear vacas"
  ON public.vacas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden editar vacas"
  ON public.vacas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden eliminar vacas"
  ON public.vacas FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_vacas_updated_at
  BEFORE UPDATE ON public.vacas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla historial
CREATE TABLE public.historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaca_numero TEXT NOT NULL REFERENCES public.vacas(numero) ON DELETE CASCADE,
  fecha_monta DATE NOT NULL,
  toro TEXT NOT NULL DEFAULT '',
  fecha_parto DATE,
  sexo_cria TEXT CHECK (sexo_cria IN ('Macho','Hembra')),
  fecha_destete DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_historial_vaca ON public.historial (vaca_numero, fecha_monta DESC);

ALTER TABLE public.historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver historial"
  ON public.historial FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden crear historial"
  ON public.historial FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden editar historial"
  ON public.historial FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden eliminar historial"
  ON public.historial FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_historial_updated_at
  BEFORE UPDATE ON public.historial
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validación de fechas en historial
CREATE OR REPLACE FUNCTION public.validar_fechas_historial()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fecha_parto IS NOT NULL AND NEW.fecha_parto < NEW.fecha_monta THEN
    RAISE EXCEPTION 'La fecha de parto no puede ser anterior a la fecha de monta';
  END IF;
  IF NEW.fecha_destete IS NOT NULL THEN
    IF NEW.fecha_parto IS NULL THEN
      RAISE EXCEPTION 'No se puede registrar fecha de destete sin fecha de parto';
    END IF;
    IF NEW.fecha_destete < NEW.fecha_parto THEN
      RAISE EXCEPTION 'La fecha de destete no puede ser anterior a la fecha de parto';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_historial_validar_fechas
  BEFORE INSERT OR UPDATE ON public.historial
  FOR EACH ROW EXECUTE FUNCTION public.validar_fechas_historial();
