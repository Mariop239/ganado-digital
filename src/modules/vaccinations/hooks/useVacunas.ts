import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVacuna, updateVacuna, createVacunasBulk, deleteVacuna, listVacunasGlobal, listVacunasPorAnimal,
  resolverAlerta, limpiarProximaDosis,
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

export function useCreateVacuna(animalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VacunaInput) => createVacuna(animalId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vacunas"] });
      await qc.invalidateQueries({ queryKey: ["animal-events"] });
      await qc.invalidateQueries({ queryKey: ["historial"] });
      await qc.invalidateQueries({ queryKey: ["animals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateVacuna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: VacunaInput }) =>
      updateVacuna(id, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vacunas"] });
      await qc.invalidateQueries({ queryKey: ["animal-events"] });
      await qc.invalidateQueries({ queryKey: ["historial"] });
      await qc.invalidateQueries({ queryKey: ["animals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateVacunasBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { animales: AnimalTarget[]; input: VacunaInput }) =>
      createVacunasBulk(vars.animales, vars.input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vacunas"] });
      await qc.invalidateQueries({ queryKey: ["animal-events"] });
      await qc.invalidateQueries({ queryKey: ["historial"] });
      await qc.invalidateQueries({ queryKey: ["animals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useResolverAlerta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fecha, fechaProximaDosis }: { id: string; fecha: string; fechaProximaDosis?: string | null }) =>
      resolverAlerta(id, fecha, fechaProximaDosis ?? null),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vacunas"] });
      await qc.invalidateQueries({ queryKey: ["animal-events"] });
      await qc.invalidateQueries({ queryKey: ["historial"] });
      await qc.invalidateQueries({ queryKey: ["animals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useLimpiarProximaDosis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => limpiarProximaDosis(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vacunas"] });
      await qc.invalidateQueries({ queryKey: ["animal-events"] });
      await qc.invalidateQueries({ queryKey: ["historial"] });
      await qc.invalidateQueries({ queryKey: ["animals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteVacuna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVacuna(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["vacunas"] });
      await qc.invalidateQueries({ queryKey: ["animal-events"] });
      await qc.invalidateQueries({ queryKey: ["historial"] });
      await qc.invalidateQueries({ queryKey: ["animals"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}