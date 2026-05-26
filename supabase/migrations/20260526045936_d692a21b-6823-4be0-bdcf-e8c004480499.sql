ALTER TABLE public.animals
  ALTER COLUMN ubicacion_actual SET DEFAULT 'Mi rancho';

UPDATE public.animals
   SET ubicacion_actual = 'Mi rancho'
 WHERE ubicacion_actual IS NULL OR btrim(ubicacion_actual) = '';