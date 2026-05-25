import { supabase } from "@/integrations/supabase/client";
import type {
  AnimalEvent,
  AnimalEventInput,
  AnimalEventType,
  EventPayloadMap,
} from "../types/domain";

export async function listEventsPorVaca(vacaNumero: string): Promise<AnimalEvent[]> {
  const { data, error } = await supabase
    .from("animal_events")
    .select("*")
    .eq("vaca_numero", vacaNumero)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AnimalEvent[];
}

export async function createEvent<T extends AnimalEventType>(
  vacaNumero: string,
  input: AnimalEventInput<T>,
): Promise<AnimalEvent<T>> {
  const { data, error } = await supabase
    .from("animal_events")
    .insert({
      vaca_numero: vacaNumero,
      tipo: input.tipo,
      fecha: input.fecha,
      payload: input.payload as EventPayloadMap[T],
      observaciones: input.observaciones ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AnimalEvent<T>;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from("animal_events").delete().eq("id", id);
  if (error) throw error;
}

export async function listLastTerminalEvent(
  vacaNumero: string,
): Promise<AnimalEvent | null> {
  const { data, error } = await supabase
    .from("animal_events")
    .select("*")
    .eq("vaca_numero", vacaNumero)
    .eq("is_terminal", true)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AnimalEvent | null;
}