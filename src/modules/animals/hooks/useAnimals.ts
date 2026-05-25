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

function invalidateAll(qc: ReturnType<typeof useQueryClient>, numero?: string) {
  qc.invalidateQueries({ queryKey: ["animals"] });
  qc.invalidateQueries({ queryKey: ["vacas"] });
  if (numero) {
    qc.invalidateQueries({ queryKey: ["animal", numero] });
    qc.invalidateQueries({ queryKey: ["vaca", numero] });
    qc.invalidateQueries({ queryKey: ["animal-events", numero] });
  }
}

export function useCreateAnimal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AnimalFormOutput) => createAnimal(input),
    onSuccess: (a) => invalidateAll(qc, a.numero),
  });
}

export function useUpdateAnimal(numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AnimalFormOutput>) => updateAnimal(numero, input),
    onSuccess: () => invalidateAll(qc, numero),
  });
}

export function useMarcarEgresoAnimal(numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EgresoAnimalInput) => marcarEgresoAnimal(numero, input),
    onSuccess: () => invalidateAll(qc, numero),
  });
}

export function useReactivarAnimal(numero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => reactivarAnimal(numero),
    onSuccess: () => invalidateAll(qc, numero),
  });
}

export function useDeleteAnimal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (numero: string) => deleteAnimal(numero),
    onSuccess: () => invalidateAll(qc),
  });
}