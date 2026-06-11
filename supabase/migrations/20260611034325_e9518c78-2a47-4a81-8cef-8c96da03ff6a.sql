-- 1) Esquema
ALTER TABLE public.animal_events
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'hecho';

ALTER TABLE public.animal_events
  ADD COLUMN IF NOT EXISTS fecha_ejecucion date;

ALTER TABLE public.animal_events
  DROP CONSTRAINT IF EXISTS animal_events_estado_check;

ALTER TABLE public.animal_events
  ADD CONSTRAINT animal_events_estado_check
  CHECK (estado IN ('hecho', 'programado'));

CREATE INDEX IF NOT EXISTS animal_events_programados_idx
  ON public.animal_events (fecha_ejecucion)
  WHERE estado = 'programado';

-- 2) Trigger validar_animal_event (extendido)
CREATE OR REPLACE FUNCTION public.validar_animal_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- La fecha de registro nunca puede ser futura
  IF NEW.fecha > CURRENT_DATE THEN
    RAISE EXCEPTION 'La fecha del evento no puede ser futura';
  END IF;

  -- Validaciones por tipo (payload + cálculo base de is_terminal)
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

  -- Reglas de programación
  IF NEW.estado = 'programado' THEN
    IF NEW.fecha_ejecucion IS NULL THEN
      RAISE EXCEPTION 'Un evento programado requiere fecha_ejecucion';
    END IF;
    IF NEW.fecha_ejecucion < CURRENT_DATE THEN
      RAISE EXCEPTION 'fecha_ejecucion no puede ser pasada';
    END IF;
    -- Un evento programado nunca cierra al animal
    NEW.is_terminal := false;
  ELSIF NEW.estado = 'hecho' THEN
    -- Limpiar fecha_ejecucion para evitar estados ambiguos
    NEW.fecha_ejecucion := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3) RPC registrar_evento_masivo (extendida con parámetros opcionales)
CREATE OR REPLACE FUNCTION public.registrar_evento_masivo(
  p_animal_ids uuid[],
  p_tipo animal_event_type,
  p_fecha date,
  p_payload jsonb,
  p_observaciones text DEFAULT NULL,
  p_estado text DEFAULT 'hecho',
  p_fecha_ejecucion date DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_batch_id uuid := gen_random_uuid();
  v_user_id uuid := auth.uid();
  v_animal_id uuid;
  v_estado text := COALESCE(p_estado, 'hecho');
  v_fecha_ejecucion date := p_fecha_ejecucion;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  IF p_animal_ids IS NULL OR array_length(p_animal_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Debe seleccionar al menos un animal';
  END IF;

  IF v_estado NOT IN ('hecho', 'programado') THEN
    RAISE EXCEPTION 'estado inválido: %', v_estado;
  END IF;

  IF v_estado = 'programado' THEN
    IF v_fecha_ejecucion IS NULL THEN
      RAISE EXCEPTION 'Un evento programado requiere fecha_ejecucion';
    END IF;
    IF v_fecha_ejecucion < CURRENT_DATE THEN
      RAISE EXCEPTION 'fecha_ejecucion no puede ser pasada';
    END IF;
  ELSE
    v_fecha_ejecucion := NULL;
  END IF;

  FOREACH v_animal_id IN ARRAY p_animal_ids LOOP
    INSERT INTO public.animal_events (
      animal_id, user_id, tipo, fecha, payload, observaciones, batch_id,
      estado, fecha_ejecucion
    ) VALUES (
      v_animal_id, v_user_id, p_tipo, p_fecha,
      COALESCE(p_payload, '{}'::jsonb), p_observaciones, v_batch_id,
      v_estado, v_fecha_ejecucion
    );

    -- Los efectos sobre animals solo aplican cuando el evento es 'hecho'
    IF v_estado = 'hecho' THEN
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
    END IF;
  END LOOP;

  RETURN v_batch_id;
END;
$function$;