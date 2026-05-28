ALTER TABLE public.animals
  ALTER COLUMN dueno DROP DEFAULT,
  ALTER COLUMN dueno TYPE text[] USING (
    CASE
      WHEN dueno IS NULL OR btrim(dueno) = '' THEN ARRAY[]::text[]
      ELSE ARRAY[dueno]
    END
  ),
  ALTER COLUMN dueno SET DEFAULT ARRAY[]::text[],
  ALTER COLUMN dueno SET NOT NULL;