
-- 1) batch_id column
ALTER TABLE public.animal_events
  ADD COLUMN IF NOT EXISTS batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_animal_events_batch_id
  ON public.animal_events (batch_id);

-- 2) RPC: registrar_evento_masivo
CREATE OR REPLACE FUNCTION public.registrar_evento_masivo(
  p_animal_ids uuid[],
  p_tipo public.animal_event_type,
  p_fecha date,
  p_payload jsonb,
  p_observaciones text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_batch_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
  v_animal_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_animal_ids IS NULL OR array_length(p_animal_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar al menos un animal';
  END IF;

  FOREACH v_animal_id IN ARRAY p_animal_ids LOOP
    INSERT INTO public.animal_events (
      animal_id, user_id, tipo, fecha, payload, observaciones, batch_id
    ) VALUES (
      v_animal_id, v_user_id, p_tipo, p_fecha,
      COALESCE(p_payload, '{}'::jsonb), p_observaciones, v_batch_id
    );

    IF p_tipo = 'traslado' THEN
      UPDATE public.animals
         SET ubicacion_actual = COALESCE(p_payload->>'destino', ubicacion_actual),
             lote_actual = NULLIF(p_payload->>'lote', '')
       WHERE id = v_animal_id
         AND user_id = v_user_id;
    ELSIF p_tipo = 'venta' THEN
      UPDATE public.animals
         SET estado_actual = 'vendida',
             fecha_egreso = p_fecha,
             motivo_egreso = TRIM(BOTH FROM ('Venta: ' || COALESCE(p_payload->>'comprador','')))
       WHERE id = v_animal_id
         AND user_id = v_user_id
         AND estado_actual = 'activa';
    ELSIF p_tipo = 'fallecimiento' THEN
      UPDATE public.animals
         SET estado_actual = 'fallecida',
             fecha_egreso = p_fecha,
             motivo_egreso = TRIM(BOTH FROM ('Fallecimiento: ' || COALESCE(p_payload->>'causa','')))
       WHERE id = v_animal_id
         AND user_id = v_user_id
         AND estado_actual = 'activa';
    END IF;
  END LOOP;

  RETURN v_batch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_evento_masivo(uuid[], public.animal_event_type, date, jsonb, text) TO authenticated;
