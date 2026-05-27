DO $$
DECLARE target_uid uuid := '069a3e15-5d9c-4fe6-93a5-1ea7767e7a41';
BEGIN
  PERFORM set_config('app.sync_in_progress', 'on', true);
  UPDATE public.animals       SET user_id = target_uid WHERE user_id IS NULL;
  UPDATE public.vacas         SET user_id = target_uid WHERE user_id IS NULL;
  UPDATE public.animal_events SET user_id = target_uid WHERE user_id IS NULL;
  UPDATE public.control_vacunas SET user_id = target_uid WHERE user_id IS NULL;
  UPDATE public.historial     SET user_id = target_uid WHERE user_id IS NULL;
  PERFORM set_config('app.sync_in_progress', 'off', true);
END $$;