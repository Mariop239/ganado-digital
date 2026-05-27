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
    .select("*, vacas(numero, nombre)")
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
  vacaNumero: string,
  input: VacunaInput,
): Promise<Vacuna> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .insert({ animal_id: animalId, vaca_numero: vacaNumero, ...normalize(input) })
    .select()
    .single();
  if (error) throw error;
  return data as Vacuna;
}

export type AnimalTarget = { animal_id: string; vaca_numero: string };

export async function createVacunasBulk(
  animales: AnimalTarget[],
  input: VacunaInput,
): Promise<number> {
  if (animales.length === 0) return 0;
  const payload = normalize(input);
  const rows = animales.map((a) => ({
    animal_id: a.animal_id,
    vaca_numero: a.vaca_numero,
    ...payload,
  }));
  const { error, count } = await supabase
    .from("control_vacunas")
    .insert(rows, { count: "exact" });
  if (error) throw error;
  return count ?? rows.length;
}

export async function deleteVacuna(id: string): Promise<void> {
  const { error } = await supabase.from("control_vacunas").delete().eq("id", id);
  if (error) throw error;
}