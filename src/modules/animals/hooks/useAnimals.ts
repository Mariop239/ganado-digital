import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAnimal,
  deleteAnimal,
  listAnimals,
  marcarEgresoAnimal,
  reactivarAnimal,
  updateAnimal,
  type EgresoAnimalInput,
} from "../repositories/animals.repository";
import type { AnimalFiltros } from "../types/domain";
import type { AnimalFormOutput } from "../schemas";

export function useAnimals(filtros: AnimalFiltros = {}) {
  return useQuery({
    queryKey: ["animals", filtros],
    queryFn: () => listAnimals(filtros),
  });
}

function invalidateAll(
  qc: ReturnType<typeof useQueryClient>,
  keys?: { id?: string; numero?: string },
) {
  qc.invalidateQueries({ queryKey: ["animals"] });
  qc.invalidateQueries({ queryKey: ["vacas"] });
  if (keys?.id) {
    qc.invalidateQueries({ queryKey: ["animal-by-id", keys.id] });
    qc.invalidateQueries({ queryKey: ["animal-events", keys.id] });
    qc.invalidateQueries({ queryKey: ["historial", keys.id] });
    qc.invalidateQueries({ queryKey: ["vacunas", "por-animal", keys.id] });
  }
  if (keys?.numero) {
    qc.invalidateQueries({ queryKey: ["animal", keys.numero] });
  }
}

export function useCreateAnimal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AnimalFormOutput) => createAnimal(input),
    onSuccess: (a) => invalidateAll(qc, { id: a.id, numero: a.numero }),
  });
}

export function useUpdateAnimal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AnimalFormOutput>) => updateAnimal(id, input),
    onSuccess: (a) => invalidateAll(qc, { id, numero: a.numero }),
  });
}

export function useMarcarEgresoAnimal(id: string, numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EgresoAnimalInput) => marcarEgresoAnimal(id, numero, input),
    onSuccess: () => invalidateAll(qc, { id, numero }),
  });
}

export function useReactivarAnimal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reactivarAnimal(id),
    onSuccess: (a) => invalidateAll(qc, { id, numero: a.numero }),
  });
}

export function useDeleteAnimal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnimal(id),
    onSuccess: () => invalidateAll(qc),
  });
}