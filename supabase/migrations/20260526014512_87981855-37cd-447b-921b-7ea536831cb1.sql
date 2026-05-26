-- Permitir reuso de numero de arete cuando los animales previos estén egresados.
-- Reemplaza el UNIQUE estricto por un UNIQUE parcial sobre animales activos.

ALTER TABLE public.animals DROP CONSTRAINT IF EXISTS animals_numero_key;
DROP INDEX IF EXISTS public.animals_numero_key;

-- El índice no-único previo sobre activos pasa a ser único.
DROP INDEX IF EXISTS public.idx_animals_activos;

CREATE UNIQUE INDEX animals_numero_activa_uniq
  ON public.animals (numero)
  WHERE estado_actual = 'activa';

-- Índice de soporte para lookups por numero (sin unicidad global).
CREATE INDEX IF NOT EXISTS idx_animals_numero ON public.animals (numero);