import { supabase } from "@/integrations/supabase/client";
import type { VacaInput, EgresoInput } from "./schemas";

export type Vaca = {
  numero: string;
  dueno: string;
  nombre: string;
  color: string;
  raza: string;
  padre: string;
  madre: string;
  fecha_egreso: string | null;
  motivo_egreso: string | null;
  created_at: string;
  updated_at: string;
};

export async function listVacas(soloActivas = true): Promise<Vaca[]> {
  let q = supabase.from("vacas").select("*").order("numero", { ascending: true });
  if (soloActivas) q = q.is("fecha_egreso", null);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getVaca(numero: string): Promise<Vaca | null> {
  const { data, error } = await supabase.from("vacas").select("*").eq("numero", numero).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createVaca(input: VacaInput): Promise<Vaca> {
  const { data, error } = await supabase.from("vacas").insert(input).select().single();
  if (error) {
    if (error.code === "23505") throw new Error("Ya existe una vaca con ese número");
    throw error;
  }
  return data;
}

export async function updateVaca(numero: string, input: Partial<VacaInput>): Promise<Vaca> {
  const { data, error } = await supabase.from("vacas").update(input).eq("numero", numero).select().single();
  if (error) throw error;
  return data;
}

export async function marcarEgreso(numero: string, input: EgresoInput): Promise<Vaca> {
  const { data, error } = await supabase
    .from("vacas")
    .update({ fecha_egreso: input.fecha_egreso, motivo_egreso: input.motivo_egreso })
    .eq("numero", numero)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function reactivarVaca(numero: string): Promise<Vaca> {
  const { data, error } = await supabase
    .from("vacas")
    .update({ fecha_egreso: null, motivo_egreso: null })
    .eq("numero", numero)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVaca(numero: string): Promise<void> {
  const { error } = await supabase.from("vacas").delete().eq("numero", numero);
  if (error) throw error;
}