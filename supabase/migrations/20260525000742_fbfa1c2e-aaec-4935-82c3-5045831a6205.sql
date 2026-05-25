-- 1. Enum de tipos de evento
CREATE TYPE public.animal_event_type AS ENUM (
  'venta', 'fallecimiento', 'traslado', 'observacion', 'tratamiento', 'otro'
);

-- 2. Tabla principal
CREATE TABLE public.animal_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaca_numero   TEXT NOT NULL REFERENCES public.vacas(numero) ON DELETE CASCADE ON UPDATE CASCADE,
  tipo          public.animal_event_type NOT NULL,
  fecha         DATE NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  observaciones TEXT,
  is_terminal   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_animal_events_vaca_fecha ON public.animal_events(vaca_numero, fecha DESC);
CREATE INDEX idx_animal_events_tipo ON public.animal_events(tipo);
CREATE INDEX idx_animal_events_payload ON public.animal_events USING GIN (payload);

-- 3. RLS
ALTER TABLE public.animal_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver animal_events"
  ON public.animal_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden crear animal_events"
  ON public.animal_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden editar animal_events"
  ON public.animal_events FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden eliminar animal_events"
  ON public.animal_events FOR DELETE TO authenticated USING (true);

-- 4. Trigger updated_at
CREATE TRIGGER trg_animal_events_updated_at
  BEFORE UPDATE ON public.animal_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Validación + cálculo de is_terminal
CREATE OR REPLACE FUNCTION public.validar_animal_event()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.fecha > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha del evento no puede ser futura';
  END IF;

  CASE NEW.tipo
    WHEN 'venta' THEN
      IF NOT (NEW.payload ? 'comprador' AND NEW.payload ? 'valor') THEN
        RAISE EXCEPTION 'Venta requiere comprador y valor en payload';
      END IF;
      NEW.is_terminal := true;
    WHEN 'fallecimiento' THEN
      IF NOT (NEW.payload ? 'causa') THEN
        RAISE EXCEPTION 'Fallecimiento requiere causa en payload';
      END IF;
      NEW.is_terminal := true;
    WHEN 'traslado' THEN
      IF NOT (NEW.payload ? 'destino') THEN
        RAISE EXCEPTION 'Traslado requiere destino en payload';
      END IF;
      NEW.is_terminal := false;
    ELSE
      NEW.is_terminal := false;
  END CASE;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validar_animal_event
  BEFORE INSERT OR UPDATE ON public.animal_events
  FOR EACH ROW EXECUTE FUNCTION public.validar_animal_event();

-- 6. Sincronización del cache en vacas
CREATE OR REPLACE FUNCTION public.sync_vaca_estado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  motivo_text TEXT;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.is_terminal THEN
    motivo_text := NEW.tipo::text;
    IF NEW.payload ? 'causa' THEN
      motivo_text := motivo_text || ': ' || (NEW.payload->>'causa');
    ELSIF NEW.payload ? 'comprador' THEN
      motivo_text := motivo_text || ': ' || (NEW.payload->>'comprador');
    ELSIF NEW.payload ? 'motivo' THEN
      motivo_text := motivo_text || ': ' || (NEW.payload->>'motivo');
    END IF;

    UPDATE public.vacas
       SET fecha_egreso = NEW.fecha,
           motivo_egreso = motivo_text
     WHERE numero = NEW.vaca_numero;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.is_terminal THEN
    -- Si se borra el evento terminal, limpiar el cache si no quedan otros terminales
    IF NOT EXISTS (
      SELECT 1 FROM public.animal_events
       WHERE vaca_numero = OLD.vaca_numero AND is_terminal AND id <> OLD.id
    ) THEN
      UPDATE public.vacas
         SET fecha_egreso = NULL, motivo_egreso = NULL
       WHERE numero = OLD.vaca_numero;
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_vaca_estado
  AFTER INSERT OR UPDATE OR DELETE ON public.animal_events
  FOR EACH ROW EXECUTE FUNCTION public.sync_vaca_estado();

-- 7. Backfill: crear evento histórico para cada vaca con egreso existente.
-- Desactivamos triggers para no sobrescribir el cache ni fallar la validación.
ALTER TABLE public.animal_events DISABLE TRIGGER trg_validar_animal_event;
ALTER TABLE public.animal_events DISABLE TRIGGER trg_sync_vaca_estado;

INSERT INTO public.animal_events (vaca_numero, tipo, fecha, payload, observaciones, is_terminal)
SELECT
  v.numero,
  'otro'::public.animal_event_type,
  v.fecha_egreso,
  jsonb_build_object('motivo', COALESCE(v.motivo_egreso, 'Sin especificar'), 'legacy', true),
  v.motivo_egreso,
  true
FROM public.vacas v
WHERE v.fecha_egreso IS NOT NULL;

ALTER TABLE public.animal_events ENABLE TRIGGER trg_validar_animal_event;
ALTER TABLE public.animal_events ENABLE TRIGGER trg_sync_vaca_estado;