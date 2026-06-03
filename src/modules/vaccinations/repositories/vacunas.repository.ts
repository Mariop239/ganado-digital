import { supabase } from "@/integrations/supabase/client";
import type { Vacuna, VacunaConVaca, VacunaInput } from "../types/domain";

function normalize(input: VacunaInput) {
  const aplicado = input.estado_tratamiento === "aplicado";
  return {
    tipo_tratamiento: input.tipo_tratamiento,
    estado_tratamiento: input.estado_tratamiento,
    fecha: aplicado ? input.fecha : null,
    vacuna_aplicada: input.vacuna_aplicada,
    enfermedad_a_prevenir: input.enfermedad_a_prevenir ?? "",
    gasto: Number(input.gasto) || 0,
    observaciones: input.observaciones?.trim() ? input.observaciones : null,
    fecha_proxima_dosis: input.fecha_proxima_dosis?.trim() ? input.fecha_proxima_dosis : null,
  };
}

export async function listVacunasGlobal(): Promise<VacunaConVaca[]> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .select("*, animals(numero, nombre)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as VacunaConVaca[];
}

export async function listVacunasPorAnimal(animalId: string): Promise<Vacuna[]> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .select("*")
    .eq("animal_id", animalId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Vacuna[];
}

export async function createVacuna(
  animalId: string,
  input: VacunaInput,
): Promise<Vacuna> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .insert({ animal_id: animalId, ...normalize(input) })
    .select()
    .single();
  if (error) throw error;
  return data as Vacuna;
}

export type AnimalTarget = { animal_id: string };

export async function createVacunasBulk(
  animales: AnimalTarget[],
  input: VacunaInput,
): Promise<{ count: number; batchId: string | null }> {
  if (animales.length === 0) return { count: 0, batchId: null };
  const payload = normalize(input);
  const batchId = animales.length > 1 ? crypto.randomUUID() : null;
  const rows = animales.map((a) => ({
    animal_id: a.animal_id,
    ...payload,
    batch_id: batchId,
  }));
  const { error, count } = await supabase
    .from("control_vacunas")
    .insert(rows, { count: "exact" });
  if (error) throw error;
  return { count: count ?? rows.length, batchId };
}

export async function resolverAlerta(id: string, fechaAplicacion: string): Promise<void> {
  const { error } = await supabase
    .from("control_vacunas")
    .update({
      estado_tratamiento: "aplicado",
      fecha: fechaAplicacion,
      fecha_proxima_dosis: null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteVacuna(id: string): Promise<void> {
  const { error } = await supabase.from("control_vacunas").delete().eq("id", id);
  if (error) throw error;
}