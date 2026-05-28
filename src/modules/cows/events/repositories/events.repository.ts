import { supabase } from "@/integrations/supabase/client";
import type {
  AnimalEvent,
  AnimalEventInput,
  AnimalEventType,
  EventPayloadMap,
} from "../types/domain";

export async function listEventsPorAnimal(animalId: string): Promise<AnimalEvent[]> {
  const { data, error } = await supabase
    .from("animal_events")
    .select("*")
    .eq("animal_id", animalId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AnimalEvent[];
}

export async function createEvent<T extends AnimalEventType>(
  animalId: string,
  input: AnimalEventInput<T>,
): Promise<AnimalEvent<T>> {
  const { data: animal, error: aErr } = await supabase
    .from("animals")
    .select("numero")
    .eq("id", animalId)
    .single();
  if (aErr) throw aErr;
  const { data, error } = await supabase
    .from("animal_events")
    .insert({
      animal_id: animalId,
      vaca_numero: animal.numero,
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
  animalId: string,
): Promise<AnimalEvent | null> {
  const { data, error } = await supabase
    .from("animal_events")
    .select("*")
    .eq("animal_id", animalId)
    .eq("is_terminal", true)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as AnimalEvent | null;
}