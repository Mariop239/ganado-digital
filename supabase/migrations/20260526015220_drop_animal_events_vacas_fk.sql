-- Permitir registrar eventos para animales machos.
-- El FK legacy a vacas(numero) bloqueaba inserts porque sync_animals_to_vacas
-- solo replica hembras en la tabla legacy `vacas`. La integridad real vive en
-- `animals.numero` (validada a nivel app por los repositorios del módulo animals).
ALTER TABLE public.animal_events
  DROP CONSTRAINT IF EXISTS animal_events_vaca_numero_fkey;
