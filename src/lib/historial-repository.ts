import { supabase } from "@/integrations/supabase/client";
import type { HistorialInput } from "./schemas";

export type Historial = {
  id: string;
  vaca_numero: string;
  fecha_monta: string;
  toro: string;
  fecha_parto: string | null;
  sexo_cria: "Macho" | "Hembra" | null;
  fecha_destete: string | null;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

function normalize(input: HistorialInput) {
  return {
    fecha_monta: input.fecha_monta,
    toro: input.toro ?? "",
    fecha_parto: input.fecha_parto || null,
    sexo_cria: (input.sexo_cria as "Macho" | "Hembra") || null,
    fecha_destete: input.fecha_destete || null,
    observaciones: input.observaciones || null,
  };
}

export async function listHistorial(vacaNumero: string): Promise<Historial[]> {
  const { data, error } = await supabase
    .from("historial")
    .select("*")
    .eq("vaca_numero", vacaNumero)
    .order("fecha_monta", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Historial[];
}

export async function createHistorial(vacaNumero: string, input: HistorialInput): Promise<Historial> {
  const { data, error } = await supabase
    .from("historial")
    .insert({ vaca_numero: vacaNumero, ...normalize(input) })
    .select()
    .single();
  if (error) throw error;
  return data as Historial;
}

export async function updateHistorial(id: string, input: HistorialInput): Promise<Historial> {
  const { data, error } = await supabase
    .from("historial")
    .update(normalize(input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Historial;
}

export async function deleteHistorial(id: string): Promise<void> {
  const { error } = await supabase.from("historial").delete().eq("id", id);
  if (error) throw error;
}