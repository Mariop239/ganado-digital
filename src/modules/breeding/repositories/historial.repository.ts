import { supabase } from "@/integrations/supabase/client";
import type { Historial, ServicioInput } from "../types/domain";

// Gestación bovina ≈ 283 días.
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizeServicio(input: ServicioInput) {
  return {
    tipo_servicio: input.tipo_servicio,
    toro: input.toro ?? "",
    fecha_monta: input.fecha_monta,
    estado_servicio: input.estado_servicio,
    fecha_probable_parto: addDays(input.fecha_monta, 283),
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

export async function createServicio(
  vacaNumero: string,
  input: ServicioInput,
): Promise<Historial> {
  const { data, error } = await supabase
    .from("historial")
    .insert({ vaca_numero: vacaNumero, ...normalizeServicio(input) })
    .select()
    .single();
  if (error) throw error;
  return data as Historial;
}

export async function updateServicio(id: string, input: ServicioInput): Promise<Historial> {
  const { data, error } = await supabase
    .from("historial")
    .update(normalizeServicio(input))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Historial;
}

export type MarcarParidaInput = {
  fecha_parto: string;
  sexo_cria: "Macho" | "Hembra";
  cria_animal_id: string;
};

export async function marcarParida(id: string, input: MarcarParidaInput): Promise<Historial> {
  const { data, error } = await supabase
    .from("historial")
    .update({
      estado_servicio: "parida",
      fecha_parto: input.fecha_parto,
      sexo_cria: input.sexo_cria,
      cria_animal_id: input.cria_animal_id,
    })
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