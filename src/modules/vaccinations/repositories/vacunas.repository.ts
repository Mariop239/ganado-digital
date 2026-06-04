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

export async function updateVacuna(
  id: string,
  input: VacunaInput,
): Promise<Vacuna> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .update(normalize(input))
    .eq("id", id)
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

export async function resolverAlerta(
  id: string,
  fechaAplicacion: string,
  fechaProximaDosis: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("control_vacunas")
    .update({
      estado_tratamiento: "aplicado",
      fecha: fechaAplicacion,
      fecha_proxima_dosis: fechaProximaDosis,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function limpiarProximaDosis(id: string): Promise<void> {
  const { error } = await supabase
    .from("control_vacunas")
    .update({ fecha_proxima_dosis: null })
    .eq("id", id);
  if (error) throw error;
}

export async function resolverAlertasBulk(
  ids: string[],
  input: VacunaInput,
  modo: "update" | "create_and_clear",
): Promise<{ count: number; batchId: string | null }> {
  if (ids.length === 0) return { count: 0, batchId: null };
  const payload = normalize(input);

  if (modo === "update") {
    const { error, count } = await supabase
      .from("control_vacunas")
      .update(
        {
          estado_tratamiento: "aplicado",
          fecha: payload.fecha,
          fecha_proxima_dosis: payload.fecha_proxima_dosis,
          tipo_tratamiento: payload.tipo_tratamiento,
          vacuna_aplicada: payload.vacuna_aplicada,
          enfermedad_a_prevenir: payload.enfermedad_a_prevenir,
          gasto: payload.gasto,
          observaciones: payload.observaciones,
        },
        { count: "exact" },
      )
      .in("id", ids);
    if (error) throw error;
    return { count: count ?? ids.length, batchId: null };
  }

  // create_and_clear: insertar nuevos registros y limpiar próxima dosis del lote anterior
  const { data: rows, error: selErr } = await supabase
    .from("control_vacunas")
    .select("id, animal_id")
    .in("id", ids);
  if (selErr) throw selErr;
  const animales = (rows ?? [])
    .filter((r) => r.animal_id)
    .map((r) => ({ animal_id: r.animal_id as string }));
  const created = await createVacunasBulk(animales, input);

  const { error: updErr } = await supabase
    .from("control_vacunas")
    .update({ fecha_proxima_dosis: null })
    .in("id", ids);
  if (updErr) throw updErr;

  return created;
}

export async function deleteVacuna(id: string): Promise<void> {
  const { error } = await supabase.from("control_vacunas").delete().eq("id", id);
  if (error) throw error;
}