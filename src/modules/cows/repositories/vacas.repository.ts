import { supabase } from "@/integrations/supabase/client";
import type { Vaca, VacaInput, EgresoInput } from "../types/domain";

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
  // El egreso ahora se modela como un evento terminal de tipo "otro".
  // El trigger sync_vaca_estado actualiza fecha_egreso/motivo_egreso en vacas.
  const { error: insErr } = await supabase.from("animal_events").insert({
    vaca_numero: numero,
    tipo: "otro",
    fecha: input.fecha_egreso,
    payload: { motivo: input.motivo_egreso },
    observaciones: input.motivo_egreso,
  });
  if (insErr) throw insErr;

  const { data, error } = await supabase
    .from("vacas")
    .select("*")
    .eq("numero", numero)
    .single();
  if (error) throw error;
  return data;
}

export async function reactivarVaca(numero: string): Promise<Vaca> {
  // Borrar el evento terminal más reciente. El trigger limpia el cache
  // en vacas si no quedan otros eventos terminales.
  const { data: last, error: selErr } = await supabase
    .from("animal_events")
    .select("id")
    .eq("vaca_numero", numero)
    .eq("is_terminal", true)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (selErr) throw selErr;
  if (last) {
    const { error: delErr } = await supabase
      .from("animal_events")
      .delete()
      .eq("id", last.id);
    if (delErr) throw delErr;
  } else {
    // Compatibilidad: si no había evento (no debería tras backfill), limpiar a mano.
    const { error: updErr } = await supabase
      .from("vacas")
      .update({ fecha_egreso: null, motivo_egreso: null })
      .eq("numero", numero);
    if (updErr) throw updErr;
  }

  const { data, error } = await supabase
    .from("vacas")
    .select("*")
    .eq("numero", numero)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteVaca(numero: string): Promise<void> {
  const { error } = await supabase.from("vacas").delete().eq("numero", numero);
  if (error) throw error;
}