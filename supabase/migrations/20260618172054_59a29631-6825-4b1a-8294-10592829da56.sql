
-- Revoke broad EXECUTE on all SECURITY DEFINER / helper functions
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_fechas_historial() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validar_animal_event() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.registrar_evento_masivo(uuid[], animal_event_type, date, jsonb, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.registrar_evento_masivo(uuid[], animal_event_type, date, jsonb, text, text, date) FROM PUBLIC, anon;

-- Authenticated users intentionally call the bulk event registration RPC from the app
GRANT EXECUTE ON FUNCTION public.registrar_evento_masivo(uuid[], animal_event_type, date, jsonb, text, text, date) TO authenticated;
