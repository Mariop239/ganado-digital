import { supabase } from "@/integrations/supabase/client";
import type {
  Animal,
  AnimalFiltros,
  AnimalRelacionInput,
} from "../types/domain";
import type { AnimalFormOutput } from "../schemas";

export async function listAnimals(filtros: AnimalFiltros = {}): Promise<Animal[]> {
  let q = supabase.from("animals").select("*").order("numero", { ascending: true });
  if (filtros.sexo) q = q.eq("sexo", filtros.sexo);
  if (filtros.categoria) q = q.eq("categoria", filtros.categoria);
  if (filtros.estado_actual) q = q.eq("estado_actual", filtros.estado_actual);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Animal[];
}

export async function getAnimalByNumero(numero: string): Promise<Animal | null> {
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("numero", numero)
    .maybeSingle();
  if (error) throw error;
  return (data as Animal | null) ?? null;
}

export async function listHijos(animalId: string): Promise<Animal[]> {
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .or(`mother_id.eq.${animalId},father_id.eq.${animalId}`)
    .order("numero", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Animal[];
}

export async function updateRelaciones(
  animalId: string,
  input: AnimalRelacionInput,
): Promise<Animal> {
  const { data, error } = await supabase
    .from("animals")
    .update(input)
    .eq("id", animalId)
    .select()
    .single();
  if (error) throw error;
  return data as Animal;
}

export async function createAnimal(input: AnimalFormOutput): Promise<Animal> {
  const { data, error } = await supabase
    .from("animals")
    .insert(input)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Ya existe un animal con ese número");
    throw error;
  }
  return data as Animal;
}

export async function updateAnimal(
  numero: string,
  input: Partial<AnimalFormOutput>,
): Promise<Animal> {
  const { data, error } = await supabase
    .from("animals")
    .update(input)
    .eq("numero", numero)
    .select()
    .single();
  if (error) throw error;
  return data as Animal;
}

export async function deleteAnimal(numero: string): Promise<void> {
  const { error } = await supabase.from("animals").delete().eq("numero", numero);
  if (error) throw error;
}

export type EgresoAnimalInput = {
  fecha: string;
  motivo: string;
  estado: "vendida" | "fallecida";
};

export async function marcarEgresoAnimal(
  numero: string,
  input: EgresoAnimalInput,
): Promise<Animal> {
  // 1) Registrar evento en la timeline (informativo).
  const { error: insErr } = await supabase.from("animal_events").insert({
    vaca_numero: numero,
    tipo: "otro",
    fecha: input.fecha,
    payload: { motivo: input.motivo, estado: input.estado },
    observaciones: input.motivo,
  });
  if (insErr) throw insErr;

  // 2) Actualizar estado en animals (el trigger sync_animals_to_vacas
  //    propaga fecha_egreso/motivo_egreso a la vista legacy).
  const { data, error } = await supabase
    .from("animals")
    .update({
      estado_actual: input.estado,
      fecha_egreso: input.fecha,
      motivo_egreso: input.motivo,
    })
    .eq("numero", numero)
    .select()
    .single();
  if (error) throw error;
  return data as Animal;
}

export async function reactivarAnimal(numero: string): Promise<Animal> {
  const { data, error } = await supabase
    .from("animals")
    .update({
      estado_actual: "activa",
      fecha_egreso: null,
      motivo_egreso: null,
    })
    .eq("numero", numero)
    .select()
    .single();
  if (error) throw error;
  return data as Animal;
}