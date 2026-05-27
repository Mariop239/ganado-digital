
-- 1) Add user_id columns with default auth.uid()
ALTER TABLE public.animals
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE public.animal_events
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE public.control_vacunas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE public.historial
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE public.vacas
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_animals_user_id ON public.animals(user_id);
CREATE INDEX IF NOT EXISTS idx_animal_events_user_id ON public.animal_events(user_id);
CREATE INDEX IF NOT EXISTS idx_control_vacunas_user_id ON public.control_vacunas(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_user_id ON public.historial(user_id);
CREATE INDEX IF NOT EXISTS idx_vacas_user_id ON public.vacas(user_id);

-- 2) Drop existing permissive policies and replace with strict per-user policies
-- animals
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver animals" ON public.animals;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear animals" ON public.animals;
DROP POLICY IF EXISTS "Usuarios autenticados pueden editar animals" ON public.animals;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar animals" ON public.animals;

CREATE POLICY "Users select own animals" ON public.animals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own animals" ON public.animals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own animals" ON public.animals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own animals" ON public.animals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- animal_events
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver animal_events" ON public.animal_events;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear animal_events" ON public.animal_events;
DROP POLICY IF EXISTS "Usuarios autenticados pueden editar animal_events" ON public.animal_events;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar animal_events" ON public.animal_events;

CREATE POLICY "Users select own animal_events" ON public.animal_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own animal_events" ON public.animal_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own animal_events" ON public.animal_events
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own animal_events" ON public.animal_events
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- control_vacunas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver vacunas" ON public.control_vacunas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear vacunas" ON public.control_vacunas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden editar vacunas" ON public.control_vacunas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar vacunas" ON public.control_vacunas;

CREATE POLICY "Users select own vacunas" ON public.control_vacunas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vacunas" ON public.control_vacunas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vacunas" ON public.control_vacunas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vacunas" ON public.control_vacunas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- historial
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver historial" ON public.historial;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear historial" ON public.historial;
DROP POLICY IF EXISTS "Usuarios autenticados pueden editar historial" ON public.historial;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar historial" ON public.historial;

CREATE POLICY "Users select own historial" ON public.historial
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own historial" ON public.historial
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own historial" ON public.historial
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own historial" ON public.historial
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- vacas
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver vacas" ON public.vacas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear vacas" ON public.vacas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden editar vacas" ON public.vacas;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar vacas" ON public.vacas;

CREATE POLICY "Users select own vacas" ON public.vacas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own vacas" ON public.vacas
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own vacas" ON public.vacas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vacas" ON public.vacas
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3) Update sync triggers to propagate user_id between animals <-> vacas
CREATE OR REPLACE FUNCTION public.sync_animals_to_vacas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('app.sync_in_progress', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP <> 'DELETE' AND NEW.sexo <> 'hembra' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.sync_in_progress', 'on', true);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vacas (
      numero, nombre, color, raza, dueno, madre, padre,
      fecha_egreso, motivo_egreso, created_at, updated_at, user_id
    ) VALUES (
      NEW.numero, NEW.nombre, NEW.color, NEW.raza, NEW.dueno,
      NEW.madre_texto, NEW.padre_texto,
      NEW.fecha_egreso, NEW.motivo_egreso,
      NEW.created_at, NEW.updated_at, NEW.user_id
    )
    ON CONFLICT (numero) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.vacas SET
      nombre = NEW.nombre,
      color = NEW.color,
      raza = NEW.raza,
      dueno = NEW.dueno,
      madre = NEW.madre_texto,
      padre = NEW.padre_texto,
      fecha_egreso = NEW.fecha_egreso,
      motivo_egreso = NEW.motivo_egreso,
      user_id = COALESCE(user_id, NEW.user_id)
    WHERE numero = NEW.numero;

    IF NEW.numero <> OLD.numero THEN
      UPDATE public.vacas SET numero = NEW.numero WHERE numero = OLD.numero;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.sexo = 'hembra' THEN
      DELETE FROM public.vacas WHERE numero = OLD.numero;
    END IF;
  END IF;

  PERFORM set_config('app.sync_in_progress', 'off', true);
  RETURN COALESCE(NEW, OLD);
END;
$function$;

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
      color, raza, dueno, created_at, updated_at, user_id
    ) VALUES (
      NEW.numero, NEW.nombre, 'hembra', 'vaca',
      CASE WHEN NEW.fecha_egreso IS NULL THEN 'activa' ELSE 'vendida' END,
      NEW.fecha_egreso, NEW.motivo_egreso,
      COALESCE(NEW.madre, ''), COALESCE(NEW.padre, ''),
      COALESCE(NEW.color, ''), COALESCE(NEW.raza, ''), COALESCE(NEW.dueno, ''),
      NEW.created_at, NEW.updated_at, NEW.user_id
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
