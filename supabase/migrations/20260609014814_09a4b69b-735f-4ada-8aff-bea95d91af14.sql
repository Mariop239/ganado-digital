-- Tabla para idempotencia de recordatorios sanitarios enviados
CREATE TABLE public.scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  animal_id UUID NOT NULL,
  vacuna_id UUID NOT NULL REFERENCES public.control_vacunas(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL CHECK (tipo_alerta IN ('15d','5d','0d')),
  fecha_objetivo DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vacuna_id, tipo_alerta, fecha_objetivo)
);

CREATE INDEX idx_scheduled_notifications_user ON public.scheduled_notifications(user_id);
CREATE INDEX idx_scheduled_notifications_vacuna ON public.scheduled_notifications(vacuna_id);

GRANT SELECT ON public.scheduled_notifications TO authenticated;
GRANT ALL ON public.scheduled_notifications TO service_role;

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.scheduled_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_scheduled_notifications_updated_at
  BEFORE UPDATE ON public.scheduled_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();