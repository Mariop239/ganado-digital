import { supabase } from "@/integrations/supabase/client";
import type { Historial, ServicioInput } from "../types/domain";
import { updateEstadoReproductivo } from "@/modules/animals/repositories/animals.repository";
import type { EstadoReproductivo } from "@/modules/animals/types/domain";
import type { EstadoServicio } from "../types/domain";

function mapEstadoServicio(estado: EstadoServicio): EstadoReproductivo | null {
  switch (estado) {
    case "prenada": return "gestante";
    case "vacia": return "soltera";
    case "parida": return "parida";
    default: return null;
  }
}

async function syncEstadoAnimal(animalId: string, estado: EstadoServicio) {
  const mapped = mapEstadoServicio(estado);
  if (!mapped) return;
  try {
    await updateEstadoReproductivo(animalId, mapped);
  } catch (e) {
    console.error("syncEstadoAnimal failed", e);
  }
}

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
    fecha_probable_parto:
      input.estado_servicio === "vacia" ? null : addDays(input.fecha_monta, 283),
    fecha_confirmacion: input.fecha_confirmacion ?? null,
    observaciones: input.observaciones || null,
  };
}

export async function listHistorial(animalId: string): Promise<Historial[]> {
  const { data, error } = await supabase
    .from("historial")
    .select("*")
    .eq("animal_id", animalId)
    .order("fecha_monta", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Historial[];
}

export async function createServicio(
  animalId: string,
  input: ServicioInput,
): Promise<Historial> {
  const { data, error } = await supabase
    .from("historial")
    .insert({ animal_id: animalId, ...normalizeServicio(input) })
    .select()
    .single();
  if (error) throw error;
  await syncEstadoAnimal(animalId, input.estado_servicio);
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
  const row = data as Historial;
  if (row.animal_id) {
    await syncEstadoAnimal(row.animal_id, input.estado_servicio);
  }
  return row;
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
  const row = data as Historial;
  if (row.animal_id) {
    await syncEstadoAnimal(row.animal_id, "parida");
  }
  return row;
}

export async function deleteHistorial(id: string): Promise<void> {
  const { error } = await supabase.from("historial").delete().eq("id", id);
  if (error) throw error;
}