
CREATE OR REPLACE FUNCTION public.sync_vacas_to_animals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.sync_in_progress', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  PERFORM set_config('app.sync_in_progress', 'on', true);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.animals (
      numero, nombre, sexo, categoria, estado_actual,
      fecha_egreso, motivo_egreso, madre_texto, padre_texto,
      color, raza, dueno, created_at, updated_at
    ) VALUES (
      NEW.numero, NEW.nombre, 'hembra', 'vaca',
      CASE WHEN NEW.fecha_egreso IS NULL THEN 'activa' ELSE 'vendida' END,
      NEW.fecha_egreso, NEW.motivo_egreso,
      COALESCE(NEW.madre, ''), COALESCE(NEW.padre, ''),
      COALESCE(NEW.color, ''), COALESCE(NEW.raza, ''), COALESCE(NEW.dueno, ''),
      NEW.created_at, NEW.updated_at
    )
    ON CONFLICT (numero) DO UPDATE SET
      nombre = EXCLUDED.nombre,
      fecha_egreso = EXCLUDED.fecha_egreso,
      motivo_egreso = EXCLUDED.motivo_egreso,
      madre_texto = EXCLUDED.madre_texto,
      padre_texto = EXCLUDED.padre_texto,
      color = EXCLUDED.color,
      raza = EXCLUDED.raza,
      dueno = EXCLUDED.dueno,
      estado_actual = EXCLUDED.estado_actual,
      updated_at = EXCLUDED.updated_at;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.animals SET
      nombre = NEW.nombre,
      fecha_egreso = NEW.fecha_egreso,
      motivo_egreso = NEW.motivo_egreso,
      madre_texto = COALESCE(NEW.madre, ''),
      padre_texto = COALESCE(NEW.padre, ''),
      color = COALESCE(NEW.color, ''),
      raza = COALESCE(NEW.raza, ''),
      dueno = COALESCE(NEW.dueno, ''),
      estado_actual = CASE
        WHEN NEW.fecha_egreso IS NULL THEN 'activa'
        ELSE COALESCE(NULLIF(estado_actual,'activa'), 'vendida')
      END
    WHERE numero = NEW.numero
      AND sexo = 'hembra'
      AND estado_actual = 'activa';

    IF NEW.numero <> OLD.numero THEN
      UPDATE public.animals
         SET numero = NEW.numero
       WHERE numero = OLD.numero
         AND sexo = 'hembra'
         AND estado_actual = 'activa';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.animals
     WHERE numero = OLD.numero
       AND sexo = 'hembra'
       AND estado_actual = 'activa';
  END IF;

  PERFORM set_config('app.sync_in_progress', 'off', true);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_vaca_estado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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

    PERFORM set_config('app.sync_in_progress', 'on', true);
    UPDATE public.vacas
       SET fecha_egreso = NEW.fecha,
           motivo_egreso = motivo_text
     WHERE numero = NEW.vaca_numero;
    PERFORM set_config('app.sync_in_progress', 'off', true);
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.is_terminal THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.animal_events
       WHERE vaca_numero = OLD.vaca_numero AND is_terminal AND id <> OLD.id
    ) THEN
      PERFORM set_config('app.sync_in_progress', 'on', true);
      UPDATE public.vacas
         SET fecha_egreso = NULL, motivo_egreso = NULL
       WHERE numero = OLD.vaca_numero;
      PERFORM set_config('app.sync_in_progress', 'off', true);
    END IF;
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
