
-- =========================================================
-- Fase 1: tabla `animals` + backfill + sync bidireccional
-- =========================================================

CREATE TABLE public.animals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero               TEXT NOT NULL UNIQUE,
  nombre               TEXT NOT NULL DEFAULT '',
  sexo                 TEXT NOT NULL CHECK (sexo IN ('hembra','macho')),
  categoria            TEXT NOT NULL CHECK (categoria IN
                         ('ternero','ternera','novilla','vaca','toro','novillo')),
  estado_reproductivo  TEXT CHECK (estado_reproductivo IS NULL OR estado_reproductivo IN
                         ('soltera','gestante','parida','seca')),
  estado_actual        TEXT NOT NULL DEFAULT 'activa' CHECK (estado_actual IN
                         ('activa','vendida','fallecida')),
  fecha_nacimiento     DATE,
  color                TEXT NOT NULL DEFAULT '',
  raza                 TEXT NOT NULL DEFAULT '',
  dueno                TEXT NOT NULL DEFAULT '',
  mother_id            UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  father_id            UUID REFERENCES public.animals(id) ON DELETE SET NULL,
  madre_texto          TEXT NOT NULL DEFAULT '',
  padre_texto          TEXT NOT NULL DEFAULT '',
  fecha_egreso         DATE,
  motivo_egreso        TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_animals_categoria ON public.animals(categoria);
CREATE INDEX idx_animals_sexo      ON public.animals(sexo);
CREATE INDEX idx_animals_mother    ON public.animals(mother_id);
CREATE INDEX idx_animals_father    ON public.animals(father_id);
CREATE INDEX idx_animals_activos   ON public.animals(numero) WHERE estado_actual = 'activa';

ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver animals"
  ON public.animals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Usuarios autenticados pueden crear animals"
  ON public.animals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden editar animals"
  ON public.animals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Usuarios autenticados pueden eliminar animals"
  ON public.animals FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_animals_updated_at
  BEFORE UPDATE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------
-- Backfill desde `vacas`
-- ---------------------------------------------------------
INSERT INTO public.animals (
  numero, nombre, sexo, categoria, estado_actual,
  fecha_egreso, motivo_egreso, madre_texto, padre_texto,
  color, raza, dueno, created_at, updated_at
)
SELECT
  v.numero,
  v.nombre,
  'hembra',
  'vaca',
  CASE WHEN v.fecha_egreso IS NULL THEN 'activa' ELSE 'vendida' END,
  v.fecha_egreso,
  v.motivo_egreso,
  COALESCE(v.madre, ''),
  COALESCE(v.padre, ''),
  COALESCE(v.color, ''),
  COALESCE(v.raza, ''),
  COALESCE(v.dueno, ''),
  v.created_at,
  v.updated_at
FROM public.vacas v
ON CONFLICT (numero) DO NOTHING;

-- ---------------------------------------------------------
-- Sync bidireccional vacas <-> animals (transición segura)
-- Bandera de sesión para evitar loops entre triggers.
-- ---------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_vacas_to_animals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE numero = NEW.numero;

    IF NEW.numero <> OLD.numero THEN
      UPDATE public.animals SET numero = NEW.numero WHERE numero = OLD.numero;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    DELETE FROM public.animals WHERE numero = OLD.numero;
  END IF;

  PERFORM set_config('app.sync_in_progress', 'off', true);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sync_vacas_to_animals
  AFTER INSERT OR UPDATE OR DELETE ON public.vacas
  FOR EACH ROW EXECUTE FUNCTION public.sync_vacas_to_animals();

CREATE OR REPLACE FUNCTION public.sync_animals_to_vacas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('app.sync_in_progress', true) = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  -- Solo sincronizamos hembras hacia vacas (la tabla legacy es solo-hembras).
  IF TG_OP <> 'DELETE' AND NEW.sexo <> 'hembra' THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.sync_in_progress', 'on', true);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vacas (
      numero, nombre, color, raza, dueno, madre, padre,
      fecha_egreso, motivo_egreso, created_at, updated_at
    ) VALUES (
      NEW.numero, NEW.nombre, NEW.color, NEW.raza, NEW.dueno,
      NEW.madre_texto, NEW.padre_texto,
      NEW.fecha_egreso, NEW.motivo_egreso,
      NEW.created_at, NEW.updated_at
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
      motivo_egreso = NEW.motivo_egreso
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
$$;

CREATE TRIGGER trg_sync_animals_to_vacas
  AFTER INSERT OR UPDATE OR DELETE ON public.animals
  FOR EACH ROW EXECUTE FUNCTION public.sync_animals_to_vacas();
