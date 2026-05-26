import { supabase } from "@/integrations/supabase/client";
import type {
  Animal,
  AnimalFiltros,
  AnimalRelacionInput,
  AnimalView,
  EstadoReproductivo,
} from "../types/domain";
import type { AnimalFormOutput } from "../schemas";
import { derivarCategoria } from "../utils/categorias";

function toView(row: Animal): AnimalView {
  const d = derivarCategoria({
    fecha_nacimiento: row.fecha_nacimiento,
    sexo: row.sexo,
    categoria: row.categoria,
  });
  // Importante: NO mutamos `row`. NO reasignamos `categoria`.
  return { ...row, ...d };
}

export async function listAnimals(filtros: AnimalFiltros = {}): Promise<AnimalView[]> {
  let q = supabase.from("animals").select("*").order("numero", { ascending: true });
  if (filtros.sexo) q = q.eq("sexo", filtros.sexo);
  if (filtros.categoria) q = q.eq("categoria", filtros.categoria);
  if (filtros.estado_actual) q = q.eq("estado_actual", filtros.estado_actual);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as Animal[]).map(toView);
}

export async function getAnimalByNumero(numero: string): Promise<AnimalView | null> {
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("numero", numero)
    // Con reuso permitido para egresados, puede haber múltiples filas con el mismo numero.
    // Priorizamos al animal activo; si no hay, el más reciente.
    .order("estado_actual", { ascending: true }) // 'activa' < 'fallecida'/'vendida' alfabéticamente
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toView(data as Animal) : null;
}

export async function getAnimalById(id: string): Promise<AnimalView | null> {
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toView(data as Animal) : null;
}

export async function listHijos(animalId: string): Promise<AnimalView[]> {
  const { data, error } = await supabase
    .from("animals")
    .select("*")
    .or(`mother_id.eq.${animalId},father_id.eq.${animalId}`)
    .order("numero", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Animal[]).map(toView);
}

export async function updateRelaciones(
  animalId: string,
  input: AnimalRelacionInput,
): Promise<AnimalView> {
  const { data, error } = await supabase
    .from("animals")
    .update(input)
    .eq("id", animalId)
    .select()
    .single();
  if (error) throw error;
  return toView(data as Animal);
}

export async function createAnimal(input: AnimalFormOutput): Promise<AnimalView> {
  // Validación de unicidad a nivel app: solo bloquea si existe un animal ACTIVO con ese numero.
  await assertNumeroDisponible(input.numero);
  const { data, error } = await supabase
    .from("animals")
    .insert(input)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Este número de arete ya está en uso por un animal activo en la finca.");
    }
    throw error;
  }
  return toView(data as Animal);
}

export async function updateAnimal(
  numero: string,
  input: Partial<AnimalFormOutput>,
): Promise<AnimalView> {
  const { data, error } = await supabase
    .from("animals")
    .update(input)
    .eq("numero", numero)
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Este número de arete ya está en uso por un animal activo en la finca.");
    }
    throw error;
  }
  return toView(data as Animal);
}

/**
 * Lanza error si ya existe un animal con `numero` en estado `activa`.
 * Permite reuso si los previos están vendidos o fallecidos.
 */
async function assertNumeroDisponible(numero: string): Promise<void> {
  if (!numero?.trim()) return;
  const { data, error } = await supabase
    .from("animals")
    .select("id")
    .eq("numero", numero)
    .eq("estado_actual", "activa")
    .limit(1);
  if (error) throw error;
  if (data && data.length > 0) {
    throw new Error("Este número de arete ya está en uso por un animal activo en la finca.");
  }
}

export async function deleteAnimal(numero: string): Promise<void> {
  const { error } = await supabase.from("animals").delete().eq("numero", numero);
  if (error) throw error;
}

export type AnimalDeleteDeps = {
  hijos: number;
  eventos: number;
  vacunas: number;
  historial: number;
};

/**
 * Verifica si un animal tiene dependencias que impidan eliminarlo
 * (crías, eventos, vacunas, historial reproductivo).
 */
export async function checkAnimalDependencies(
  id: string,
  numero: string,
): Promise<AnimalDeleteDeps> {
  const [hijos, eventos, vacunas, historial] = await Promise.all([
    supabase.from("animals").select("id", { count: "exact", head: true })
      .or(`mother_id.eq.${id},father_id.eq.${id}`),
    supabase.from("animal_events").select("id", { count: "exact", head: true })
      .eq("vaca_numero", numero),
    supabase.from("control_vacunas").select("id", { count: "exact", head: true })
      .eq("vaca_numero", numero),
    supabase.from("historial").select("id", { count: "exact", head: true })
      .eq("vaca_numero", numero),
  ]);
  if (hijos.error) throw hijos.error;
  if (eventos.error) throw eventos.error;
  if (vacunas.error) throw vacunas.error;
  if (historial.error) throw historial.error;
  return {
    hijos: hijos.count ?? 0,
    eventos: eventos.count ?? 0,
    vacunas: vacunas.count ?? 0,
    historial: historial.count ?? 0,
  };
}

/**
 * Elimina un animal por id solo si no tiene dependencias.
 * Lanza un error legible si las tiene.
 */
export async function deleteAnimalSafe(id: string, numero: string): Promise<void> {
  const deps = await checkAnimalDependencies(id, numero);
  const total = deps.hijos + deps.eventos + deps.vacunas + deps.historial;
  if (total > 0) {
    throw new Error(
      "No se puede eliminar porque tiene historial o crías registradas. Si el animal salió de la finca, registre un evento de Venta o Fallecimiento.",
    );
  }
  const { error } = await supabase.from("animals").delete().eq("id", id);
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
): Promise<AnimalView> {
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
  return toView(data as Animal);
}

export async function reactivarAnimal(numero: string): Promise<AnimalView> {
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
  return toView(data as Animal);
}

export async function updateUbicacionLote(
  numero: string,
  input: { ubicacion_actual: string; lote_actual: string | null },
): Promise<AnimalView> {
  const { data, error } = await supabase
    .from("animals")
    .update(input)
    .eq("numero", numero)
    .select()
    .single();
  if (error) throw error;
  return toView(data as Animal);
}

/**
 * Actualiza `estado_reproductivo` solo si el animal es hembra adulta
 * (categoría persistida `novilla` o `vaca`). Si no aplica, devuelve null.
 */
export async function updateEstadoReproductivo(
  numero: string,
  estado: EstadoReproductivo,
): Promise<AnimalView | null> {
  const { data: current, error: selErr } = await supabase
    .from("animals")
    .select("sexo, categoria")
    .eq("numero", numero)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!current) return null;
  if (current.sexo !== "hembra") return null;
  if (current.categoria !== "novilla" && current.categoria !== "vaca") return null;

  const { data, error } = await supabase
    .from("animals")
    .update({ estado_reproductivo: estado })
    .eq("numero", numero)
    .select()
    .single();
  if (error) throw error;
  return toView(data as Animal);
}