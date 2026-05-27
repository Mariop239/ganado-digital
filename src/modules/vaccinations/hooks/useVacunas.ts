import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVacuna, createVacunasBulk, deleteVacuna, listVacunasGlobal, listVacunasPorAnimal,
  type AnimalTarget,
} from "../repositories/vacunas.repository";
import type { VacunaInput } from "../types/domain";

export function useVacunasGlobal() {
  return useQuery({ queryKey: ["vacunas", "global"], queryFn: listVacunasGlobal });
}

export function useVacunasPorAnimal(animalId: string) {
  return useQuery({
    queryKey: ["vacunas", "por-animal", animalId],
    queryFn: () => listVacunasPorAnimal(animalId),
    enabled: !!animalId,
  });
}

export function useCreateVacuna(animalId: string, vacaNumero: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VacunaInput) => createVacuna(animalId, vacaNumero, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacunas"] });
    },
  });
}

export function useCreateVacunasBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { animales: AnimalTarget[]; input: VacunaInput }) =>
      createVacunasBulk(vars.animales, vars.input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacunas"] }),
  });
}

export function useDeleteVacuna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVacuna(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vacunas"] }),
  });
}