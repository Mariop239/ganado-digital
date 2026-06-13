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
  const { data, error } = await supabase
    .from("animal_events")
    .insert({
      animal_id: animalId,
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

export async function listAllEvents(): Promise<AnimalEvent[]> {
  const { data, error } = await supabase
    .from("animal_events")
    .select("*")
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AnimalEvent[];
}

export async function createBulkEvents<T extends AnimalEventType>(
  animalIds: string[],
  input: AnimalEventInput<T>,
): Promise<string> {
  const { data, error } = await (supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: unknown }>;
  }).rpc("registrar_evento_masivo", {
    p_animal_ids: animalIds,
    p_tipo: input.tipo,
    p_fecha: input.fecha,
    p_payload: (input.payload ?? {}) as EventPayloadMap[T],
    p_observaciones: input.observaciones ?? null,
    p_estado: input.estado ?? "hecho",
    p_fecha_ejecucion: input.fecha_ejecucion ?? null,
  });
  if (error) throw error;
  return data as string;
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