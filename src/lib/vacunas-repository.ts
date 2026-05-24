import { supabase } from "@/integrations/supabase/client";
import type { VacunaInput } from "./schemas";

export type Vacuna = {
  id: string;
  vaca_numero: string;
  fecha: string;
  vacuna_aplicada: string;
  enfermedad_a_prevenir: string;
  gasto: number;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
};

export type VacunaConVaca = Vacuna & {
  vacas: { numero: string; nombre: string } | null;
};

function normalize(input: VacunaInput) {
  return {
    fecha: input.fecha,
    vacuna_aplicada: input.vacuna_aplicada,
    enfermedad_a_prevenir: input.enfermedad_a_prevenir ?? "",
    gasto: Number(input.gasto) || 0,
    observaciones: input.observaciones || null,
  };
}

export async function listVacunasGlobal(): Promise<VacunaConVaca[]> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .select("*, vacas(numero, nombre)")
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as VacunaConVaca[];
}

export async function listVacunasPorVaca(vacaNumero: string): Promise<Vacuna[]> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .select("*")
    .eq("vaca_numero", vacaNumero)
    .order("fecha", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Vacuna[];
}

export async function createVacuna(vacaNumero: string, input: VacunaInput): Promise<Vacuna> {
  const { data, error } = await supabase
    .from("control_vacunas")
    .insert({ vaca_numero: vacaNumero, ...normalize(input) })
    .select()
    .single();
  if (error) throw error;
  return data as Vacuna;
}

export async function deleteVacuna(id: string): Promise<void> {
  const { error } = await supabase.from("control_vacunas").delete().eq("id", id);
  if (error) throw error;
}