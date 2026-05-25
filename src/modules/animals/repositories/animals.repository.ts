import { supabase } from "@/integrations/supabase/client";
import type {
  Animal,
  AnimalFiltros,
  AnimalRelacionInput,
} from "../types/domain";

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